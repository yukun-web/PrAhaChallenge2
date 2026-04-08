export class PairName {
  private constructor(private readonly _value: string) {}

  static create(value: string): PairName {
    if (!value || !/^[a-z]$/.test(value)) {
      throw new Error(`ペア名は英小文字1文字でなければいけません: ${value}`)
    }
    return new PairName(value)
  }

  get value(): string {
    return this._value
  }

  equals(other: PairName): boolean {
    return this._value === other._value
  }
}
