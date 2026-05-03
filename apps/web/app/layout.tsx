import './globals.css'

export const metadata = { title: 'Agent Orchestrator' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body suppressHydrationWarning className="min-h-screen bg-[#0b0b0d] text-[#e6e6e7] antialiased">
        {children}
      </body>
    </html>
  )
}
