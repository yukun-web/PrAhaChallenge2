export class TeamName {
  private constructor(private readonly _value: string) {}

  static create(value: string): TeamName {
    if (!value || !/^\d+$/.test(value)) {
      throw new Error(`チーム名は数字でなければいけません: ${value}`)
    }
    if (value.length > 3) {
      throw new Error(`チーム名は3文字以下でなければいけません: ${value}`)
    }
    return new TeamName(value)
  }

  get value(): string {
    return this._value
  }

  equals(other: TeamName): boolean {
    return this._value === other._value
  }
}
