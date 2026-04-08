import { ITaskProgressRepository } from '../../domain/interface/ITaskProgressRepository'
import { ProgressStatus } from '../../domain/value-object/ProgressStatus'

type UpdateTaskProgressInput = {
  taskProgressId: string
  operatorId: string
  newStatus: string
}

export class UpdateTaskProgressUseCase {
  constructor(private readonly taskProgressRepo: ITaskProgressRepository) {}

  async execute(input: UpdateTaskProgressInput): Promise<void> {
    const taskProgress = await this.taskProgressRepo.findById(input.taskProgressId)
    if (!taskProgress) {
      throw new Error('課題進捗が見つかりません')
    }
    const newStatus = ProgressStatus.fromString(input.newStatus)
    taskProgress.changeStatus(newStatus, input.operatorId)
    await this.taskProgressRepo.save(taskProgress)
  }
}
