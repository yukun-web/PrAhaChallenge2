const VALID_STATUSES = ['NOT_STARTED', 'AWAITING_REVIEW', 'COMPLETED'] as const
type ProgressStatusValue = (typeof VALID_STATUSES)[number]

export class ProgressStatus {
  private constructor(private readonly _value: ProgressStatusValue) {}

  static notStarted(): ProgressStatus {
    return new ProgressStatus('NOT_STARTED')
  }

  static awaitingReview(): ProgressStatus {
    return new ProgressStatus('AWAITING_REVIEW')
  }

  static completed(): ProgressStatus {
    return new ProgressStatus('COMPLETED')
  }

  static fromString(value: string): ProgressStatus {
    if (!VALID_STATUSES.includes(value as ProgressStatusValue)) {
      throw new Error(`不正な進捗ステータス: ${value}`)
    }
    return new ProgressStatus(value as ProgressStatusValue)
  }

  get value(): ProgressStatusValue {
    return this._value
  }

  isCompleted(): boolean {
    return this._value === 'COMPLETED'
  }

  canTransitionTo(next: ProgressStatus): void {
    if (this.isCompleted()) {
      throw new Error('完了した課題のステータスは変更できません')
    }
  }

  equals(other: ProgressStatus): boolean {
    return this._value === other._value
  }
}
