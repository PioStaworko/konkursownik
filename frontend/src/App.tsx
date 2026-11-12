import { Route, Routes } from 'react-router'
import RequireAuth from './auth/RequireAuth'
import Layout from './components/Layout'
import ContestDetailsPage from './pages/ContestDetailsPage'
import ContestFormPage from './pages/ContestFormPage'
import ContestsPage from './pages/ContestsPage'
import LoginPage from './pages/LoginPage'
import MorePage from './pages/MorePage'
import RegisterPage from './pages/RegisterPage'
import RemindersPage from './pages/RemindersPage'
import ShoppingPage from './pages/ShoppingPage'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route element={<RequireAuth />}>
        <Route element={<Layout />}>
          <Route index element={<RemindersPage />} />
          <Route path="konkursy" element={<ContestsPage />} />
          <Route path="konkursy/nowy" element={<ContestFormPage />} />
          <Route path="konkursy/:id" element={<ContestDetailsPage />} />
          <Route path="konkursy/:id/edycja" element={<ContestFormPage />} />
          <Route path="zakupy" element={<ShoppingPage />} />
          <Route path="wiecej" element={<MorePage />} />
        </Route>
      </Route>
    </Routes>
  )
}
