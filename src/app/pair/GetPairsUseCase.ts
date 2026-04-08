import { Pair } from '../../domain/entity/Pair'
import { ITeamRepository } from '../../domain/interface/ITeamRepository'

export type PairWithTeam = { pair: Pair; teamId: string }

export class GetPairsUseCase {
  constructor(private readonly teamRepo: ITeamRepository) {}
  async execute(): Promise<PairWithTeam[]> {
    const teams = await this.teamRepo.findAll()
    return teams.flatMap((team) => team.pairs.map((pair) => ({ pair, teamId: team.id })))
  }
}
