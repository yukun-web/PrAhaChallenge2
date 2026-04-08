import { TaskProgress } from '../entity/TaskProgress'

export interface ITaskProgressRepository {
  findById(id: string): Promise<TaskProgress | null>
  findByParticipantId(participantId: string): Promise<TaskProgress[]>
  save(taskProgress: TaskProgress): Promise<void>
  bulkCreate(taskProgresses: TaskProgress[]): Promise<void>
}
