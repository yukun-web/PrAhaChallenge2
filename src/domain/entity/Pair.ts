import { PairName } from '../value-object/PairName'

type PairProps = {
  id: string
  name: PairName
  teamId: string
  memberIds: string[]
}

export class Pair {
  private static readonly MIN_MEMBERS = 2
  private static readonly MAX_MEMBERS = 3

  private constructor(
    private readonly _id: string,
    private _name: PairName,
    private _teamId: string,
    private _memberIds: string[],
  ) {}

  static create(props: PairProps): Pair {
    if (props.memberIds.length < Pair.MIN_MEMBERS || props.memberIds.length > Pair.MAX_MEMBERS) {
      throw new Error('ペアのメンバーは2〜3名でなければいけません')
    }
    return new Pair(props.id, props.name, props.teamId, [...props.memberIds])
  }

  get id(): string {
    return this._id
  }

  get name(): PairName {
    return this._name
  }

  get teamId(): string {
    return this._teamId
  }

  get memberIds(): string[] {
    return [...this._memberIds]
  }

  get memberCount(): number {
    return this._memberIds.length
  }

  isFull(): boolean {
    return this._memberIds.length >= Pair.MAX_MEMBERS
  }

  addMember(participantId: string): void {
    if (this._memberIds.length >= Pair.MAX_MEMBERS) {
      throw new Error('ペアのメンバーは3名までです')
    }
    this._memberIds.push(participantId)
  }

  removeMember(participantId: string): void {
    this._memberIds = this._memberIds.filter((id) => id !== participantId)
  }

  hasMember(participantId: string): boolean {
    return this._memberIds.includes(participantId)
  }
}
