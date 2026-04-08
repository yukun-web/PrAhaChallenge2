import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/participants" replace />} />
        <Route path="/participants" element={<div className="p-6 text-xl">参加者管理</div>} />
        <Route path="/teams" element={<div className="p-6 text-xl">チーム・ペア</div>} />
        <Route path="/tasks" element={<div className="p-6 text-xl">課題検索</div>} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
