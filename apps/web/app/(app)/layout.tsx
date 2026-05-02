import { auth } from '@/lib/auth'
import { Sidebar } from '@/components/sidebar'
import { Topbar } from '@/components/topbar'
import { CommandPalette } from '@/components/command-palette'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <Topbar email={session?.user?.email} />
        <div className="flex-1 overflow-auto">{children}</div>
      </div>
      <CommandPalette />
    </div>
  )
}
