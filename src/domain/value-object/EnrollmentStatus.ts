const VALID_STATUSES = ['ENROLLED', 'ON_LEAVE', 'WITHDRAWN'] as const
type EnrollmentStatusValue = (typeof VALID_STATUSES)[number]

export class EnrollmentStatus {
  private constructor(private readonly _value: EnrollmentStatusValue) {}

  static enrolled(): EnrollmentStatus {
    return new EnrollmentStatus('ENROLLED')
  }

  static onLeave(): EnrollmentStatus {
    return new EnrollmentStatus('ON_LEAVE')
  }

  static withdrawn(): EnrollmentStatus {
    return new EnrollmentStatus('WITHDRAWN')
  }

  static fromString(value: string): EnrollmentStatus {
    if (!VALID_STATUSES.includes(value as EnrollmentStatusValue)) {
      throw new Error(`不正な在籍ステータス: ${value}`)
    }
    return new EnrollmentStatus(value as EnrollmentStatusValue)
  }

  get value(): EnrollmentStatusValue {
    return this._value
  }

  isEnrolled(): boolean {
    return this._value === 'ENROLLED'
  }

  equals(other: EnrollmentStatus): boolean {
    return this._value === other._value
  }
}
