import { Team } from '../../domain/entity/Team'
import { ITeamRepository } from '../../domain/interface/ITeamRepository'

export class GetTeamsUseCase {
  constructor(private readonly teamRepo: ITeamRepository) {}
  async execute(): Promise<Team[]> { return this.teamRepo.findAll() }
}
