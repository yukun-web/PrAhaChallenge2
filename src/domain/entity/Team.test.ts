import { Team } from './Team'
import { TeamName } from '../value-object/TeamName'
import { Pair } from './Pair'
import { PairName } from '../value-object/PairName'

const createPair = (id: string, name: string, teamId: string, memberIds: string[]) =>
  Pair.create({ id, name: PairName.create(name), teamId, memberIds })

describe('Team', () => {
  it('チームを生成できる', () => {
    const team = Team.create({ id: 'team-1', name: TeamName.create('1'), pairs: [] })
    expect(team.id).toBe('team-1')
    expect(team.name.value).toBe('1')
  })

  it('全メンバー数を取得できる', () => {
    const team = Team.create({
      id: 'team-1',
      name: TeamName.create('1'),
      pairs: [
        createPair('p1', 'a', 'team-1', ['m1', 'm2']),
        createPair('p2', 'b', 'team-1', ['m3', 'm4', 'm5']),
      ],
    })
    expect(team.totalMemberCount).toBe(5)
  })

  it('最少人数のペアを取得できる', () => {
    const pair1 = createPair('p1', 'a', 'team-1', ['m1', 'm2'])
    const pair2 = createPair('p2', 'b', 'team-1', ['m3', 'm4', 'm5'])
    const team = Team.create({ id: 'team-1', name: TeamName.create('1'), pairs: [pair1, pair2] })
    expect(team.findPairWithFewestMembers()?.id).toBe('p1')
  })

  it('ペアを追加できる', () => {
    const team = Team.create({ id: 'team-1', name: TeamName.create('1'), pairs: [] })
    team.addPair(createPair('p1', 'a', 'team-1', ['m1', 'm2']))
    expect(team.pairs).toHaveLength(1)
  })

  it('ペアを削除できる', () => {
    const pair = createPair('p1', 'a', 'team-1', ['m1', 'm2'])
    const team = Team.create({ id: 'team-1', name: TeamName.create('1'), pairs: [pair] })
    team.removePair('p1')
    expect(team.pairs).toHaveLength(0)
  })

  it('チーム人数が2名以下かどうかを判定できる', () => {
    const team = Team.create({
      id: 'team-1',
      name: TeamName.create('1'),
      pairs: [createPair('p1', 'a', 'team-1', ['m1', 'm2'])],
    })
    expect(team.isUnderMinimumMembers()).toBe(true)
  })
})
