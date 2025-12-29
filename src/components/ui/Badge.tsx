import { memo } from 'react'

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'new'

interface BadgeProps {
  children: React.ReactNode
  variant?: BadgeVariant
  className?: string
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-[#3f3f46] text-[#e4e4e7] border border-[#52525b]',
  success: 'bg-[#065f46] text-[#6ee7b7] border border-[#10b981]',
  warning: 'bg-[#78350f] text-[#fcd34d] border border-[#f59e0b]',
  danger: 'bg-[#7f1d1d] text-[#fca5a5] border border-[#ef4444]',
  info: 'bg-[#1e3a8a] text-[#93c5fd] border border-[#3b82f6]',
  new: 'bg-[#4c1d95] text-[#c4b5fd] border border-[#8b5cf6]',
}

/**
 * SPRINT 9: Memoized Badge component
 * Used extensively in tables and product listings
 */
export const Badge = memo(function Badge({
  children,
  variant = 'default',
  className = '',
}: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center px-3 py-1
        text-xs font-semibold rounded-full
        uppercase tracking-wide
        transition-colors duration-150
        ${variantStyles[variant]}
        ${className}
      `}
      style={{ fontFamily: 'var(--font-body)' }}
    >
      {children}
    </span>
  )
})
