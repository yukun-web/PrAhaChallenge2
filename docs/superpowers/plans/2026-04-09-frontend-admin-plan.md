# フロントエンド管理画面 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** プラハチャレンジ管理APIに対する運営向け管理画面をReact SPAで実装する

**Architecture:** React 18 + Vite + TypeScript。shadcn/ui + Tailwind CSSでUI構築。React Router v6で3ページ（参加者管理、チーム・ペア、課題検索）をルーティング。Viteプロキシでバックエンド（localhost:3000）のAPIを呼び出す。

**Tech Stack:** React, Vite, TypeScript, Tailwind CSS, shadcn/ui, React Router v6

**設計書:** `docs/superpowers/specs/2026-04-09-frontend-admin-design.md`

---

## Task 1: バックエンドに GET /api/task-masters エンドポイント追加

**Files:**
- Modify: `src/route/index.ts`
- Modify: `src/main.ts`

- [ ] **Step 1: main.ts に課題マスタ取得ルートを追加**

`src/main.ts` の `createApp` 関数内、Express設定セクションに課題マスタ一覧エンドポイントを直接追加する（単純な参照なのでUseCaseは不要）。

`app.use('/api', createRouter(...))` の直前に以下を追加:

```typescript
  // 課題マスタ一覧（単純な参照のため直接定義）
  app.get('/api/task-masters', async (req, res) => {
    const taskMasters = await prisma.taskMaster.findMany({
      select: { id: true, name: true },
    })
    res.json(taskMasters)
  })
```

ただし `createApp` の引数 `prisma` を使うため、この行は `app.use(express.json())` の後、`app.use('/api', createRouter(...))` の前に配置する。

- [ ] **Step 2: 動作確認**

```bash
cd "/Users/yukun/Claude Code/PrAhaChallenge"
npx dotenv -e .local.env -- npx ts-node -e "
const { PrismaClient } = require('@prisma/client');
const { createApp } = require('./src/main');
(async () => {
  const prisma = new PrismaClient();
  const app = await createApp(prisma);
  const server = app.listen(3001, async () => {
    const res = await fetch('http://localhost:3001/api/task-masters');
    const data = await res.json();
    console.log('Task masters count:', data.length);
    console.log('First:', data[0]);
    server.close();
    await prisma.\$disconnect();
  });
})();
"
```

Expected: `Task masters count: 80` と最初の課題マスタが表示される

- [ ] **Step 3: E2Eテストに追加**

`src/e2e/api.e2e.test.ts` の適切な位置に追加:

```typescript
describe('GET /api/task-masters', () => {
  it('課題マスタ一覧を取得できる', async () => {
    const res = await request(app).get('/api/task-masters')
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(80)
    expect(res.body[0]).toHaveProperty('id')
    expect(res.body[0]).toHaveProperty('name')
  })
})
```

- [ ] **Step 4: テスト実行**

```bash
npm run test:e2e
```

Expected: 全テストPASS

- [ ] **Step 5: コミット**

```bash
git add src/main.ts src/e2e/api.e2e.test.ts
git commit -m "feat: add GET /api/task-masters endpoint"
```

---

## Task 2: フロントエンドプロジェクトセットアップ

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/vite.config.ts`
- Create: `frontend/tsconfig.json`
- Create: `frontend/tsconfig.app.json`
- Create: `frontend/tsconfig.node.json`
- Create: `frontend/tailwind.config.js`
- Create: `frontend/postcss.config.js`
- Create: `frontend/index.html`
- Create: `frontend/src/main.tsx`
- Create: `frontend/src/App.tsx`
- Create: `frontend/src/index.css`

- [ ] **Step 1: Vite + React + TypeScript プロジェクトを作成**

```bash
cd "/Users/yukun/Claude Code/PrAhaChallenge"
npm create vite@latest frontend -- --template react-ts
```

- [ ] **Step 2: 依存関係をインストール**

```bash
cd "/Users/yukun/Claude Code/PrAhaChallenge/frontend"
npm install react-router-dom
npm install -D tailwindcss @tailwindcss/vite
```

- [ ] **Step 3: Tailwind CSS を設定**

`frontend/src/index.css` を以下に置き換え:

```css
@import "tailwindcss";
```

`frontend/vite.config.ts` を以下に置き換え:

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
})
```

