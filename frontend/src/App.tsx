import { Navigate, Route, Routes } from 'react-router'
import RequireAuth from './auth/RequireAuth'
import ContestDetailsPage from './pages/ContestDetailsPage'
import ContestFormPage from './pages/ContestFormPage'
import ContestsPage from './pages/ContestsPage'
import InvitesPage from './pages/InvitesPage'
import LoginPage from './pages/LoginPage'
import ProofsPage from './pages/ProofsPage'
import RegisterPage from './pages/RegisterPage'
import RemindersPage from './pages/RemindersPage'
import ShoppingPage from './pages/ShoppingPage'
import StatsPage from './pages/StatsPage'
import DetailLayout from './shell/DetailLayout'
import Layout from './shell/Layout'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route element={<RequireAuth />}>
        <Route element={<Layout />}>
          <Route index element={<RemindersPage />} />
          <Route path="konkursy" element={<ContestsPage />} />
          <Route path="zakupy" element={<ShoppingPage />} />
          <Route path="statystyki" element={<StatsPage />} />
        </Route>
        <Route element={<DetailLayout />}>
          <Route path="konkursy/nowy" element={<ContestFormPage />} />
          <Route path="konkursy/:id" element={<ContestDetailsPage />} />
          <Route path="konkursy/:id/edycja" element={<ContestFormPage />} />
          <Route path="zaproszenia" element={<InvitesPage />} />
          <Route path="dowody" element={<ProofsPage />} />
        </Route>
        <Route path="wiecej" element={<Navigate to="/statystyki" replace />} />
      </Route>
    </Routes>
  )
}
