import { type SelectHTMLAttributes, forwardRef, useId } from 'react'

interface SelectOption {
  value: string
  label: string
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  options: SelectOption[]
  placeholder?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    { label, error, options, placeholder, className = '', id, ...props },
    ref
  ) => {
    const generatedId = useId()
    const selectId = id || generatedId
    const errorId = `${selectId}-error`

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={selectId}
            className="block text-sm font-medium text-zinc-300 mb-1.5"
          >
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error ? errorId : undefined}
          className={`
            w-full px-3 py-2
            bg-zinc-800 border rounded-lg
            text-white
            transition-colors duration-200
            focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent
            disabled:opacity-50 disabled:cursor-not-allowed
            ${error ? 'border-red-500' : 'border-zinc-700 hover:border-zinc-600'}
            ${className}
          `}
          {...props}
        >
          {placeholder && (
            <option value="" className="text-zinc-500">
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {error && (
          <p id={errorId} className="mt-1 text-sm text-red-500" role="alert">
            {error}
          </p>
        )}
      </div>
    )
  }
)

Select.displayName = 'Select'