- [ ] **Step 4: shadcn/ui をセットアップ**

```bash
cd "/Users/yukun/Claude Code/PrAhaChallenge/frontend"
npx shadcn@latest init -d
```

必要なコンポーネントを追加:

```bash
npx shadcn@latest add table button dialog input select badge toast sonner
```

- [ ] **Step 5: App.tsx に最小限のルーティングを設定**

```typescript
// frontend/src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/participants" replace />} />
        <Route path="/participants" element={<div>参加者管理</div>} />
        <Route path="/teams" element={<div>チーム・ペア</div>} />
        <Route path="/tasks" element={<div>課題検索</div>} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
```

- [ ] **Step 6: 起動確認**

```bash
cd "/Users/yukun/Claude Code/PrAhaChallenge/frontend"
npm run dev
```

ブラウザで http://localhost:5173 を開き、「参加者管理」が表示されることを確認。

- [ ] **Step 7: コミット**

```bash
cd "/Users/yukun/Claude Code/PrAhaChallenge"
git add frontend/
git commit -m "feat: scaffold frontend with Vite, React, Tailwind, shadcn/ui"
```

---

## Task 3: API クライアント

**Files:**
- Create: `frontend/src/api/client.ts`

- [ ] **Step 1: fetch wrapper を作成**

```typescript
// frontend/src/api/client.ts
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
}
```

- [ ] **Step 2: コミット**

```bash
cd "/Users/yukun/Claude Code/PrAhaChallenge"
git add frontend/src/api/
git commit -m "feat: add API client with types"
```

---

## Task 4: サイドバーレイアウト

**Files:**
- Create: `frontend/src/components/Layout.tsx`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Layout コンポーネントを作成**

```typescript
// frontend/src/components/Layout.tsx
import { NavLink, Outlet } from 'react-router-dom'

const navItems = [
  { to: '/participants', label: '参加者管理' },
  { to: '/teams', label: 'チーム・ペア' },
  { to: '/tasks', label: '課題検索' },
]

export function Layout() {
  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-56 border-r bg-muted/40 p-4 flex flex-col gap-1">
        <h1 className="text-lg font-bold mb-6 px-3">Praha Admin</h1>
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `px-3 py-2 rounded-md text-sm transition-colors ${
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto p-6">
        <Outlet />
      </main>
    </div>
  )
}
```

- [ ] **Step 2: App.tsx をレイアウト付きに更新**

```typescript
// frontend/src/App.tsx
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
```

- [ ] **Step 3: ブラウザで確認**

http://localhost:5173 でサイドバーが表示され、各リンクをクリックするとコンテンツが切り替わることを確認。

- [ ] **Step 4: コミット**

```bash
cd "/Users/yukun/Claude Code/PrAhaChallenge"
git add frontend/src/components/Layout.tsx frontend/src/App.tsx
git commit -m "feat: add sidebar layout with navigation"
```

---

## Task 5: 参加者管理ページ

**Files:**
- Create: `frontend/src/pages/ParticipantsPage.tsx`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: ParticipantsPage を作成**

```typescript
// frontend/src/pages/ParticipantsPage.tsx
import { useEffect, useState } from 'react'
import { api, Participant, TeamInfo } from '../api/client'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'

const STATUS_LABELS: Record<string, string> = {
  ENROLLED: '在籍中',
  ON_LEAVE: '休会中',
  WITHDRAWN: '退会済',
}

const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive'> = {
  ENROLLED: 'default',
  ON_LEAVE: 'secondary',
  WITHDRAWN: 'destructive',
}

const FILTER_OPTIONS = ['ALL', 'ENROLLED', 'ON_LEAVE', 'WITHDRAWN'] as const

