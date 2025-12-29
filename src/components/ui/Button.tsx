import { type ButtonHTMLAttributes } from 'react'
import { useFormStatus } from 'react-dom'

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  isLoading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  ref?: React.Ref<HTMLButtonElement>
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-gradient-to-br from-[#f97316] to-[#ea580c] hover:from-[#fb923c] hover:to-[#f97316] text-white shadow-[0_2px_4px_rgba(249,115,22,0.2)] hover:shadow-[0_4px_8px_rgba(249,115,22,0.3)] hover:-translate-y-0.5',
  secondary:
    'bg-gradient-to-br from-zinc-700 to-zinc-800 hover:from-zinc-600 hover:to-zinc-700 text-white shadow-sm hover:shadow-md',
  danger:
    'bg-gradient-to-br from-[#ef4444] to-[#dc2626] hover:from-[#f87171] hover:to-[#ef4444] text-white shadow-[0_2px_4px_rgba(239,68,68,0.2)] hover:shadow-[0_4px_8px_rgba(239,68,68,0.3)]',
  ghost:
    'bg-transparent hover:bg-[#3f3f46] text-zinc-300 hover:text-white',
  outline:
    'bg-transparent border border-zinc-600 hover:border-zinc-500 text-zinc-300 hover:bg-[#3f3f46] hover:text-white',
}

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
}

// REACT 19 IMPROVEMENT: Modernized component without forwardRef, added useFormStatus
export function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  className = '',
  disabled,
  children,
  type,
  ref,
  ...props
}: ButtonProps) {
  // REACT 19: Auto-detect form pending state when type="submit"
  const formStatus = type === 'submit' ? useFormStatus() : { pending: false }

  // Combine manual isLoading with form pending state
  const isPending = isLoading || formStatus.pending

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || isPending}
      aria-busy={isPending || undefined}
      aria-disabled={disabled || isPending || undefined}
      className={`
        inline-flex items-center justify-center gap-2
        font-semibold rounded-lg
        transition-all duration-200
        focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:ring-offset-[#18181b]
        disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:transform-none
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${className}
      `}
      style={{ fontFamily: 'var(--font-heading)' }}
      {...props}
    >
      {isPending ? (
        <>
          <span className="sr-only">Cargando</span>
          <svg
            className="animate-spin h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        </>
      ) : (
        leftIcon
      )}
      {children}
      {!isPending && rightIcon}
    </button>
  )
}

Button.displayName = 'Button'
