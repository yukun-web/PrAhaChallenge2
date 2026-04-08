import { Participant } from '../entity/Participant'

export interface IParticipantRepository {
  findById(id: string): Promise<Participant | null>
  findByEmail(email: string): Promise<Participant | null>
  findAll(): Promise<Participant[]>
  save(participant: Participant): Promise<void>
}
