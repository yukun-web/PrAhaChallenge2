// frontend/src/pages/ParticipantTasksPage.tsx
import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '../api/client'
import type { Participant, TaskProgressItem } from '../api/client'
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
import { toast } from 'sonner'

const PROGRESS_LABELS: Record<string, string> = {
  NOT_STARTED: '未着手',
  AWAITING_REVIEW: 'レビュー待ち',
  COMPLETED: '完了',
}

const PROGRESS_VARIANTS: Record<string, 'default' | 'secondary' | 'outline'> = {
  NOT_STARTED: 'outline',
  AWAITING_REVIEW: 'secondary',
  COMPLETED: 'default',
}

const FILTER_OPTIONS = ['ALL', 'NOT_STARTED', 'AWAITING_REVIEW', 'COMPLETED'] as const
type FilterOption = typeof FILTER_OPTIONS[number]

export function ParticipantTasksPage() {
  const { id: participantId } = useParams<{ id: string }>()
  const [participant, setParticipant] = useState<Participant | null>(null)
  const [progresses, setProgresses] = useState<TaskProgressItem[]>([])
  const [filter, setFilter] = useState<FilterOption>('ALL')
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    if (!participantId) return
    try {
      const [participants, taskProgresses] = await Promise.all([
        api.getParticipants(),
        api.getParticipantTaskProgresses(participantId),
      ])
      const found = participants.find((p) => p.id === participantId) ?? null
      setParticipant(found)
      setProgresses(taskProgresses)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'エラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [participantId])

  const handleStatusChange = async (taskProgressId: string, newStatus: string) => {
    if (!participantId) return
    try {
      await api.updateTaskProgress(taskProgressId, participantId, newStatus)
      toast.success('ステータスを更新しました')
      await loadData()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'エラーが発生しました')
    }
  }

  const filtered = filter === 'ALL'
    ? progresses
    : progresses.filter((p) => p.progressStatus === filter)

  const countByStatus = (status: string) =>
    progresses.filter((p) => p.progressStatus === status).length

  if (loading) return <div className="text-muted-foreground">読み込み中...</div>

  if (!participant) {
    return (
      <div>
        <Link to="/participants" className="text-sm text-muted-foreground hover:underline">
          ← 参加者一覧に戻る
        </Link>
        <div className="mt-4 text-destructive">参加者が見つかりませんでした</div>
      </div>
    )
  }

  return (
    <div>
      {/* 戻るリンク */}
      <Link to="/participants" className="text-sm text-muted-foreground hover:underline">
        ← 参加者一覧に戻る
      </Link>

      {/* 参加者情報 */}
      <div className="mt-4 mb-6">
        <h2 className="text-2xl font-bold">{participant.name}</h2>
        <p className="text-muted-foreground text-sm mt-1">{participant.email}</p>
      </div>

      {/* 進捗サマリー */}
      <div className="flex gap-4 mb-6 p-4 bg-card border rounded-lg">
        <div className="text-sm">
          <span className="font-medium">完了</span>{' '}
          <span className="text-2xl font-bold">{countByStatus('COMPLETED')}</span>
        </div>
        <div className="text-sm">
          <span className="font-medium">レビュー待ち</span>{' '}
          <span className="text-2xl font-bold">{countByStatus('AWAITING_REVIEW')}</span>
        </div>
        <div className="text-sm">
          <span className="font-medium">未着手</span>{' '}
          <span className="text-2xl font-bold">{countByStatus('NOT_STARTED')}</span>
        </div>
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
            {opt === 'ALL' ? '全て' : PROGRESS_LABELS[opt]}
          </Button>
        ))}
      </div>

      {/* テーブル */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>課題名</TableHead>
              <TableHead>ステータス</TableHead>
              <TableHead>変更</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((progress) => (
              <TableRow key={progress.id}>
                <TableCell>{progress.taskName}</TableCell>
                <TableCell>
                  <Badge variant={PROGRESS_VARIANTS[progress.progressStatus]}>
                    {PROGRESS_LABELS[progress.progressStatus]}
                  </Badge>
                </TableCell>
                <TableCell>
                  {progress.progressStatus === 'COMPLETED' ? (
                    <span className="text-sm text-muted-foreground">変更不可</span>
                  ) : (
                    <Select
                      value={progress.progressStatus}
                      onValueChange={(v) => v && handleStatusChange(progress.id, v)}
                    >
                      <SelectTrigger className="w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NOT_STARTED">未着手</SelectItem>
                        <SelectItem value="AWAITING_REVIEW">レビュー待ち</SelectItem>
                        <SelectItem value="COMPLETED">完了</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground">
                  該当する課題がありません
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
