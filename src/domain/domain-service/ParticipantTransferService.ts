import { Team } from '../entity/Team'
import { Pair } from '../entity/Pair'
import { PairName } from '../value-object/PairName'
import { IMailSender } from '../interface/IMailSender'
import { v4 as uuidv4 } from 'uuid'

type RemoveResult = {
  updatedTeam: Team
  removedPairId: string | null
  relocatedMemberId: string | null
}

type AssignResult = {
  updatedTeam: Team
  assignedPairId: string
  newPair: Pair | null
}

export class ParticipantTransferService {
  constructor(
    private readonly mailSender: IMailSender,
    private readonly adminEmail: string,
  ) {}

  async removeParticipantFromPair(
    participantId: string,
    team: Team,
  ): Promise<RemoveResult> {
    const pair = team.pairs.find((p) => p.hasMember(participantId))
    if (!pair) {
      throw new Error(`参加者${participantId}はこのチームのどのペアにも所属していません`)
    }

    pair.removeMember(participantId)

    let removedPairId: string | null = null
    let relocatedMemberId: string | null = null

    if (pair.memberCount === 1) {
      const remainingMemberId = pair.memberIds[0]!
      const otherPairs = team.pairs.filter((p) => p.id !== pair.id)

      if (otherPairs.length === 0) {
        team.removePair(pair.id)
        removedPairId = pair.id
        await this.mailSender.send(
          this.adminEmail,
          'ペア合流先がありません',
          `参加者${participantId}が減ったことにより、参加者${remainingMemberId}の合流先がありません。チーム${team.id}で対応が必要です。`,
        )
        return { updatedTeam: team, removedPairId, relocatedMemberId }
      } else {
        const minCount = Math.min(...otherPairs.map((p) => p.memberCount))
        const candidates = otherPairs.filter((p) => p.memberCount === minCount)
        const targetPair = candidates[Math.floor(Math.random() * candidates.length)]!
        targetPair.addMember(remainingMemberId)
        relocatedMemberId = remainingMemberId
      }

      team.removePair(pair.id)
      removedPairId = pair.id
    }

    if (team.isUnderMinimumMembers()) {
      const memberNames = team.pairs.flatMap((p) => p.memberIds).join(', ')
      await this.mailSender.send(
        this.adminEmail,
        'チームが2名以下になりました',
        `参加者${participantId}が減ったことにより、チームID:${team.id}(${team.name.value})が${team.totalMemberCount}名になりました。現在の参加者: ${memberNames}`,
      )
    }

    return { updatedTeam: team, removedPairId, relocatedMemberId }
  }

  assignParticipantToPair(
    participantId: string,
    team: Team,
  ): AssignResult {
    const targetPair = team.findPairWithFewestMembers()
    if (!targetPair) {
      throw new Error('チームにペアがありません')
    }

    let newPair: Pair | null = null

    if (targetPair.memberCount >= 3) {
      // 追加すると4名になるため、事前に分割する
      // 既存メンバーを2名と1名に分け、新メンバーと合わせて2:2にする
      const members = targetPair.memberIds
      // targetPairから最後の1名を取り出す
      const movedMemberId = members[members.length - 1]!
      targetPair.removeMember(movedMemberId)

      const existingNames = team.pairs.map((p) => p.name.value)
      const nextName = 'abcdefghijklmnopqrstuvwxyz'
        .split('')
        .find((c) => !existingNames.includes(c))
      if (!nextName) {
        throw new Error('利用可能なペア名がありません')
      }

      newPair = Pair.create({
        id: uuidv4(),
        name: PairName.create(nextName),
        teamId: team.id,
        memberIds: [movedMemberId, participantId],
      })
      team.addPair(newPair)
    } else {
      targetPair.addMember(participantId)
    }

    return { updatedTeam: team, assignedPairId: targetPair.id, newPair }
  }
}
