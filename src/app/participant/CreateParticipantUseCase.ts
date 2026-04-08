import { Participant } from '../../domain/entity/Participant'
import { TaskProgress } from '../../domain/entity/TaskProgress'
import { Email } from '../../domain/value-object/Email'
import { EnrollmentStatus } from '../../domain/value-object/EnrollmentStatus'
import { ProgressStatus } from '../../domain/value-object/ProgressStatus'
import { ParticipantTransferService } from '../../domain/domain-service/ParticipantTransferService'
import { IParticipantRepository } from '../../domain/interface/IParticipantRepository'
import { ITeamRepository } from '../../domain/interface/ITeamRepository'
import { IPairRepository } from '../../domain/interface/IPairRepository'
import { ITaskProgressRepository } from '../../domain/interface/ITaskProgressRepository'
import { v4 as uuidv4 } from 'uuid'

type CreateParticipantInput = { name: string; email: string }

export class CreateParticipantUseCase {
  constructor(
    private readonly participantRepo: IParticipantRepository,
    private readonly teamRepo: ITeamRepository,
    private readonly pairRepo: IPairRepository,
    private readonly taskProgressRepo: ITaskProgressRepository,
    private readonly taskMasterIds: string[],
  ) {}

  async execute(input: CreateParticipantInput): Promise<void> {
    const email = Email.create(input.email)
    const existing = await this.participantRepo.findByEmail(email.value)
    if (existing) throw new Error('このメールアドレスは既に使用されています')

    const participantId = uuidv4()
    const participant = Participant.create({ id: participantId, name: input.name, email, status: EnrollmentStatus.enrolled(), pairId: null })

    const team = await this.teamRepo.findWithFewestMembers()
    if (!team) throw new Error('配置可能なチームがありません')

    const transferService = new ParticipantTransferService({ send: async () => {} }, '')
    const result = transferService.assignParticipantToPair(participantId, team)
    participant.assignToPair(result.assignedPairId)

    await this.participantRepo.save(participant)
    await this.teamRepo.save(result.updatedTeam)
    const assignedPair = result.updatedTeam.pairs.find((p) => p.id === result.assignedPairId)
    if (assignedPair) await this.pairRepo.save(assignedPair)
    if (result.newPair) await this.pairRepo.save(result.newPair)

    const taskProgresses = this.taskMasterIds.map((taskMasterId) =>
      TaskProgress.create({ id: uuidv4(), participantId, taskMasterId, status: ProgressStatus.notStarted() }),
    )
    await this.taskProgressRepo.bulkCreate(taskProgresses)
  }
}
