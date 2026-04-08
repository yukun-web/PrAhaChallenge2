import { Pair } from './Pair'
import { PairName } from '../value-object/PairName'

describe('Pair', () => {
  const createPair = (memberIds: string[] = ['p1', 'p2']) => {
    return Pair.create({
      id: 'pair-1',
      name: PairName.create('a'),
      teamId: 'team-1',
      memberIds,
    })
  }

  it('2名のペアを生成できる', () => {
    const pair = createPair(['p1', 'p2'])
    expect(pair.memberIds).toEqual(['p1', 'p2'])
    expect(pair.memberCount).toBe(2)
  })

  it('3名のペアを生成できる', () => {
    const pair = createPair(['p1', 'p2', 'p3'])
    expect(pair.memberCount).toBe(3)
  })

  it('1名のペアは生成できない', () => {
    expect(() => createPair(['p1'])).toThrow('ペアのメンバーは2〜3名でなければいけません')
  })

  it('4名のペアは生成できない', () => {
    expect(() => createPair(['p1', 'p2', 'p3', 'p4'])).toThrow(
      'ペアのメンバーは2〜3名でなければいけません',
    )
  })

  it('メンバーを追加できる', () => {
    const pair = createPair(['p1', 'p2'])
    pair.addMember('p3')
    expect(pair.memberIds).toContain('p3')
    expect(pair.memberCount).toBe(3)
  })

  it('4名以上にはできない', () => {
    const pair = createPair(['p1', 'p2', 'p3'])
    expect(() => pair.addMember('p4')).toThrow()
  })

  it('メンバーを除外できる', () => {
    const pair = createPair(['p1', 'p2', 'p3'])
    pair.removeMember('p3')
    expect(pair.memberIds).not.toContain('p3')
    expect(pair.memberCount).toBe(2)
  })

  it('isFull は3名のとき true', () => {
    const pair = createPair(['p1', 'p2', 'p3'])
    expect(pair.isFull()).toBe(true)
  })

  it('isFull は2名のとき false', () => {
    const pair = createPair(['p1', 'p2'])
    expect(pair.isFull()).toBe(false)
  })
})
