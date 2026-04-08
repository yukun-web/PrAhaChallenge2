import { EnrollmentStatus } from '../../domain/value-object/EnrollmentStatus'
import { ParticipantTransferService } from '../../domain/domain-service/ParticipantTransferService'
import { IParticipantRepository } from '../../domain/interface/IParticipantRepository'
import { ITeamRepository } from '../../domain/interface/ITeamRepository'
import { IPairRepository } from '../../domain/interface/IPairRepository'
import { IMailSender } from '../../domain/interface/IMailSender'

type UpdateParticipantStatusInput = { participantId: string; newStatus: string }

export class UpdateParticipantStatusUseCase {
  constructor(
    private readonly participantRepo: IParticipantRepository,
    private readonly teamRepo: ITeamRepository,
    private readonly pairRepo: IPairRepository,
    private readonly mailSender: IMailSender,
    private readonly adminEmail: string,
  ) {}

  async execute(input: UpdateParticipantStatusInput): Promise<void> {
    const participant = await this.participantRepo.findById(input.participantId)
    if (!participant) throw new Error('参加者が見つかりません')

    const newStatus = EnrollmentStatus.fromString(input.newStatus)
    const wasEnrolled = participant.status.isEnrolled()
    const willBeEnrolled = newStatus.isEnrolled()

    // changeStatusでpairIdがnullになるので先に保持
    const oldPairId = participant.pairId

    participant.changeStatus(newStatus)

    // 在籍中 → 非在籍: ペアから離脱
    if (wasEnrolled && !willBeEnrolled && oldPairId) {
      const pair = await this.pairRepo.findById(oldPairId)
      if (pair) {
        const team = await this.teamRepo.findById(pair.teamId)
        if (team) {
          const transferService = new ParticipantTransferService(this.mailSender, this.adminEmail)
          const result = await transferService.removeParticipantFromPair(input.participantId, team)
          await this.teamRepo.save(result.updatedTeam)
          if (result.removedPairId) await this.pairRepo.delete(result.removedPairId)
          if (result.relocatedMemberId) {
            for (const p of result.updatedTeam.pairs) {
              if (p.hasMember(result.relocatedMemberId)) {
                await this.pairRepo.save(p)
                const relocatedParticipant = await this.participantRepo.findById(result.relocatedMemberId)
                if (relocatedParticipant) {
                  relocatedParticipant.assignToPair(p.id)
                  await this.participantRepo.save(relocatedParticipant)
                }
                break
              }
            }
          }
        }
      }
    }

    // 非在籍 → 在籍中: ペアに自動配置
    if (!wasEnrolled && willBeEnrolled) {
      const team = await this.teamRepo.findWithFewestMembers()
      if (team) {
        const transferService = new ParticipantTransferService(this.mailSender, this.adminEmail)
        const result = transferService.assignParticipantToPair(input.participantId, team)
        participant.assignToPair(result.assignedPairId)
        await this.teamRepo.save(result.updatedTeam)
        const assignedPair = result.updatedTeam.pairs.find((p) => p.id === result.assignedPairId)
        if (assignedPair) await this.pairRepo.save(assignedPair)
        if (result.newPair) await this.pairRepo.save(result.newPair)
      }
    }

    await this.participantRepo.save(participant)
  }
}
