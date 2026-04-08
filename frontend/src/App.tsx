import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Toaster } from 'sonner'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Navigate to="/participants" replace />} />
          <Route path="/participants" element={<div>参加者管理（実装予定）</div>} />
          <Route path="/teams" element={<div>チーム・ペア（実装予定）</div>} />
          <Route path="/tasks" element={<div>課題検索（実装予定）</div>} />
        </Route>
      </Routes>
      <Toaster />
    </BrowserRouter>
  )
}

export default App
