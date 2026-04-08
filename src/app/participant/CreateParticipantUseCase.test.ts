import { CreateParticipantUseCase } from './CreateParticipantUseCase'
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
import { ITaskProgressRepository } from '../../domain/interface/ITaskProgressRepository'

describe('CreateParticipantUseCase', () => {
  const createTeamWithPair = () => {
    const pair = Pair.create({ id: 'pair-1', name: PairName.create('a'), teamId: 'team-1', memberIds: ['existing-1', 'existing-2'] })
    return Team.create({ id: 'team-1', name: TeamName.create('1'), pairs: [pair] })
  }

  const taskMasterIds = ['tm-1', 'tm-2']

  const createMocks = (team: Team) => ({
    participantRepo: { findById: jest.fn(), findByEmail: jest.fn().mockResolvedValue(null), findAll: jest.fn(), save: jest.fn() } as IParticipantRepository,
    teamRepo: { findById: jest.fn(), findAll: jest.fn(), findWithFewestMembers: jest.fn().mockResolvedValue(team), save: jest.fn() } as ITeamRepository,
    pairRepo: { findById: jest.fn(), findByTeamId: jest.fn(), save: jest.fn(), delete: jest.fn() } as IPairRepository,
    taskProgressRepo: { findById: jest.fn(), findByParticipantId: jest.fn(), save: jest.fn(), bulkCreate: jest.fn() } as ITaskProgressRepository,
  })

  it('参加者を新規作成し、チーム・ペアに配置し、全課題の進捗を作成する', async () => {
    const team = createTeamWithPair()
    const mocks = createMocks(team)
    const useCase = new CreateParticipantUseCase(mocks.participantRepo, mocks.teamRepo, mocks.pairRepo, mocks.taskProgressRepo, taskMasterIds)
    await useCase.execute({ name: 'テスト太郎', email: 'test@example.com' })
    expect(mocks.participantRepo.save).toHaveBeenCalled()
    expect(mocks.taskProgressRepo.bulkCreate).toHaveBeenCalled()
    const bulkCreateArg = (mocks.taskProgressRepo.bulkCreate as jest.Mock).mock.calls[0][0]
    expect(bulkCreateArg).toHaveLength(2)
    expect(mocks.pairRepo.save).toHaveBeenCalled()
  })

  it('メールアドレスが重複している場合エラー', async () => {
    const team = createTeamWithPair()
    const mocks = createMocks(team)
    const existing = Participant.create({ id: 'existing', name: '既存ユーザー', email: Email.create('test@example.com'), status: EnrollmentStatus.enrolled(), pairId: null })
    ;(mocks.participantRepo.findByEmail as jest.Mock).mockResolvedValue(existing)
    const useCase = new CreateParticipantUseCase(mocks.participantRepo, mocks.teamRepo, mocks.pairRepo, mocks.taskProgressRepo, taskMasterIds)
    await expect(useCase.execute({ name: 'テスト太郎', email: 'test@example.com' })).rejects.toThrow('このメールアドレスは既に使用されています')
  })
})
