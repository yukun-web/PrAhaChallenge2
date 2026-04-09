// frontend/src/pages/TeamsPage.tsx
import { useEffect, useState } from 'react'
import { api } from '../api/client'
import type { TeamInfo, Participant } from '../api/client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'

type PairEditTarget = {
  pairId: string
  pairName: string
  memberIds: string[]
}

export function TeamsPage() {
  const [teams, setTeams] = useState<TeamInfo[]>([])
  const [participants, setParticipants] = useState<Participant[]>([])
  const [loading, setLoading] = useState(true)
  const [editTarget, setEditTarget] = useState<PairEditTarget | null>(null)
  const [editMemberIds, setEditMemberIds] = useState<string[]>([])
  const [addCandidateId, setAddCandidateId] = useState<string>('')
  const [saving, setSaving] = useState(false)

  const loadData = async () => {
    try {
      const [t, p] = await Promise.all([api.getTeams(), api.getParticipants()])
      setTeams(t)
      setParticipants(p)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'エラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // participantId → Participant のマッピング
  const participantMap = new Map(participants.map((p) => [p.id, p]))

  const handleEditOpen = (pairId: string, pairName: string, memberIds: string[]) => {
    setEditTarget({ pairId, pairName, memberIds })
    setEditMemberIds([...memberIds])
    setAddCandidateId('')
  }

  const handleRemoveMember = (memberId: string) => {
    setEditMemberIds((prev) => prev.filter((id) => id !== memberId))
  }

  const handleAddMember = () => {
    if (!addCandidateId) return
    setEditMemberIds((prev) => [...prev, addCandidateId])
    setAddCandidateId('')
  }

  const handleSave = async () => {
    if (!editTarget) return
    setSaving(true)
    try {
      await api.updatePairMembers(editTarget.pairId, editMemberIds)
      toast.success('ペアのメンバーを更新しました')
      setEditTarget(null)
      await loadData()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'エラーが発生しました')
    } finally {
      setSaving(false)
    }
  }

  // 追加候補: 在籍中かつ現在の編集メンバーに含まれていない参加者
  const addCandidates = participants.filter(
    (p) => p.status === 'ENROLLED' && !editMemberIds.includes(p.id),
  )

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
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {pair.memberIds.length}名
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 px-2 text-xs"
                        onClick={() => handleEditOpen(pair.id, pair.name, pair.memberIds)}
                      >
                        編集
                      </Button>
                    </div>
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

      {/* ペア編集ダイアログ */}
      <Dialog open={editTarget !== null} onOpenChange={(open) => { if (!open) setEditTarget(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ペア {editTarget?.pairName} のメンバー編集</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4 mt-4">
            {/* 現在のメンバー一覧 */}
            <div>
              <p className="text-sm text-muted-foreground mb-2">現在のメンバー</p>
              <div className="flex flex-col gap-1">
                {editMemberIds.length === 0 && (
                  <p className="text-xs text-muted-foreground">メンバーがいません</p>
                )}
                {editMemberIds.map((memberId) => {
                  const member = participantMap.get(memberId)
                  return (
                    <div
                      key={memberId}
                      className="flex justify-between items-center bg-muted rounded px-3 py-2 text-sm"
                    >
                      <div>
                        <span className="font-medium">{member?.name ?? memberId}</span>
                        <span className="text-muted-foreground text-xs ml-2">
                          {member?.email ?? ''}
                        </span>
                      </div>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="h-6 px-2 text-xs"
                        onClick={() => handleRemoveMember(memberId)}
                      >
                        除外
                      </Button>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* メンバー追加 */}
            <div>
              <p className="text-sm text-muted-foreground mb-2">メンバーを追加</p>
              <div className="flex gap-2">
                <Select value={addCandidateId} onValueChange={(v) => v && setAddCandidateId(v)}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="参加者を選択..." />
                  </SelectTrigger>
                  <SelectContent>
                    {addCandidates.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}（{p.email}）
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  onClick={handleAddMember}
                  disabled={!addCandidateId}
                >
                  追加
                </Button>
              </div>
            </div>

            {/* アクションボタン */}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setEditTarget(null)} disabled={saving}>
                キャンセル
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? '保存中...' : '保存'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
