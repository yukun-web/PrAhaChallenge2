import { Pair } from '../../domain/entity/Pair'
import { IPairRepository } from '../../domain/interface/IPairRepository'
import { IParticipantRepository } from '../../domain/interface/IParticipantRepository'

type UpdatePairMembersInput = { pairId: string; memberIds: string[] }

export class UpdatePairMembersUseCase {
  constructor(
    private readonly pairRepo: IPairRepository,
    private readonly participantRepo: IParticipantRepository,
  ) {}

  async execute(input: UpdatePairMembersInput): Promise<void> {
    const pair = await this.pairRepo.findById(input.pairId)
    if (!pair) throw new Error('ペアが見つかりません')

    const newPair = Pair.create({ id: pair.id, name: pair.name, teamId: pair.teamId, memberIds: input.memberIds })

    for (const oldMemberId of pair.memberIds) {
      if (!input.memberIds.includes(oldMemberId)) {
        const participant = await this.participantRepo.findById(oldMemberId)
        if (participant) { participant.leavePair(); await this.participantRepo.save(participant) }
      }
    }
    for (const newMemberId of input.memberIds) {
      const participant = await this.participantRepo.findById(newMemberId)
      if (participant) { participant.assignToPair(newPair.id); await this.participantRepo.save(participant) }
    }

    await this.pairRepo.save(newPair)
  }
}
