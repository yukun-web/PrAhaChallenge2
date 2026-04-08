import { Email } from '../value-object/Email'
import { EnrollmentStatus } from '../value-object/EnrollmentStatus'

type ParticipantProps = {
  id: string
  name: string
  email: Email
  status: EnrollmentStatus
  pairId: string | null
}

export class Participant {
  private constructor(
    private readonly _id: string,
    private readonly _name: string,
    private readonly _email: Email,
    private _status: EnrollmentStatus,
    private _pairId: string | null,
  ) {}

  static create(props: ParticipantProps): Participant {
    return new Participant(props.id, props.name, props.email, props.status, props.pairId)
  }

  get id(): string {
    return this._id
  }

  get name(): string {
    return this._name
  }

  get email(): Email {
    return this._email
  }

  get status(): EnrollmentStatus {
    return this._status
  }

  get pairId(): string | null {
    return this._pairId
  }

  changeStatus(newStatus: EnrollmentStatus): void {
    this._status = newStatus
    if (!newStatus.isEnrolled()) {
      this._pairId = null
    }
  }

  assignToPair(pairId: string): void {
    if (!this._status.isEnrolled()) {
      throw new Error('在籍中でない参加者はペアに所属できません')
    }
    this._pairId = pairId
  }

  leavePair(): void {
    this._pairId = null
  }
}
