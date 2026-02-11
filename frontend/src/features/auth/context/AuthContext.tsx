import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import api from '../../../shared/api/client'
import { AuthContext, userFromToken } from './auth-context'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(
    () => localStorage.getItem('accessToken'),
  )
  const user = useMemo(() => userFromToken(token), [token])

  const login = async (email: string, password: string) => {
    const res = await api.post<{ accessToken: string }>('/auth/login', {
      email,
      password,
    })
    const accessToken = res.data.accessToken
    localStorage.setItem('accessToken', accessToken)
    setToken(accessToken)
  }

  const logout = () => {
    localStorage.removeItem('accessToken')
    setToken(null)
  }

  return (
    <AuthContext.Provider value={{ token, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
