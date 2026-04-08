import { PairName } from './PairName'

describe('PairName', () => {
  it('英小文字1文字で生成できる', () => {
    const name = PairName.create('a')
    expect(name.value).toBe('a')
  })

  it('2文字以上でエラーになる', () => {
    expect(() => PairName.create('ab')).toThrow()
  })

  it('大文字でエラーになる', () => {
    expect(() => PairName.create('A')).toThrow()
  })

  it('数字でエラーになる', () => {
    expect(() => PairName.create('1')).toThrow()
  })

  it('空文字でエラーになる', () => {
    expect(() => PairName.create('')).toThrow()
  })

  it('同じ名前は等価', () => {
    expect(PairName.create('a').equals(PairName.create('a'))).toBe(true)
  })
})
