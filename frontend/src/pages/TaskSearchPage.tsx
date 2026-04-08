// frontend/src/pages/TaskSearchPage.tsx
import { useEffect, useState } from 'react'
import { api } from '../api/client'
import type { TaskMaster, SearchResult } from '../api/client'
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
            <Select value={progressStatus} onValueChange={(v) => { if (v !== null) setProgressStatus(v) }}>
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
