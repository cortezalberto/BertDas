import { useEffect, useId, useRef } from 'react'
import { X } from 'lucide-react'
import { Button } from './Button'
import { useFocusTrap } from '../../hooks'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  footer?: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

const sizeStyles = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'md',
}: ModalProps) {
  const titleId = useId()
  const contentId = useId()
  const containerRef = useFocusTrap<HTMLDivElement>(isOpen)

  // Use ref to avoid re-registering listeners when onClose changes
  const onCloseRef = useRef(onClose)

  // Update ref in effect to avoid setting during render
  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  // Track modal count for nested modals - only restore overflow when last modal closes
  useEffect(() => {
    if (!isOpen) return

    // Use AbortController for clean listener removal
    const abortController = new AbortController()

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current()
    }

    // Track number of open modals to handle nested modals correctly
    // Store the overflow value at mount time for this specific modal instance
    const previousOverflow = document.body.style.overflow
    const modalCount = parseInt(document.body.dataset.modalCount || '0', 10)
    const newCount = modalCount + 1
    document.body.dataset.modalCount = String(newCount)

    document.addEventListener('keydown', handleEscape, { signal: abortController.signal })
    document.body.style.overflow = 'hidden'

    return () => {
      // Abort all listeners registered with this controller
      abortController.abort()

      // Decrement modal count safely
      const currentCount = parseInt(document.body.dataset.modalCount || '1', 10)
      const updatedCount = Math.max(0, currentCount - 1)

      if (updatedCount === 0) {
        // Last modal closing - restore original overflow and clean up
        document.body.style.overflow = previousOverflow || ''
        delete document.body.dataset.modalCount
      } else {
        document.body.dataset.modalCount = String(updatedCount)
      }
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={contentId}
        className={`
          w-full ${sizeStyles[size]}
          bg-zinc-900 border border-zinc-800 rounded-xl
          shadow-xl
          animate-in fade-in zoom-in-95 duration-200
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <h2 id={titleId} className="text-lg font-semibold text-white">
            {title}
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="p-1 -mr-2"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </Button>
        </div>

        {/* Content */}
        <div
          id={contentId}
          className="px-6 py-4 max-h-[calc(100vh-200px)] overflow-y-auto"
        >
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-zinc-800">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
