import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../../../shared/api/client'

type User = {
  id: string
  email: string
  role: 'admin' | 'librarian' | 'member'
  createdAt: string
  updatedAt: string
}

export function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await api.get<User[]>('/users')
        setUsers(res.data)
      } catch (err: unknown) {
        const msg =
          err && typeof err === 'object' && 'response' in err
            ? (err as { response?: { data?: { message?: string } } }).response
                ?.data?.message ?? 'Failed to load users'
            : 'Failed to load users'
        setError(msg)
        toast.error(msg)
      } finally {
        setLoading(false)
      }
    }
    fetchUsers()
  }, [])

  const handleRoleChange = async (userId: string, role: User['role']) => {
    setUpdatingId(userId)
    try {
      const res = await api.patch<User>(`/users/${userId}`, { role })
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? res.data : u)),
      )
      toast.success('Role updated.')
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response
              ?.data?.message ?? 'Failed to update role'
          : 'Failed to update role'
      toast.error(msg)
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="max-w-4xl mx-auto px-6 py-6">
        <Link
          to="/"
          className="mb-4 inline-block text-sm text-blue-600 hover:text-blue-800"
        >
          ← Back to catalogue
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight mb-2">
          Manage users
        </h1>
        <p className="text-sm text-slate-500 mb-6">
          Assign roles: admin, librarian, or member.
        </p>

        {loading ? (
          <p className="text-sm text-slate-600">Loading users…</p>
        ) : error ? (
          <p className="text-red-600 text-sm">{error}</p>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left py-3 px-4 font-medium text-slate-700">
                    Email
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-slate-700">
                    Role
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-slate-700">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-slate-100 last:border-0">
                    <td className="py-3 px-4">{u.email}</td>
                    <td className="py-3 px-4">
                      <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs uppercase text-slate-700">
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <select
                        value={u.role}
                        disabled={updatingId === u.id}
                        onChange={(e) =>
                          handleRoleChange(u.id, e.target.value as User['role'])
                        }
                        className="rounded-md border border-slate-300 text-sm py-1.5 pr-8 disabled:opacity-50"
                      >
                        <option value="admin">admin</option>
                        <option value="librarian">librarian</option>
                        <option value="member">member</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
