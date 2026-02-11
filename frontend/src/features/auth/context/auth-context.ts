import { createContext } from 'react'

export type UserInfo = {
  email: string
  role: 'admin' | 'librarian' | 'member'
} | null

export function userFromToken(token: string | null): UserInfo {
  if (!token) return null
  try {
    const [, payloadBase64] = token.split('.')
    const payloadJson = atob(payloadBase64)
    const payload = JSON.parse(payloadJson) as { email: string; role: string }
    return {
      email: payload.email,
      role: payload.role as 'admin' | 'librarian' | 'member',
    }
  } catch {
    return null
  }
}

export type AuthContextValue = {
  token: string | null
  user: UserInfo
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

export const AuthContext = createContext<AuthContextValue | undefined>(
  undefined,
)

