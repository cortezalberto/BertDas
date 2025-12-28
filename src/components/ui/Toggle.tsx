import { type InputHTMLAttributes, forwardRef, useId } from 'react'

interface ToggleProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string
}

export const Toggle = forwardRef<HTMLInputElement, ToggleProps>(
  ({ label, className = '', id, ...props }, ref) => {
    const generatedId = useId()
    const toggleId = id || generatedId

    return (
      <label
        htmlFor={toggleId}
        className={`inline-flex items-center gap-3 cursor-pointer ${className}`}
      >
        <div className="relative">
          <input
            ref={ref}
            type="checkbox"
            id={toggleId}
            className="sr-only peer"
            {...props}
          />
          <div
            className={`
              w-11 h-6 rounded-full
              bg-zinc-700 peer-checked:bg-orange-500
              transition-colors duration-200
              peer-focus:ring-2 peer-focus:ring-orange-500 peer-focus:ring-offset-2 peer-focus:ring-offset-zinc-900
            `}
          />
          <div
            className={`
              absolute top-0.5 left-0.5
              w-5 h-5 rounded-full bg-white
              transition-transform duration-200
              peer-checked:translate-x-5
            `}
          />
        </div>
        {label && <span className="text-sm text-zinc-300">{label}</span>}
      </label>
    )
  }
)

Toggle.displayName = 'Toggle'
