import { Team } from '../../domain/entity/Team'
import { ITeamRepository } from '../../domain/interface/ITeamRepository'
import { IPairRepository } from '../../domain/interface/IPairRepository'

type UpdateTeamPairsInput = { teamId: string; pairIds: string[] }

export class UpdateTeamPairsUseCase {
  constructor(
    private readonly teamRepo: ITeamRepository,
    private readonly pairRepo: IPairRepository,
  ) {}

  async execute(input: UpdateTeamPairsInput): Promise<void> {
    const team = await this.teamRepo.findById(input.teamId)
    if (!team) throw new Error('チームが見つかりません')

    const pairs = await Promise.all(
      input.pairIds.map(async (pairId) => {
        const pair = await this.pairRepo.findById(pairId)
        if (!pair) throw new Error(`ペアが見つかりません: ${pairId}`)
        return pair
      }),
    )

    const newTeam = Team.create({ id: team.id, name: team.name, pairs })
    await this.teamRepo.save(newTeam)
  }
}
