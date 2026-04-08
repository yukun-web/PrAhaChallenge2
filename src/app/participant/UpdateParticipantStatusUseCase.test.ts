import { UpdateParticipantStatusUseCase } from './UpdateParticipantStatusUseCase'
import { Participant } from '../../domain/entity/Participant'
import { Team } from '../../domain/entity/Team'
import { Pair } from '../../domain/entity/Pair'
import { Email } from '../../domain/value-object/Email'
import { EnrollmentStatus } from '../../domain/value-object/EnrollmentStatus'
import { TeamName } from '../../domain/value-object/TeamName'
import { PairName } from '../../domain/value-object/PairName'
import { IParticipantRepository } from '../../domain/interface/IParticipantRepository'
import { ITeamRepository } from '../../domain/interface/ITeamRepository'
import { IPairRepository } from '../../domain/interface/IPairRepository'
import { IMailSender } from '../../domain/interface/IMailSender'

describe('UpdateParticipantStatusUseCase', () => {
  const createParticipant = (pairId: string) =>
    Participant.create({ id: 'p-1', name: 'テスト太郎', email: Email.create('test@example.com'), status: EnrollmentStatus.enrolled(), pairId })

  const createTeamWithPairs = () => {
    const pair1 = Pair.create({ id: 'pair-1', name: PairName.create('a'), teamId: 'team-1', memberIds: ['p-1', 'p-2', 'p-3'] })
    const pair2 = Pair.create({ id: 'pair-2', name: PairName.create('b'), teamId: 'team-1', memberIds: ['p-4', 'p-5'] })
    return Team.create({ id: 'team-1', name: TeamName.create('1'), pairs: [pair1, pair2] })
  }

  const createMocks = (participant: Participant, team: Team) => ({
    participantRepo: { findById: jest.fn().mockResolvedValue(participant), findByEmail: jest.fn(), findAll: jest.fn(), save: jest.fn() } as IParticipantRepository,
    teamRepo: { findById: jest.fn().mockResolvedValue(team), findAll: jest.fn().mockResolvedValue([team]), findWithFewestMembers: jest.fn().mockResolvedValue(team), save: jest.fn() } as ITeamRepository,
    pairRepo: { findById: jest.fn().mockResolvedValue(team.pairs[0]), findByTeamId: jest.fn(), save: jest.fn(), delete: jest.fn() } as IPairRepository,
    mailSender: { send: jest.fn() } as IMailSender,
  })

  it('休会に変更するとペアから離脱する', async () => {
    const participant = createParticipant('pair-1')
    const team = createTeamWithPairs()
    const mocks = createMocks(participant, team)
    const useCase = new UpdateParticipantStatusUseCase(mocks.participantRepo, mocks.teamRepo, mocks.pairRepo, mocks.mailSender, 'admin@example.com')
    await useCase.execute({ participantId: 'p-1', newStatus: 'ON_LEAVE' })
    expect(participant.status.value).toBe('ON_LEAVE')
    expect(participant.pairId).toBeNull()
    expect(mocks.participantRepo.save).toHaveBeenCalled()
  })

  it('参加者が見つからない場合エラー', async () => {
    const team = createTeamWithPairs()
    const mocks = createMocks(null as any, team)
    ;(mocks.participantRepo.findById as jest.Mock).mockResolvedValue(null)
    const useCase = new UpdateParticipantStatusUseCase(mocks.participantRepo, mocks.teamRepo, mocks.pairRepo, mocks.mailSender, 'admin@example.com')
    await expect(useCase.execute({ participantId: 'not-found', newStatus: 'ON_LEAVE' })).rejects.toThrow('参加者が見つかりません')
  })

  it('休会中から在籍中に復帰するとペアに自動配置される', async () => {
    const participant = Participant.create({ id: 'p-1', name: 'テスト太郎', email: Email.create('test@example.com'), status: EnrollmentStatus.onLeave(), pairId: null })
    const team = createTeamWithPairs()
    const mocks = createMocks(participant, team)
    const useCase = new UpdateParticipantStatusUseCase(mocks.participantRepo, mocks.teamRepo, mocks.pairRepo, mocks.mailSender, 'admin@example.com')
    await useCase.execute({ participantId: 'p-1', newStatus: 'ENROLLED' })
    expect(participant.status.isEnrolled()).toBe(true)
    expect(participant.pairId).not.toBeNull()
  })
})
