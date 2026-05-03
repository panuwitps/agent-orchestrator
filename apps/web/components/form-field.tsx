export function FormField({
  label,
  name,
  required,
  type = 'text',
  defaultValue,
  placeholder,
  hint,
}: {
  label: string
  name: string
  required?: boolean
  type?: 'text' | 'email' | 'url' | 'number'
  defaultValue?: string | number
  placeholder?: string
  hint?: string
}) {
  return (
    <label className="block">
      <span className="block text-sm opacity-70">{label}{required && <span className="text-red-400"> *</span>}</span>
      <input
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="mt-1 w-full rounded border border-white/10 bg-white/5 px-3 py-2"
      />
      {hint && <span className="mt-1 block text-xs opacity-50">{hint}</span>}
    </label>
  )
}

export function TextArea({
  label,
  name,
  required,
  defaultValue,
  placeholder,
  rows = 4,
  hint,
}: {
  label: string
  name: string
  required?: boolean
  defaultValue?: string
  placeholder?: string
  rows?: number
  hint?: string
}) {
  return (
    <label className="block">
      <span className="block text-sm opacity-70">{label}{required && <span className="text-red-400"> *</span>}</span>
      <textarea
        name={name}
        required={required}
        defaultValue={defaultValue}
        placeholder={placeholder}
        rows={rows}
        className="mt-1 w-full rounded border border-white/10 bg-white/5 px-3 py-2 font-mono text-sm"
      />
      {hint && <span className="mt-1 block text-xs opacity-50">{hint}</span>}
    </label>
  )
}
