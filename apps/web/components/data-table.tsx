import Link from 'next/link'
import type { Route } from 'next'

export type Column<T> = {
  header: string
  cell: (row: T) => React.ReactNode
  className?: string
}

export function DataTable<T>({
  rows,
  columns,
  rowHref,
  rowKey,
  emptyMessage = 'No items yet.',
}: {
  rows: T[]
  columns: Column<T>[]
  rowHref?: (row: T) => Route
  rowKey?: (row: T) => string | number
  emptyMessage?: string
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded border border-dashed border-white/10 p-8 text-center text-sm opacity-60">
        {emptyMessage}
      </div>
    )
  }
  return (
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr className="border-b border-white/10 text-left">
          {columns.map((c) => (
            <th key={c.header} className={`px-3 py-2 font-medium opacity-70 ${c.className ?? ''}`}>
              {c.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => {
          const key = rowKey ? rowKey(row) : i
          return (
            <tr key={key} className="relative border-b border-white/5 hover:bg-white/5">
              {columns.map((c, j) => (
                <td key={c.header} className={`px-3 py-2 ${c.className ?? ''}`}>
                  {rowHref && j === 0 ? (
                    <Link href={rowHref(row)} className="absolute inset-0" aria-label="Open">
                      <span className="sr-only">Open</span>
                    </Link>
                  ) : null}
                  <span className="relative">{c.cell(row)}</span>
                </td>
              ))}
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
