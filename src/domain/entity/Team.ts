import { TeamName } from '../value-object/TeamName'
import { Pair } from './Pair'

type TeamProps = {
  id: string
  name: TeamName
  pairs: Pair[]
}

export class Team {
  private static readonly MIN_MEMBERS = 3

  private constructor(
    private readonly _id: string,
    private _name: TeamName,
    private _pairs: Pair[],
  ) {}

  static create(props: TeamProps): Team {
    return new Team(props.id, props.name, [...props.pairs])
  }

  get id(): string {
    return this._id
  }

  get name(): TeamName {
    return this._name
  }

  get pairs(): Pair[] {
    return [...this._pairs]
  }

  get totalMemberCount(): number {
    return this._pairs.reduce((sum, pair) => sum + pair.memberCount, 0)
  }

  isUnderMinimumMembers(): boolean {
    return this.totalMemberCount < Team.MIN_MEMBERS
  }

  findPairWithFewestMembers(): Pair | null {
    if (this._pairs.length === 0) return null
    const minCount = Math.min(...this._pairs.map((p) => p.memberCount))
    const candidates = this._pairs.filter((p) => p.memberCount === minCount)
    return candidates[Math.floor(Math.random() * candidates.length)]!
  }

  addPair(pair: Pair): void {
    this._pairs.push(pair)
  }

  removePair(pairId: string): void {
    this._pairs = this._pairs.filter((p) => p.id !== pairId)
  }

  getPairById(pairId: string): Pair | undefined {
    return this._pairs.find((p) => p.id === pairId)
  }
}
