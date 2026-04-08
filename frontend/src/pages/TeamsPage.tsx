// frontend/src/pages/TeamsPage.tsx
import { useEffect, useState } from 'react'
import { api } from '../api/client'
import type { TeamInfo, Participant } from '../api/client'
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
