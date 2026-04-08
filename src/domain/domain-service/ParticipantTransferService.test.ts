import { ParticipantTransferService } from './ParticipantTransferService'
import { Team } from '../entity/Team'
import { Pair } from '../entity/Pair'
import { Participant } from '../entity/Participant'
import { TeamName } from '../value-object/TeamName'
import { PairName } from '../value-object/PairName'
import { Email } from '../value-object/Email'
import { EnrollmentStatus } from '../value-object/EnrollmentStatus'

const createParticipant = (id: string, pairId: string | null = null) =>
  Participant.create({
    id,
    name: `参加者${id}`,
    email: Email.create(`${id}@example.com`),
    status: EnrollmentStatus.enrolled(),
    pairId,
  })

const createPair = (id: string, name: string, teamId: string, memberIds: string[]) =>
  Pair.create({ id, name: PairName.create(name), teamId, memberIds })

const createTeam = (id: string, name: string, pairs: Pair[]) =>
  Team.create({ id, name: TeamName.create(name), pairs })

describe('ParticipantTransferService', () => {
  let service: ParticipantTransferService
  let sentMails: { to: string; subject: string; body: string }[]

  beforeEach(() => {
    sentMails = []
    const mockMailSender = {
      send: async (to: string, subject: string, body: string) => {
        sentMails.push({ to, subject, body })
      },
    }
    service = new ParticipantTransferService(mockMailSender, 'admin@example.com')
  })

  describe('removeParticipantFromPair', () => {
    it('3名ペアから1名減っても再編成は不要', async () => {
      const pair = createPair('p1', 'a', 't1', ['m1', 'm2', 'm3'])
      const team = createTeam('t1', '1', [pair])

      const result = await service.removeParticipantFromPair('m3', team)

      expect(result.updatedTeam.pairs[0]!.memberCount).toBe(2)
      expect(result.removedPairId).toBeNull()
    })

    it('2名ペアから1名減ると残りの1名が他ペアに合流する', async () => {
      const pair1 = createPair('p1', 'a', 't1', ['m1', 'm2'])
      const pair2 = createPair('p2', 'b', 't1', ['m3', 'm4'])
      const team = createTeam('t1', '1', [pair1, pair2])

      const result = await service.removeParticipantFromPair('m1', team)

      expect(result.removedPairId).toBe('p1')
      const remainingPair = result.updatedTeam.pairs.find((p) => p.id === 'p2')
      expect(remainingPair!.memberCount).toBe(3)
      expect(remainingPair!.hasMember('m2')).toBe(true)
    })

    it('合流先がない場合は管理者にメール通知', async () => {
      const pair1 = createPair('p1', 'a', 't1', ['m1', 'm2'])
      const team = createTeam('t1', '1', [pair1])

      await service.removeParticipantFromPair('m1', team)

      expect(sentMails).toHaveLength(1)
      expect(sentMails[0]!.to).toBe('admin@example.com')
      expect(sentMails[0]!.body).toContain('m2')
    })

    it('チームが2名以下になったら管理者にメール通知', async () => {
      const pair1 = createPair('p1', 'a', 't1', ['m1', 'm2', 'm3'])
      const team = createTeam('t1', '1', [pair1])

      await service.removeParticipantFromPair('m3', team)

      expect(sentMails).toHaveLength(1)
      expect(sentMails[0]!.body).toContain('t1')
    })
  })

  describe('assignParticipantToPair', () => {
    it('最少人数のペアに配置される', () => {
      const pair1 = createPair('p1', 'a', 't1', ['m1', 'm2'])
      const pair2 = createPair('p2', 'b', 't1', ['m3', 'm4', 'm5'])
      const team = createTeam('t1', '1', [pair1, pair2])

      const result = service.assignParticipantToPair('new-member', team)

      expect(result.assignedPairId).toBe('p1')
    })

    it('ペアが4名になったら自動分割される', () => {
      const pair1 = createPair('p1', 'a', 't1', ['m1', 'm2', 'm3'])
      const team = createTeam('t1', '1', [pair1])

      const result = service.assignParticipantToPair('m4', team)

      expect(result.updatedTeam.pairs).toHaveLength(2)
      result.updatedTeam.pairs.forEach((pair) => {
        expect(pair.memberCount).toBeGreaterThanOrEqual(2)
        expect(pair.memberCount).toBeLessThanOrEqual(3)
      })
    })
  })
})