export function ParticipantsPage() {
  const [participants, setParticipants] = useState<Participant[]>([])
  const [teams, setTeams] = useState<TeamInfo[]>([])
  const [filter, setFilter] = useState<string>('ALL')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    try {
      const [p, t] = await Promise.all([api.getParticipants(), api.getTeams()])
      setParticipants(p)
      setTeams(t)
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  // pairId → { teamName, pairName } のマッピング
  const pairMap = new Map<string, { teamName: string; pairName: string }>()
  teams.forEach((team) => {
    team.pairs.forEach((pair) => {
      pairMap.set(pair.id, { teamName: team.name, pairName: pair.name })
    })
  })

  const filtered = filter === 'ALL'
    ? participants
    : participants.filter((p) => p.status === filter)

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await api.updateParticipantStatus(id, status)
      toast.success('ステータスを更新しました')
      await loadData()
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  const handleCreate = async () => {
    try {
      await api.createParticipant(newName, newEmail)
      toast.success('参加者を作成しました')
      setDialogOpen(false)
      setNewName('')
      setNewEmail('')
      await loadData()
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  if (loading) return <div className="text-muted-foreground">読み込み中...</div>

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">参加者一覧（{filtered.length}名）</h2>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>+ 新規参加者を追加</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>新規参加者を追加</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-4 mt-4">
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">名前</label>
                <Input
                  placeholder="山田太郎"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">メールアドレス</label>
                <Input
                  placeholder="taro@example.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  キャンセル
                </Button>
                <Button onClick={handleCreate} disabled={!newName || !newEmail}>
                  追加する
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* フィルター */}
      <div className="flex gap-2 mb-4">
        {FILTER_OPTIONS.map((opt) => (
          <Button
            key={opt}
            variant={filter === opt ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(opt)}
          >
            {opt === 'ALL' ? '全て' : STATUS_LABELS[opt]}
          </Button>
        ))}
      </div>

      {/* テーブル */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>名前</TableHead>
              <TableHead>メールアドレス</TableHead>
              <TableHead>ステータス</TableHead>
              <TableHead>チーム</TableHead>
              <TableHead>ペア</TableHead>
              <TableHead>操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((p) => {
              const info = p.pairId ? pairMap.get(p.pairId) : null
              return (
                <TableRow key={p.id}>
                  <TableCell>{p.name}</TableCell>
                  <TableCell className="text-muted-foreground">{p.email}</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANTS[p.status]}>
                      {STATUS_LABELS[p.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>{info?.teamName ?? '—'}</TableCell>
                  <TableCell>{info?.pairName ?? '—'}</TableCell>
                  <TableCell>
                    <Select
                      value={p.status}
                      onValueChange={(v) => handleStatusChange(p.id, v)}
                    >
                      <SelectTrigger className="w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ENROLLED">在籍中</SelectItem>
                        <SelectItem value="ON_LEAVE">休会中</SelectItem>
                        <SelectItem value="WITHDRAWN">退会済</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: App.tsx のルートを更新**

```typescript
// frontend/src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from './components/Layout'
import { ParticipantsPage } from './pages/ParticipantsPage'
import { Toaster } from 'sonner'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Navigate to="/participants" replace />} />
          <Route path="/participants" element={<ParticipantsPage />} />
          <Route path="/teams" element={<div>チーム・ペア（実装予定）</div>} />
          <Route path="/tasks" element={<div>課題検索（実装予定）</div>} />
        </Route>
      </Routes>
      <Toaster />
    </BrowserRouter>
  )
}

export default App
```

- [ ] **Step 3: ブラウザで確認**

バックエンドが起動中であること（`npm run dev`）を確認してから http://localhost:5173/participants を開く。参加者30名のテーブルが表示され、ステータスフィルター、ステータス変更、新規追加モーダルが動作することを確認。

- [ ] **Step 4: コミット**

```bash
cd "/Users/yukun/Claude Code/PrAhaChallenge"
git add frontend/src/pages/ParticipantsPage.tsx frontend/src/App.tsx
git commit -m "feat: add participants management page"
```

---

## Task 6: チーム・ペア管理ページ

**Files:**
- Create: `frontend/src/pages/TeamsPage.tsx`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: TeamsPage を作成**

```typescript
// frontend/src/pages/TeamsPage.tsx
import { useEffect, useState } from 'react'
import { api, TeamInfo, Participant } from '../api/client'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

export function TeamsPage() {
  const [teams, setTeams] = useState<TeamInfo[]>([])
  const [participants, setParticipants] = useState<Participant[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const [t, p] = await Promise.all([api.getTeams(), api.getParticipants()])
        setTeams(t)
        setParticipants(p)
      } catch (e: any) {
        toast.error(e.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // participantId → Participant のマッピング
  const participantMap = new Map(participants.map((p) => [p.id, p]))

  if (loading) return <div className="text-muted-foreground">読み込み中...</div>

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">チーム・ペア管理</h2>

      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))' }}>
        {teams.map((team) => (
          <div key={team.id} className="border rounded-lg p-4 bg-card">
            <div className="text-center mb-3">
              <Badge variant="default" className="text-sm px-3 py-1">
                チーム {team.name}
              </Badge>
              <div className="text-xs text-muted-foreground mt-1">
                {team.totalMembers}名
              </div>
            </div>

            <div className="flex flex-col gap-2">
              {team.pairs.map((pair) => (
                <div key={pair.id} className="bg-muted rounded-md p-3">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-semibold text-primary">
                      ペア {pair.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {pair.memberIds.length}名
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    {pair.memberIds.map((memberId) => {
                      const member = participantMap.get(memberId)
                      return (
                        <div
                          key={memberId}
                          className="bg-background rounded px-2 py-1 text-xs flex justify-between"
                        >
                          <span>{member?.name ?? memberId}</span>
                          <span className="text-muted-foreground">
                            {member?.email ?? ''}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: App.tsx のルートを更新**

`import { TeamsPage } from './pages/TeamsPage'` を追加し、ルートの `<div>チーム・ペア（実装予定）</div>` を `<TeamsPage />` に置き換える。

- [ ] **Step 3: ブラウザで確認**

http://localhost:5173/teams を開き、5チームがグリッド表示され、各チーム内にペアとメンバーが表示されることを確認。ブラウザ幅を変えてグリッド列数が変わることも確認。

- [ ] **Step 4: コミット**

```bash
cd "/Users/yukun/Claude Code/PrAhaChallenge"
git add frontend/src/pages/TeamsPage.tsx frontend/src/App.tsx
git commit -m "feat: add teams and pairs management page"
```

---

## Task 7: 課題検索ページ

**Files:**
- Create: `frontend/src/pages/TaskSearchPage.tsx`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: TaskSearchPage を作成**

```typescript
// frontend/src/pages/TaskSearchPage.tsx
import { useEffect, useState } from 'react'
import { api, TaskMaster, SearchResult } from '../api/client'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'

const STATUS_OPTIONS = [
  { value: 'NOT_STARTED', label: '未着手' },
  { value: 'AWAITING_REVIEW', label: 'レビュー待ち' },
  { value: 'COMPLETED', label: '完了' },
]

export function TaskSearchPage() {
  const [taskMasters, setTaskMasters] = useState<TaskMaster[]>([])
  const [selectedTasks, setSelectedTasks] = useState<TaskMaster[]>([])
  const [progressStatus, setProgressStatus] = useState('NOT_STARTED')
  const [searchInput, setSearchInput] = useState('')
  const [result, setResult] = useState<SearchResult | null>(null)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    api.getTaskMasters().then(setTaskMasters).catch((e) => toast.error(e.message))
  }, [])

  const filteredOptions = taskMasters.filter(
    (tm) =>
      !selectedTasks.some((s) => s.id === tm.id) &&
      tm.name.toLowerCase().includes(searchInput.toLowerCase()),
  )

  const handleSearch = async (p: number = 1) => {
    if (selectedTasks.length === 0) {
      toast.error('課題を1つ以上選択してください')
      return
    }
    setLoading(true)
    try {
      const res = await api.searchParticipants(
        selectedTasks.map((t) => t.id),
        progressStatus,
        p,
      )
      setResult(res)
      setPage(p)
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  const totalPages = result ? Math.ceil(result.totalCount / result.perPage) : 0

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">課題進捗検索</h2>

      {/* 検索フォーム */}
      <div className="border rounded-lg p-4 mb-6 bg-card">
        <div className="flex gap-4 items-end flex-wrap">
          {/* 課題選択 */}
          <div className="flex-[2] min-w-[200px]">
            <label className="text-sm text-muted-foreground mb-1 block">
              課題（複数選択可）
            </label>
            <div className="border rounded-md p-2 min-h-[40px] bg-background">
              <div className="flex flex-wrap gap-1 mb-1">
                {selectedTasks.map((task) => (
                  <Badge key={task.id} variant="default" className="gap-1">
                    {task.name}
                    <button
                      className="ml-1 hover:text-destructive"
                      onClick={() =>
                        setSelectedTasks((prev) =>
                          prev.filter((t) => t.id !== task.id),
                        )
                      }
                    >
                      ✕
                    </button>
                  </Badge>
                ))}
              </div>
              <Input
                className="border-0 p-0 h-6 shadow-none focus-visible:ring-0"
                placeholder="課題を検索..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
              {searchInput && filteredOptions.length > 0 && (
                <div className="border rounded-md mt-1 max-h-40 overflow-auto bg-popover">
                  {filteredOptions.slice(0, 10).map((tm) => (
                    <div
                      key={tm.id}
                      className="px-3 py-1.5 text-sm hover:bg-muted cursor-pointer"
                      onClick={() => {
                        setSelectedTasks((prev) => [...prev, tm])
                        setSearchInput('')
                      }}
                    >
                      {tm.name}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ステータス */}
          <div className="flex-1 min-w-[150px]">
            <label className="text-sm text-muted-foreground mb-1 block">
              進捗ステータス
            </label>
            <Select value={progressStatus} onValueChange={setProgressStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button onClick={() => handleSearch(1)} disabled={loading}>
            検索
          </Button>
        </div>
      </div>

      {/* 検索結果 */}
      {result && (
        <>
          <div className="text-sm text-muted-foreground mb-3">
            検索結果: {result.totalCount}名
            （{(result.page - 1) * result.perPage + 1}〜
            {Math.min(result.page * result.perPage, result.totalCount)}件目を表示）
          </div>

          <div className="rounded-md border mb-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>名前</TableHead>
                  <TableHead>メールアドレス</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.data.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{p.name}</TableCell>
                    <TableCell className="text-muted-foreground">{p.email}</TableCell>
                  </TableRow>
                ))}
                {result.data.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center text-muted-foreground">
                      該当する参加者がいません
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* ページネーション */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <Button
                  key={p}
                  variant={p === page ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleSearch(p)}
                >
                  {p}
                </Button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 2: App.tsx のルートを更新**

`import { TaskSearchPage } from './pages/TaskSearchPage'` を追加し、ルートの `<div>課題検索（実装予定）</div>` を `<TaskSearchPage />` に置き換える。

- [ ] **Step 3: ブラウザで確認**

http://localhost:5173/tasks を開き:
- 課題名を入力するとサジェストが表示される
- 複数課題を選択してチップ表示される
- ステータスを選んで検索すると結果がテーブル表示される
- ページネーションが動作する

- [ ] **Step 4: コミット**

```bash
cd "/Users/yukun/Claude Code/PrAhaChallenge"
git add frontend/src/pages/TaskSearchPage.tsx frontend/src/App.tsx
git commit -m "feat: add task progress search page with pagination"
```

---

## Task 8: 最終確認とビルド

- [ ] **Step 1: フロントエンドのビルド確認**

```bash
cd "/Users/yukun/Claude Code/PrAhaChallenge/frontend"
npm run build
```

Expected: ビルドがエラーなしで完了

- [ ] **Step 2: バックエンドのテスト確認**

```bash
cd "/Users/yukun/Claude Code/PrAhaChallenge"
npm run test:unit
npm run test:e2e
```

Expected: 全テストPASS

- [ ] **Step 3: 最終コミット**

```bash
cd "/Users/yukun/Claude Code/PrAhaChallenge"
git add -A
git commit -m "chore: final build verification"
```
