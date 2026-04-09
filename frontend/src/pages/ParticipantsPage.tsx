// frontend/src/pages/ParticipantsPage.tsx
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import type { Participant, TeamInfo } from '../api/client'
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
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'エラーが発生しました')
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
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'エラーが発生しました')
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
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'エラーが発生しました')
    }
  }

  if (loading) return <div className="text-muted-foreground">読み込み中...</div>

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">参加者一覧（{filtered.length}名）</h2>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger render={<Button />}>+ 新規参加者を追加</DialogTrigger>
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
                  <TableCell>
                    <Link
                      to={`/participants/${p.id}/tasks`}
                      className="hover:underline font-medium"
                    >
                      {p.name}
                    </Link>
                  </TableCell>
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
                      onValueChange={(v) => v && handleStatusChange(p.id, v)}
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
