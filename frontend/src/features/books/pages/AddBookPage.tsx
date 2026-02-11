import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../../../shared/api/client'

function getErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const res = (err as { response?: { data?: { message?: string } } }).response
    return res?.data?.message ?? fallback
  }
  return fallback
}

export function AddBookPage() {
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')
  const [isbn, setIsbn] = useState('')
  const [publicationYear, setPublicationYear] = useState('')
  const [totalQuantity, setTotalQuantity] = useState('')
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const year = parseInt(publicationYear, 10)
    const total = parseInt(totalQuantity, 10)
    if (Number.isNaN(year) || Number.isNaN(total) || total < 0) {
      toast.error('Publication year and total quantity must be valid numbers.')
      return
    }
    setLoading(true)
    try {
      const payload = {
        title: title.trim(),
        author: author.trim(),
        isbn: isbn.trim(),
        publicationYear: year,
        totalQuantity: total,
      }
      let res: { data: { id: string } }
      if (coverFile) {
        const formData = new FormData()
        formData.append('title', payload.title)
        formData.append('author', payload.author)
        formData.append('isbn', payload.isbn)
        formData.append('publicationYear', String(payload.publicationYear))
        formData.append('totalQuantity', String(payload.totalQuantity))
        formData.append('cover', coverFile)
        res = await api.post<{ id: string }>('/books', formData)
      } else {
        res = await api.post<{ id: string }>('/books', payload)
      }
      toast.success('Book added successfully.')
      navigate(`/books/${res.data.id}`)
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to add book'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="max-w-xl mx-auto px-6 py-6">
        <button
          onClick={() => navigate('/')}
          className="mb-4 text-sm text-blue-600 hover:text-blue-800"
        >
          ← Back
        </button>
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h1 className="text-xl font-semibold mb-4">Add new book</h1>
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
                Cover image (optional)
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setCoverFile(e.target.files?.[0] ?? null)}
                className="w-full text-sm text-slate-600 file:mr-2 file:rounded file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                disabled={loading}
                className="rounded-lg bg-blue-600 text-white text-sm font-medium px-4 py-2 hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Adding…' : 'Add book'}
              </button>
              <button
                type="button"
                onClick={() => navigate('/')}
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
