const API_BASE = '/api'

export async function fetchApi<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'APIエラー' }))
    throw new Error(error.error || `HTTP ${res.status}`)
  }
  return res.json()
}

// --- Types ---
export type Participant = {
  id: string
  name: string
  email: string
  status: 'ENROLLED' | 'ON_LEAVE' | 'WITHDRAWN'
  pairId: string | null
}

export type PairInfo = {
  id: string
  name: string
  teamId: string
  memberIds: string[]
}

export type TeamInfo = {
  id: string
  name: string
  pairs: { id: string; name: string; memberIds: string[] }[]
  totalMembers: number
}

export type TaskMaster = {
  id: string
  name: string
}

export type SearchResult = {
  data: { id: string; name: string; email: string }[]
  totalCount: number
  page: number
  perPage: number
}

export type TaskProgressItem = {
  id: string
  taskMasterId: string
  taskName: string
  progressStatus: 'NOT_STARTED' | 'AWAITING_REVIEW' | 'COMPLETED'
}

// --- API functions ---
export const api = {
  getParticipants: () => fetchApi<Participant[]>('/participants'),

  createParticipant: (name: string, email: string) =>
    fetchApi<{ message: string }>('/participants', {
      method: 'POST',
      body: JSON.stringify({ name, email }),
    }),

  updateParticipantStatus: (id: string, status: string) =>
    fetchApi<{ message: string }>(`/participants/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  getTeams: () => fetchApi<TeamInfo[]>('/teams'),

  getPairs: () => fetchApi<PairInfo[]>('/pairs'),

  getTaskMasters: () => fetchApi<TaskMaster[]>('/task-masters'),

  searchParticipants: (
    taskMasterIds: string[],
    progressStatus: string,
    page: number,
  ) =>
    fetchApi<SearchResult>(
      `/participants/search?taskMasterIds=${taskMasterIds.join(',')}&progressStatus=${progressStatus}&page=${page}`,
    ),

  updatePairMembers: (pairId: string, memberIds: string[]) =>
    fetchApi<{ message: string }>(`/pairs/${pairId}/members`, {
      method: 'PATCH',
      body: JSON.stringify({ memberIds }),
    }),

  getParticipantTaskProgresses: (participantId: string) =>
    fetchApi<TaskProgressItem[]>(`/participants/${participantId}/task-progresses`),

  updateTaskProgress: (
    taskProgressId: string,
    operatorId: string,
    status: string,
  ) =>
    fetchApi<{ message: string }>(`/task-progresses/${taskProgressId}`, {
      method: 'PATCH',
      body: JSON.stringify({ operatorId, status }),
    }),
}
