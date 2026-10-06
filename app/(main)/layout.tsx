import React from 'react'
import Sidebar from '@/components/sidebar'
import AuthGate from '@/components/global/auth-gate'

type Props = { children: React.ReactNode }

const Layout = ({ children }: Props) => {
  return (
    <AuthGate>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <div className="min-w-0 w-full">
          {children}
        </div>
      </div>
    </AuthGate>
  )
}

export default Layout
