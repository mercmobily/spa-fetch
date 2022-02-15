import { globalFetch } from '../../index.js'

const prefix = 'http://localhost:8080/stores/1.0.0'

describe ('The Home Page', () => {
  it('successfully loads', async () => {
    debugger

    // const test = fetch(new Request({}))
    const allRes = await Promise.all([
      globalFetch(`${prefix}/users`),
      globalFetch(`${prefix}/users`),
      globalFetch(`${prefix}/users`)
    ])

    const r1 = await allRes[0].json()
    const r2 = await allRes[1].json()
    const r3 = await allRes[2].json()

    console.log(r1, r2, r3)
    expect(r1).to.be.an('array')
  })
})
