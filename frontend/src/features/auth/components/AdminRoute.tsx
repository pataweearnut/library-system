import { Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from '../context/useAuth'

export function AdminRoute({ children }: { children: ReactNode }) {
  const { token, user } = useAuth()
  if (!token) {
    return <Navigate to="/login" replace />
  }
  if (user?.role !== 'admin') {
    return <Navigate to="/" replace />
  }
  return <>{children}</>
}
