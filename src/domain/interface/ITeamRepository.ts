import { Team } from '../entity/Team'

export interface ITeamRepository {
  findById(id: string): Promise<Team | null>
  findAll(): Promise<Team[]>
  findWithFewestMembers(): Promise<Team | null>
  save(team: Team): Promise<void>
}
