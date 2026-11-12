import { Route, Routes } from 'react-router'
import RequireAuth from './auth/RequireAuth'
import Layout from './components/Layout'
import Placeholder from './components/Placeholder'
import ContestDetailsPage from './pages/ContestDetailsPage'
import ContestFormPage from './pages/ContestFormPage'
import ContestsPage from './pages/ContestsPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route element={<RequireAuth />}>
        <Route element={<Layout />}>
          <Route index element={<Placeholder title="Pilne" />} />
          <Route path="konkursy" element={<ContestsPage />} />
          <Route path="konkursy/nowy" element={<ContestFormPage />} />
          <Route path="konkursy/:id" element={<ContestDetailsPage />} />
          <Route path="konkursy/:id/edycja" element={<ContestFormPage />} />
          <Route path="zakupy" element={<Placeholder title="Zakupy" />} />
          <Route path="wiecej" element={<Placeholder title="Więcej" />} />
        </Route>
      </Route>
    </Routes>
  )
}
