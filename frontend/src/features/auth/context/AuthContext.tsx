import { createContext, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import api from '../../../shared/api/client'

type UserInfo = {
  email: string
  role: 'admin' | 'librarian' | 'member'
} | null

function userFromToken(token: string | null): UserInfo {
  if (!token) return null
  try {
    const [, payloadBase64] = token.split('.')
    const payloadJson = atob(payloadBase64)
    const payload = JSON.parse(payloadJson)
    return { email: payload.email, role: payload.role }
  } catch {
    return null
  }
}

type AuthContextValue = {
  token: string | null
  user: UserInfo
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

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

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return ctx
}

