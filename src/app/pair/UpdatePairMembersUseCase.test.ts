import { UpdatePairMembersUseCase } from './UpdatePairMembersUseCase'
import { Pair } from '../../domain/entity/Pair'
import { PairName } from '../../domain/value-object/PairName'
import { Participant } from '../../domain/entity/Participant'
import { Email } from '../../domain/value-object/Email'
import { EnrollmentStatus } from '../../domain/value-object/EnrollmentStatus'
import { IPairRepository } from '../../domain/interface/IPairRepository'
import { IParticipantRepository } from '../../domain/interface/IParticipantRepository'

describe('UpdatePairMembersUseCase', () => {
  const createPair = () =>
    Pair.create({ id: 'pair-1', name: PairName.create('a'), teamId: 'team-1', memberIds: ['p-1', 'p-2'] })

  const createParticipant = (id: string) =>
    Participant.create({ id, name: `参加者${id}`, email: Email.create(`${id}@example.com`), status: EnrollmentStatus.enrolled(), pairId: null })

  it('ペアのメンバーを変更できる', async () => {
    const pair = createPair()
    const pairRepo: IPairRepository = { findById: jest.fn().mockResolvedValue(pair), findByTeamId: jest.fn(), save: jest.fn(), delete: jest.fn() }
    const participantRepo: IParticipantRepository = {
      findById: jest.fn().mockImplementation((id: string) => Promise.resolve(createParticipant(id))),
      findByEmail: jest.fn(), findAll: jest.fn(), save: jest.fn(),
    }
    const useCase = new UpdatePairMembersUseCase(pairRepo, participantRepo)
    await useCase.execute({ pairId: 'pair-1', memberIds: ['p-3', 'p-4', 'p-5'] })
    expect(pairRepo.save).toHaveBeenCalled()
  })

  it('ペアが見つからない場合エラー', async () => {
    const pairRepo: IPairRepository = { findById: jest.fn().mockResolvedValue(null), findByTeamId: jest.fn(), save: jest.fn(), delete: jest.fn() }
    const participantRepo: IParticipantRepository = { findById: jest.fn(), findByEmail: jest.fn(), findAll: jest.fn(), save: jest.fn() }
    const useCase = new UpdatePairMembersUseCase(pairRepo, participantRepo)
    await expect(useCase.execute({ pairId: 'not-found', memberIds: ['p-1', 'p-2'] })).rejects.toThrow('ペアが見つかりません')
  })
})
