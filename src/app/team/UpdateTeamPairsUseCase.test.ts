import { UpdateTeamPairsUseCase } from './UpdateTeamPairsUseCase'
import { Team } from '../../domain/entity/Team'
import { Pair } from '../../domain/entity/Pair'
import { TeamName } from '../../domain/value-object/TeamName'
import { PairName } from '../../domain/value-object/PairName'
import { ITeamRepository } from '../../domain/interface/ITeamRepository'
import { IPairRepository } from '../../domain/interface/IPairRepository'

describe('UpdateTeamPairsUseCase', () => {
  it('チームのペアを変更できる', async () => {
    const team = Team.create({ id: 'team-1', name: TeamName.create('1'), pairs: [] })
    const pair = Pair.create({ id: 'pair-1', name: PairName.create('a'), teamId: 'team-1', memberIds: ['p-1', 'p-2'] })
    const teamRepo: ITeamRepository = { findById: jest.fn().mockResolvedValue(team), findAll: jest.fn(), findWithFewestMembers: jest.fn(), save: jest.fn() }
    const pairRepo: IPairRepository = { findById: jest.fn().mockResolvedValue(pair), findByTeamId: jest.fn(), save: jest.fn(), delete: jest.fn() }
    const useCase = new UpdateTeamPairsUseCase(teamRepo, pairRepo)
    await useCase.execute({ teamId: 'team-1', pairIds: ['pair-1'] })
    expect(teamRepo.save).toHaveBeenCalled()
  })

  it('チームが見つからない場合エラー', async () => {
    const teamRepo: ITeamRepository = { findById: jest.fn().mockResolvedValue(null), findAll: jest.fn(), findWithFewestMembers: jest.fn(), save: jest.fn() }
    const pairRepo: IPairRepository = { findById: jest.fn(), findByTeamId: jest.fn(), save: jest.fn(), delete: jest.fn() }
    const useCase = new UpdateTeamPairsUseCase(teamRepo, pairRepo)
    await expect(useCase.execute({ teamId: 'not-found', pairIds: [] })).rejects.toThrow('チームが見つかりません')
  })
})
