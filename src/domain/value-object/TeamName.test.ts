import { TeamName } from './TeamName'

describe('TeamName', () => {
  it('数字で生成できる', () => {
    const name = TeamName.create('1')
    expect(name.value).toBe('1')
  })

  it('3文字以下の数字で生成できる', () => {
    const name = TeamName.create('123')
    expect(name.value).toBe('123')
  })

  it('4文字以上でエラーになる', () => {
    expect(() => TeamName.create('1234')).toThrow()
  })

  it('数字以外の文字でエラーになる', () => {
    expect(() => TeamName.create('abc')).toThrow()
  })

  it('空文字でエラーになる', () => {
    expect(() => TeamName.create('')).toThrow()
  })

  it('同じ名前は等価', () => {
    expect(TeamName.create('1').equals(TeamName.create('1'))).toBe(true)
  })
})
