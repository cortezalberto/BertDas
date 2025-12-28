import { useMemo, useCallback } from 'react'
import { X } from 'lucide-react'
import { useAllergenStore, selectAllergens } from '../../stores/allergenStore'
import type { Allergen } from '../../types'

interface AllergenSelectProps {
  label?: string
  value: string[]
  onChange: (allergenIds: string[]) => void
  error?: string
}

export function AllergenSelect({
  label,
  value,
  onChange,
  error,
}: AllergenSelectProps) {
  const allergens = useAllergenStore(selectAllergens)

  const activeAllergens = useMemo(
    () => allergens.filter((a) => a.is_active !== false),
    [allergens]
  )

  const selectedAllergens = useMemo(
    () => activeAllergens.filter((a) => value.includes(a.id)),
    [activeAllergens, value]
  )

  const availableAllergens = useMemo(
    () => activeAllergens.filter((a) => !value.includes(a.id)),
    [activeAllergens, value]
  )

  const handleAdd = useCallback(
    (allergenId: string) => {
      if (!value.includes(allergenId)) {
        onChange([...value, allergenId])
      }
    },
    [value, onChange]
  )

  const handleRemove = useCallback(
    (allergenId: string) => {
      onChange(value.filter((id) => id !== allergenId))
    },
    [value, onChange]
  )

  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-zinc-300">
          {label}
        </label>
      )}

      {/* Selected allergens */}
      {selectedAllergens.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {selectedAllergens.map((allergen) => (
            <AllergenTag
              key={allergen.id}
              allergen={allergen}
              onRemove={() => handleRemove(allergen.id)}
            />
          ))}
        </div>
      )}

      {/* Dropdown to add allergens */}
      <select
        className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
        value=""
        onChange={(e) => {
          if (e.target.value) {
            handleAdd(e.target.value)
          }
        }}
        aria-label={label || 'Seleccionar alergeno'}
      >
        <option value="">
          {availableAllergens.length > 0
            ? 'Agregar alergeno...'
            : 'No hay mas alergenos disponibles'}
        </option>
        {availableAllergens.map((allergen) => (
          <option key={allergen.id} value={allergen.id}>
            {allergen.icon} {allergen.name}
          </option>
        ))}
      </select>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {selectedAllergens.length === 0 && (
        <p className="text-sm text-zinc-500">
          No hay alergenos seleccionados
        </p>
      )}
    </div>
  )
}

interface AllergenTagProps {
  allergen: Allergen
  onRemove: () => void
}

function AllergenTag({ allergen, onRemove }: AllergenTagProps) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-orange-500/10 text-orange-500 rounded-full text-sm">
      <span aria-hidden="true">{allergen.icon}</span>
      <span>{allergen.name}</span>
      <button
        type="button"
        onClick={onRemove}
        className="ml-1 p-0.5 hover:bg-orange-500/20 rounded-full transition-colors"
        aria-label={`Quitar ${allergen.name}`}
      >
        <X className="w-3 h-3" aria-hidden="true" />
      </button>
    </span>
  )
}
