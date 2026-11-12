import { Route, Routes } from 'react-router'
import RequireAuth from './auth/RequireAuth'
import Layout from './components/Layout'
import Placeholder from './components/Placeholder'
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
          <Route path="konkursy" element={<Placeholder title="Konkursy" />} />
          <Route path="konkursy/nowy" element={<Placeholder title="Nowy konkurs" />} />
          <Route path="konkursy/:id" element={<Placeholder title="Konkurs" />} />
          <Route path="konkursy/:id/edycja" element={<Placeholder title="Edycja konkursu" />} />
          <Route path="zakupy" element={<Placeholder title="Zakupy" />} />
          <Route path="wiecej" element={<Placeholder title="Więcej" />} />
        </Route>
      </Route>
    </Routes>
  )
}
