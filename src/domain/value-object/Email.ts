export class Email {
  private constructor(private readonly _value: string) {}

  static create(value: string): Email {
    if (!value || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      throw new Error(`不正なメールアドレス: ${value}`)
    }
    return new Email(value)
  }

  get value(): string {
    return this._value
  }

  equals(other: Email): boolean {
    return this._value === other._value
  }
}
