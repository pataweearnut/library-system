import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../../../shared/api/client'

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

function getErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const res = (err as { response?: { data?: { message?: string } } }).response
    return res?.data?.message ?? fallback
  }
  return fallback
}

export function BookEditPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [book, setBook] = useState<Book | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')
  const [isbn, setIsbn] = useState('')
  const [publicationYear, setPublicationYear] = useState('')
  const [totalQuantity, setTotalQuantity] = useState('')
  const [coverFile, setCoverFile] = useState<File | null>(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    const run = async () => {
      try {
        const res = await api.get<Book>(`/books/${id}`)
        if (!cancelled) {
          setBook(res.data)
          setTitle(res.data.title)
          setAuthor(res.data.author)
          setIsbn(res.data.isbn)
          setPublicationYear(String(res.data.publicationYear))
          setTotalQuantity(String(res.data.totalQuantity))
        }
      } catch (err) {
        if (!cancelled) {
          setError(getErrorMessage(err, 'Failed to load book'))
          toast.error(getErrorMessage(err, 'Failed to load book'))
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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!id) return
    const year = parseInt(publicationYear, 10)
    const total = parseInt(totalQuantity, 10)
    if (Number.isNaN(year) || Number.isNaN(total) || total < 0) {
      toast.error('Publication year and total quantity must be valid numbers.')
      return
    }
    setSaving(true)
    try {
      const payload = {
        title: title.trim(),
        author: author.trim(),
        isbn: isbn.trim(),
        publicationYear: year,
        totalQuantity: total,
      }
      if (coverFile) {
        const formData = new FormData()
        formData.append('title', payload.title)
        formData.append('author', payload.author)
        formData.append('isbn', payload.isbn)
        formData.append('publicationYear', String(payload.publicationYear))
        formData.append('totalQuantity', String(payload.totalQuantity))
        formData.append('cover', coverFile)
        await api.patch(`/books/${id}`, formData)
      } else {
        await api.patch(`/books/${id}`, payload)
      }
      toast.success('Book updated successfully.')
      navigate(`/books/${id}`)
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to update book'))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <p className="text-sm text-slate-600">Loading…</p>
      </div>
    )
  }

  if (error && !book) {
    return (
      <div className="min-h-screen bg-slate-100 p-6">
        <p className="text-red-600">{error}</p>
        <button
          onClick={() => navigate('/')}
          className="mt-3 text-sm text-blue-600 hover:text-blue-800"
        >
          ← Back
        </button>
      </div>
    )
  }

  if (!book) return null

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="max-w-xl mx-auto px-6 py-6">
        <button
          onClick={() => navigate(`/books/${id}`)}
          className="mb-4 text-sm text-blue-600 hover:text-blue-800"
        >
          ← Back to book
        </button>
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h1 className="text-xl font-semibold mb-4">Edit book</h1>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Title *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Author *
              </label>
              <input
                type="text"
                required
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                ISBN *
              </label>
              <input
                type="text"
                required
                value={isbn}
                onChange={(e) => setIsbn(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Publication year *
              </label>
              <input
                type="number"
                required
                min="1"
                max="2100"
                value={publicationYear}
                onChange={(e) => setPublicationYear(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Total quantity *
              </label>
              <input
                type="number"
                required
                min="0"
                value={totalQuantity}
                onChange={(e) => setTotalQuantity(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                New cover image (optional)
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setCoverFile(e.target.files?.[0] ?? null)}
                className="w-full text-sm text-slate-600 file:mr-2 file:rounded file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm"
              />
              {book.coverImagePath && !coverFile && (
                <p className="mt-1 text-xs text-slate-500">
                  Current cover is set. Upload a new file to replace it.
                </p>
              )}
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-blue-600 text-white text-sm font-medium px-4 py-2 hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save changes'}
              </button>
              <button
                type="button"
                onClick={() => navigate(`/books/${id}`)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
