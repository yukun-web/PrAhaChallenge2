import { Pair } from '../entity/Pair'

export interface IPairRepository {
  findById(id: string): Promise<Pair | null>
  findByTeamId(teamId: string): Promise<Pair[]>
  save(pair: Pair): Promise<void>
  delete(id: string): Promise<void>
}
