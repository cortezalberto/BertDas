import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { ToastContainer } from '../ui'

export function Layout() {
  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Skip link for accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-orange-500 focus:text-white focus:rounded-lg focus:outline-none"
      >
        Saltar al contenido principal
      </a>
      <Sidebar />
      <main id="main-content" className="ml-64 min-h-screen" role="main">
        <Outlet />
      </main>
      <ToastContainer />
    </div>
  )
}
