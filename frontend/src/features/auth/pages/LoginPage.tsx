import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '../context/useAuth'

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await login(email, password)
      toast.success('Signed in successfully.')
      navigate('/')
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response
              ?.data?.message ?? 'Login failed'
          : 'Login failed'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white shadow-lg rounded-xl px-8 py-9 border border-slate-200">
          <h1 className="text-2xl font-semibold tracking-tight mb-2 text-slate-900 text-center">
            Library Console
          </h1>
          <p className="text-sm text-slate-500 mb-8 text-center">
            Sign in with your library account to manage and browse books.
          </p>
          <form onSubmit={handleSubmit} className="space-y-5 text-sm">
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-700">
                Email
              </label>
              <input
                type="email"
                className="w-full rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-none focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="admin@example.com"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-700">
                Password
              </label>
              <input
                type="password"
                className="w-full rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-none focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
              />
            </div>
            <div className="mt-1 flex justify-center">
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center justify-center rounded-full bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 focus:ring-offset-white disabled:opacity-60"
              >
                {loading ? 'Signing in…' : 'Sign in'}
              </button>
            </div>
            <div className="mt-3 flex items-center justify-between text-[0.7rem] text-slate-400">
              <span>Forgot password?</span>
              <label className="inline-flex items-center gap-1">
                <input type="checkbox" className="h-3 w-3 rounded border-slate-300" />
                <span>Remember me</span>
              </label>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

