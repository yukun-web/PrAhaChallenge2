import { ProgressStatus } from '../value-object/ProgressStatus'

type TaskProgressProps = {
  id: string
  participantId: string
  taskMasterId: string
  status: ProgressStatus
}

export class TaskProgress {
  private constructor(
    private readonly _id: string,
    private readonly _participantId: string,
    private readonly _taskMasterId: string,
    private _status: ProgressStatus,
  ) {}

  static create(props: TaskProgressProps): TaskProgress {
    return new TaskProgress(props.id, props.participantId, props.taskMasterId, props.status)
  }

  get id(): string {
    return this._id
  }

  get participantId(): string {
    return this._participantId
  }

  get taskMasterId(): string {
    return this._taskMasterId
  }

  get status(): ProgressStatus {
    return this._status
  }

  changeStatus(newStatus: ProgressStatus, operatorId: string): void {
    if (this._participantId !== operatorId) {
      throw new Error('課題の進捗ステータスを変更できるのは所有者のみです')
    }
    this._status.canTransitionTo(newStatus)
    this._status = newStatus
  }
}
