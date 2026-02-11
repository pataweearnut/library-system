import { Toaster } from 'react-hot-toast'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '../features/auth/context/AuthContext'
import { AdminRoute } from '../features/auth/components/AdminRoute'
import { PrivateRoute } from '../features/auth/components/PrivateRoute'
import { LoginPage } from '../features/auth/pages/LoginPage'
import { BooksListPage } from '../features/books/pages/BooksListPage'
import { BookDetailPage } from '../features/books/pages/BookDetailPage'
import { AddBookPage } from '../features/books/pages/AddBookPage'
import { BookEditPage } from '../features/books/pages/BookEditPage'
import { UsersPage } from '../features/users/pages/UsersPage'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <PrivateRoute>
                <BooksListPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/books/new"
            element={
              <PrivateRoute>
                <AddBookPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/books/:id"
            element={
              <PrivateRoute>
                <BookDetailPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/books/:id/edit"
            element={
              <PrivateRoute>
                <BookEditPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/users"
            element={
              <AdminRoute>
                <UsersPage />
              </AdminRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App

