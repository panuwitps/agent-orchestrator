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
  emptyMessage = 'No items yet.',
}: {
  rows: T[]
  columns: Column<T>[]
  rowHref?: (row: T) => Route
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
          const inner = columns.map((c, j) => (
            <td key={j} className={`px-3 py-2 ${c.className ?? ''}`}>
              {c.cell(row)}
            </td>
          ))
          return (
            <tr key={i} className="border-b border-white/5 hover:bg-white/5">
              {rowHref ? (
                <td colSpan={columns.length} className="p-0">
                  <Link href={rowHref(row)} className="block">
                    <div className="flex">{inner}</div>
                  </Link>
                </td>
              ) : (
                inner
              )}
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
