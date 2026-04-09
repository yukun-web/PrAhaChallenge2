import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from './components/Layout'
import { ParticipantsPage } from './pages/ParticipantsPage'
import { ParticipantTasksPage } from './pages/ParticipantTasksPage'
import { TeamsPage } from './pages/TeamsPage'
import { TaskSearchPage } from './pages/TaskSearchPage'
import { Toaster } from 'sonner'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Navigate to="/participants" replace />} />
          <Route path="/participants" element={<ParticipantsPage />} />
          <Route path="/participants/:id/tasks" element={<ParticipantTasksPage />} />
          <Route path="/teams" element={<TeamsPage />} />
          <Route path="/tasks" element={<TaskSearchPage />} />
        </Route>
      </Routes>
      <Toaster />
    </BrowserRouter>
  )
}

export default App
