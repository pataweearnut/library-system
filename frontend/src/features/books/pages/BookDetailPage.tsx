import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../../../shared/api/client'
import { useAuth } from '../../auth/context/AuthContext'

type Book = {
  id: string
  title: string
  author: string
  isbn: string
  publicationYear: number
  totalQuantity: number
  availableQuantity: number
  coverImagePath?: string
}

type Borrowing = {
  id: string
  borrowedAt: string
  returnedAt?: string
  user: { email: string }
}

/** One of the current user's active (not returned) borrowings for this book */
type MyActiveBorrowing = { id: string; borrowedAt: string }

function getCoverUrl(path: string | undefined): string | null {
  if (!path) return null
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'
  const origin = apiBase.replace(/\/api\/?$/, '')
  const cleaned = path.replace(/^\.?\//, '')
  return `${origin}/${cleaned}`
}

function getErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const res = (err as { response?: { data?: { message?: string } } }).response
    return res?.data?.message ?? fallback
  }
  return fallback
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString()
}

export function BookDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [book, setBook] = useState<Book | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [history, setHistory] = useState<Borrowing[]>([])
  const [historyError, setHistoryError] = useState<string | null>(null)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyPage, setHistoryPage] = useState(1)
  const [historyTotalPages, setHistoryTotalPages] = useState(1)
  const [historyTotal, setHistoryTotal] = useState(0)
  const historyLimit = 10
  const [myActiveBorrowings, setMyActiveBorrowings] = useState<
    MyActiveBorrowing[]
  >([])
  const [actionLoading, setActionLoading] = useState(false)

  const canSeeHistory = user?.role === 'admin' || user?.role === 'librarian'

  const refreshBook = useCallback(async () => {
    if (!id) return
    const res = await api.get<Book>(`/books/${id}`)
    setBook(res.data)
  }, [id])

  const refreshMyActiveBorrowings = useCallback(async () => {
    if (!id) return
    try {
      const res = await api.get<MyActiveBorrowing[]>(
        `/borrowings/book/${id}/active`,
      )
      setMyActiveBorrowings(res.data)
    } catch {
      setMyActiveBorrowings([])
    }
  }, [id])

  const refreshHistory = useCallback(async (page = historyPage) => {
    if (!id || !canSeeHistory) return
    setHistoryError(null)
    try {
      const res = await api.get<{
        data: Borrowing[]
        total: number
        page: number
        limit: number
        totalPages: number
      }>(`/borrowings/book/${id}/history`, {
        params: { page, limit: historyLimit },
      })
      setHistory(res.data.data)
      setHistoryTotal(res.data.total)
      setHistoryTotalPages(res.data.totalPages)
      setHistoryPage(res.data.page)
    } catch (err) {
      setHistoryError(getErrorMessage(err, 'Failed to load history'))
    }
  }, [id, canSeeHistory, historyPage])

  useEffect(() => {
    if (!id) return
    let cancelled = false
    const run = async () => {
      try {
        const res = await api.get<Book>(`/books/${id}`)
        if (!cancelled) setBook(res.data)
      } catch (err) {
        if (!cancelled) {
          const msg = getErrorMessage(err, 'Failed to load book')
          setError(msg)
          toast.error(msg)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [id])

  useEffect(() => {
    if (!id) return
    refreshMyActiveBorrowings()
  }, [id, refreshMyActiveBorrowings])

  useEffect(() => {
    if (id && canSeeHistory) setHistoryPage(1)
  }, [id, canSeeHistory])

  useEffect(() => {
    if (!id || !canSeeHistory) return
    let cancelled = false
    setHistoryLoading(true)
    setHistoryError(null)
    api
      .get<{
        data: Borrowing[]
        total: number
        page: number
        limit: number
        totalPages: number
      }>(`/borrowings/book/${id}/history`, {
        params: { page: historyPage, limit: historyLimit },
      })
      .then((res) => {
        if (!cancelled) {
          setHistory(res.data.data)
          setHistoryTotal(res.data.total)
          setHistoryTotalPages(res.data.totalPages)
        }
      })
      .catch((err) => {
        if (!cancelled) setHistoryError(getErrorMessage(err, 'Failed to load history'))
      })
      .finally(() => {
        if (!cancelled) setHistoryLoading(false)
      })
    return () => { cancelled = true }
  }, [id, canSeeHistory, historyPage])

  const handleBorrow = async () => {
    if (!id) return
    setActionLoading(true)
    try {
      const res = await api.post<{ id: string; borrowedAt: string }>(
        '/borrowings/borrow',
        { bookId: id },
      )
      setMyActiveBorrowings((prev) => [
        ...prev,
        { id: res.data.id, borrowedAt: res.data.borrowedAt },
      ])
      toast.success('Book borrowed successfully.')
      await refreshBook()
      await refreshHistory()
    } catch (err) {
      toast.error(getErrorMessage(err, 'Borrow failed'))
    } finally {
      setActionLoading(false)
    }
  }

  const handleReturn = async () => {
    const toReturn = myActiveBorrowings[0]
    if (!toReturn) {
      toast.error('No borrowing to return.')
      return
    }
    setActionLoading(true)
    try {
      await api.post('/borrowings/return', { borrowingId: toReturn.id })
      setMyActiveBorrowings((prev) => prev.filter((b) => b.id !== toReturn.id))
      toast.success('Book returned successfully.')
      await refreshBook()
      await refreshHistory()
    } catch (err) {
      toast.error(getErrorMessage(err, 'Return failed'))
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <p className="text-sm text-slate-600">Loading book…</p>
      </div>
    )
  }

  if (error || !book) {
    return (
      <div className="min-h-screen bg-slate-100 p-6">
        <p className="text-red-600">{error}</p>
        <button
          onClick={() => navigate('/')}
          className="mt-3 text-sm text-blue-600 hover:text-blue-800"
        >
          ← Back to list
        </button>
      </div>
    )
  }

  const canBorrow = book.availableQuantity > 0 && !actionLoading
  const canReturn = myActiveBorrowings.length > 0 && !actionLoading
  const coverUrl = getCoverUrl(book.coverImagePath)
  const borrowedCount = myActiveBorrowings.length

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="max-w-4xl mx-auto px-6 py-6">
        <button
          onClick={() => navigate('/')}
          className="mb-3 text-xs text-blue-600 hover:text-blue-800"
        >
          ← Back to list
        </button>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex flex-wrap gap-5">
            <div className="min-w-[220px] flex-1">
              <h1 className="text-2xl font-semibold mb-1">{book.title}</h1>
              <p className="text-sm text-slate-700 mb-1">by {book.author}</p>
              <p className="text-xs text-slate-500 mb-2">
                ISBN: {book.isbn} • {book.publicationYear}
              </p>
              <p className="text-sm text-slate-700 mb-2">
                Total: {book.totalQuantity} • Available: {book.availableQuantity}
              </p>
              {coverUrl && (
                <div className="mt-3 w-40 h-56 overflow-hidden rounded-md border border-slate-200 bg-slate-50">
                  <img
                    src={coverUrl}
                    alt={book.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-[220px] text-right">
              <div
                className={`inline-flex items-center rounded-full border px-3 py-1 text-[0.7rem] mb-2 ${
                  book.availableQuantity > 0
                    ? 'border-green-200 bg-green-50 text-green-700'
                    : 'border-slate-200 bg-slate-100 text-slate-600'
                }`}
              >
                {book.availableQuantity > 0
                  ? 'Available'
                  : 'No copies available'}
              </div>
              {borrowedCount > 0 && (
                <p className="text-xs text-slate-600 mb-2">
                  You have {borrowedCount} cop{borrowedCount !== 1 ? 'ies' : 'y'}{' '}
                  borrowed
                </p>
              )}
              <div className="mt-2 flex flex-wrap justify-end gap-2">
                {user &&
                  (user.role === 'admin' || user.role === 'librarian') && (
                    <Link
                      to={`/books/${id}/edit`}
                      className="rounded-full border border-slate-300 text-xs px-3 py-1.5 bg-white hover:bg-slate-100"
                    >
                      Edit book
                    </Link>
                  )}
                <button
                  onClick={handleBorrow}
                  disabled={!canBorrow}
                  className="rounded-full bg-blue-600 text-white text-xs px-3 py-1.5 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {actionLoading ? '…' : 'Borrow'}
                </button>
                <button
                  onClick={handleReturn}
                  disabled={!canReturn}
                  className="rounded-full border border-slate-300 text-xs px-3 py-1.5 bg-white hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Return
                </button>
              </div>
            </div>
          </div>

        </div>

        {canSeeHistory && (
          <div className="mt-5 bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <h2 className="font-semibold mb-2 text-sm">
              Borrowing history
            </h2>
            {historyLoading ? (
              <p className="text-xs text-slate-500">Loading history…</p>
            ) : historyError ? (
              <p className="text-xs text-red-600">{historyError}</p>
            ) : history.length === 0 ? (
              <p className="text-xs text-slate-500">No borrowing history.</p>
            ) : (
              <>
                <p className="text-xs text-slate-500 mb-2">
                  Showing {(historyPage - 1) * historyLimit + 1}–
                  {Math.min(historyPage * historyLimit, historyTotal)} of {historyTotal}
                </p>
                <ul className="text-xs space-y-1">
                  {history.map((h) => (
                    <li key={h.id}>
                      {formatDate(h.borrowedAt)} – {h.user.email}{' '}
                      {h.returnedAt
                        ? `(returned ${formatDate(h.returnedAt)})`
                        : '(not returned yet)'}
                    </li>
                  ))}
                </ul>
                {historyTotalPages > 1 && (
                  <nav className="mt-3 flex items-center gap-2 justify-center">
                    <button
                      type="button"
                      onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                      disabled={historyPage <= 1}
                      className="rounded border border-slate-300 bg-white px-2 py-1 text-xs disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
                    >
                      Previous
                    </button>
                    <span className="text-xs text-slate-600">
                      Page {historyPage} of {historyTotalPages}
                    </span>
                    <button
                      type="button"
                      onClick={() => setHistoryPage((p) => Math.min(historyTotalPages, p + 1))}
                      disabled={historyPage >= historyTotalPages}
                      className="rounded border border-slate-300 bg-white px-2 py-1 text-xs disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
                    >
                      Next
                    </button>
                  </nav>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
