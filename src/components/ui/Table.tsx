import type { TableColumn } from '../../types'

interface TableProps<T> {
  data: T[]
  columns: TableColumn<T>[]
  onRowClick?: (item: T) => void
  emptyMessage?: string
  isLoading?: boolean
  ariaLabel?: string
}

export function Table<T extends { id: string }>({
  data,
  columns,
  onRowClick,
  emptyMessage = 'No hay datos disponibles',
  isLoading = false,
  ariaLabel,
}: TableProps<T>) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12" role="status" aria-label="Cargando datos">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" aria-hidden="true" />
        <span className="sr-only">Cargando...</span>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-zinc-500" role="status">
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full" aria-label={ariaLabel || 'Tabla de datos'}>
        <thead>
          <tr className="border-b border-zinc-800">
            {columns.map((column) => (
              <th
                key={String(column.key)}
                scope="col"
                className={`
                  px-4 py-3 text-left text-sm font-medium text-zinc-400
                  ${column.width || ''}
                `}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((item) => (
            <tr
              key={item.id}
              onClick={() => onRowClick?.(item)}
              onKeyDown={(e) => {
                if (onRowClick && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault()
                  onRowClick(item)
                }
              }}
              tabIndex={onRowClick ? 0 : undefined}
              role={onRowClick ? 'button' : undefined}
              aria-label={onRowClick ? `Ver detalles del elemento` : undefined}
              className={`
                border-b border-zinc-800/50
                transition-colors duration-150
                ${onRowClick ? 'cursor-pointer hover:bg-zinc-800/50 focus:bg-zinc-800/50 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-inset' : ''}
              `}
            >
              {columns.map((column) => (
                <td
                  key={`${item.id}-${String(column.key)}`}
                  className="px-4 py-3 text-sm text-zinc-300"
                >
                  {column.render
                    ? column.render(item)
                    : String(item[column.key as keyof T] ?? '-')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
