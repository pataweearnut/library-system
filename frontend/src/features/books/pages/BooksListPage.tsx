import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../../../shared/api/client'
import { useAuth } from '../../auth/context/useAuth'

type Book = {
  id: string
  title: string
  author: string
  isbn: string
  publicationYear: number
  availableQuantity: number
  coverImagePath?: string
}

type MostBorrowedItem = {
  bookId: string
  title: string
  borrowCount: string
}

function getCoverUrl(path: string | undefined): string | null {
  if (!path) return null
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'
  const origin = apiBase.replace(/\/api\/?$/, '')
  const cleaned = path.replace(/^\.?\//, '')
  return `${origin}/${cleaned}`
}

export function BooksListPage() {
  const [books, setBooks] = useState<Book[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const limit = 10
  const [error, setError] = useState<string | null>(null)
  const [mostBorrowed, setMostBorrowed] = useState<MostBorrowedItem[]>([])
  const { logout, user } = useAuth()

  const canSeeStats =
    user?.role === 'admin' || user?.role === 'librarian'

  useEffect(() => {
    setPage(1)
  }, [searchQuery])

  useEffect(() => {
    const fetchBooks = async () => {
      setLoading(true)
      try {
        const res = await api.get<{
          data: Book[]
          total: number
          page: number
          limit: number
          totalPages: number
        }>('/books', {
          params: {
            q: searchQuery.trim() || undefined,
            page,
            limit,
          },
        })
        setBooks(res.data.data)
        setTotal(res.data.total)
        setTotalPages(res.data.totalPages)
      } catch (err: unknown) {
        const msg =
          err && typeof err === 'object' && 'response' in err
            ? (err as { response?: { data?: { message?: string } } }).response
                ?.data?.message ?? 'Failed to load books'
            : 'Failed to load books'
        setError(msg)
        toast.error(msg)
      } finally {
        setLoading(false)
      }
    }
    fetchBooks()
  }, [searchQuery, page])

  useEffect(() => {
    if (!canSeeStats) return
    const fetchMostBorrowed = async () => {
      try {
        const res = await api.get<MostBorrowedItem[]>(
          '/borrowings/most-borrowed',
          { params: { limit: 10 } },
        )
        setMostBorrowed(res.data)
      } catch {
        // Non-blocking; leave mostBorrowed empty
      }
    }
    fetchMostBorrowed()
  }, [canSeeStats])

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="max-w-6xl mx-auto px-6 py-6">
        <header className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Library catalogue
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Browse, search, and manage the books in your collection.
            </p>
          </div>
          <div className="flex items-center gap-3 text-sm">
            {user?.role === 'admin' && (
              <Link
                to="/users"
                className="rounded-lg border border-slate-300 bg-white text-sm font-medium px-3 py-1.5 hover:bg-slate-50"
              >
                Manage users
              </Link>
            )}
            {user &&
              (user.role === 'admin' || user.role === 'librarian') && (
                <Link
                  to="/books/new"
                  className="rounded-lg bg-blue-600 text-white text-sm font-medium px-3 py-1.5 hover:bg-blue-700"
                >
                  Add book
                </Link>
              )}
            {user && (
              <div className="text-right text-xs text-slate-500">
                <div className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[0.7rem] uppercase tracking-wide text-blue-700">
                  {user.role}
                </div>
                <div className="mt-1">{user.email}</div>
              </div>
            )}
            <button
              onClick={logout}
              className="rounded-full border border-slate-300 px-3 py-1 text-xs hover:bg-slate-200 bg-white"
            >
              Logout
            </button>
          </div>
        </header>

        <main>
          {canSeeStats && mostBorrowed.length > 0 && (
            <section className="bg-white rounded-xl border border-slate-200 p-4 mb-5 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-700 mb-3">
                Most borrowed
              </h2>
              <ul className="flex flex-wrap gap-2">
                {mostBorrowed.map((item) => (
                  <li key={item.bookId}>
                    <Link
                      to={`/books/${item.bookId}`}
                      className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 hover:bg-slate-100"
                    >
                      <span className="font-medium truncate max-w-[200px]">
                        {item.title}
                      </span>
                      <span className="text-slate-500 text-xs shrink-0">
                        {item.borrowCount} borrows
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="bg-white rounded-xl border border-slate-200 p-4 mb-5 shadow-sm">
            <div className="max-w-md">
              <label className="block text-[0.7rem] font-medium mb-1 text-slate-600">
                Search
              </label>
              <input
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by title or author"
              />
            </div>
          </section>

          {loading ? (
            <p className="text-sm text-slate-600">Loading books…</p>
          ) : error ? (
            <p className="text-red-600 text-sm">{error}</p>
          ) : books.length === 0 ? (
            <p className="text-sm text-slate-600">No books found.</p>
          ) : (
            <>
              <p className="text-sm text-slate-500 mb-3">
                Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total} books
              </p>
              <ul className="grid gap-4 md:grid-cols-2">
                {books.map((book) => {
                  const coverUrl = getCoverUrl(book.coverImagePath)
                  return (
                    <li
                      key={book.id}
                      className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col shadow-sm"
                    >
                      <div className="flex gap-4">
                        {coverUrl && (
                          <div className="w-20 h-28 flex-shrink-0 overflow-hidden rounded-md border border-slate-200 bg-slate-50">
                            <img
                              src={coverUrl}
                              alt={book.title}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h2 className="font-semibold text-lg">
                              {book.title}
                            </h2>
                            <span
                              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[0.65rem] font-medium uppercase tracking-wide ${
                                book.availableQuantity > 0
                                  ? 'border-green-200 bg-green-50 text-green-700'
                                  : 'border-slate-200 bg-slate-100 text-slate-600'
                              }`}
                            >
                              {book.availableQuantity > 0
                                ? 'Available'
                                : 'Not available'}
                            </span>
                          </div>
                          <p className="text-sm text-slate-700 mb-1">
                            by {book.author}
                          </p>
                          <p className="text-xs text-slate-500">
                            ISBN: {book.isbn} • {book.publicationYear}
                          </p>
                          <p className="text-xs text-slate-600 mt-1">
                            Available: {book.availableQuantity}
                          </p>
                        </div>
                      </div>
                      <div className="mt-3">
                        <Link
                          to={`/books/${book.id}`}
                          className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
                        >
                          View details
                        </Link>
                      </div>
                    </li>
                  )
                })}
              </ul>
              {totalPages > 1 && (
                <nav className="mt-6 flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-slate-600">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
                  >
                    Next
                  </button>
                </nav>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  )
}

