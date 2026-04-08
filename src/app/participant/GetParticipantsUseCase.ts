import { Participant } from '../../domain/entity/Participant'
import { IParticipantRepository } from '../../domain/interface/IParticipantRepository'

export class GetParticipantsUseCase {
  constructor(private readonly participantRepo: IParticipantRepository) {}
  async execute(): Promise<Participant[]> { return this.participantRepo.findAll() }
}
