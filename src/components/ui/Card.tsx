import { memo } from 'react'

interface CardProps {
  children: React.ReactNode
  className?: string
  padding?: 'none' | 'sm' | 'md' | 'lg'
  onClick?: () => void
}

const paddingStyles = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
}

/**
 * SPRINT 8: Memoized Card component to prevent unnecessary re-renders
 */
export const Card = memo(function Card({ children, className = '', padding = 'md', onClick }: CardProps) {
  return (
    <div
      className={`
        bg-[#27272a] border border-[#3f3f46] rounded-xl
        shadow-[0_4px_6px_-1px_rgba(0,0,0,0.2)]
        hover:shadow-[0_10px_15px_-3px_rgba(0,0,0,0.3)]
        transition-shadow duration-200
        ${paddingStyles[padding]}
        ${className}
      `}
      onClick={onClick}
    >
      {children}
    </div>
  )
})

interface CardHeaderProps {
  title: string
  description?: string
  action?: React.ReactNode
}

/**
 * SPRINT 8: Memoized CardHeader component
 */
export const CardHeader = memo(function CardHeader({ title, description, action }: CardHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-4 pb-4 border-b border-[#3f3f46]">
      <div>
        <h3
          className="text-xl font-semibold text-[#fafafa]"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          {title}
        </h3>
        {description && (
          <p className="mt-1 text-sm text-[#71717a]">{description}</p>
        )}
      </div>
      {action}
    </div>
  )
})
