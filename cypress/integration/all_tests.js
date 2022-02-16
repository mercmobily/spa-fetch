import { spaFetch, spaFetchConfig } from '../../spa-fetch.js'

/* global describe, it, expect */

const fetcher = function (p1, p2) {
  fetcher.counter++
  return fetch(p1, p2)
}
fetcher.counter = 0

spaFetchConfig.fetcher = fetcher

const prefix = 'http://localhost:8080/stores/1.0.0'

function sleep (ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

describe('Generic tests', () => {
  it('Runs one simple request', async () => {
    fetcher.counter = 0
    spaFetch.cache = new Map()
    //
    const allRes = await Promise.all([
      spaFetch(`${prefix}/users`)
    ])

    const r0 = await allRes[0].json()
    console.log(r0)
    expect(fetcher.counter).to.equal(1)

    expect(r0).to.be.an('array')
    expect(r0).to.have.lengthOf(4)
  })

  it('Runs three requests, three identical, all cached', async () => {
    fetcher.counter = 0
    spaFetch.cache = new Map()
    //
    const allRes = await Promise.all([
      spaFetch(`${prefix}/users`),
      spaFetch(`${prefix}/users`),
      spaFetch(`${prefix}/users`)
    ])
    const r0 = await allRes[0].json()
    const r1 = await allRes[1].json()
    const r2 = await allRes[2].json()
    expect(fetcher.counter).to.equal(1)

    expect(r0).to.be.an('array')
    expect(r0).to.have.lengthOf(4)
    expect(r1).to.have.lengthOf(4)
    expect(r2).to.have.lengthOf(4)
  })

  it('Runs three requests, two identical ones are cached', async () => {
    fetcher.counter = 0
    spaFetch.cache = new Map()
    //
    const allRes = await Promise.all([
      spaFetch(`${prefix}/users`),
      spaFetch(`${prefix}/users`, { credentials: 'omit' }),
      spaFetch(`${prefix}/users`)
    ])

    const r0 = await allRes[0].json()
    const r1 = await allRes[1].json()
    const r2 = await allRes[2].json()
    expect(fetcher.counter).to.equal(2)

    expect(r0).to.be.an('array')
    expect(r0).to.have.lengthOf(4)
    expect(r1).to.have.lengthOf(4)
    expect(r2).to.have.lengthOf(4)
  })

  it('Runs tho requests, one of them slightly different (HEAD rather than GET)', async () => {
    fetcher.counter = 0
    spaFetch.cache = new Map()
    //
    const allRes = await Promise.all([
      spaFetch(`${prefix}/users`, { method: 'head' }),
      spaFetch(`${prefix}/users`),
    ])
    const r0 = await allRes[0].text()
    const r1 = await allRes[1].json()
    expect(fetcher.counter).to.equal(2)

    expect(r0).to.equal('')
    expect(r1).to.be.an('array')
    expect(r1).to.have.lengthOf(4)
  })

  it('Runs tho requests, one of them slightly different (different headers)', async () => {
    fetcher.counter = 0
    spaFetch.cache = new Map()
    //
    const allRes = await Promise.all([
      spaFetch(`${prefix}/users`, { headers: { 'x-something': 10 } }),
      spaFetch(`${prefix}/users`),
    ])
    const r0 = await allRes[0].json()
    const r1 = await allRes[1].json()
    expect(fetcher.counter).to.equal(2)

    expect(r0).to.be.an('array')
    expect(r1).to.be.an('array')
    expect(r1).to.have.lengthOf(4)
  })

  it('Runs tho requests, one of them slightly different (different cache)', async () => {
    fetcher.counter = 0
    spaFetch.cache = new Map()
    //
    const allRes = await Promise.all([
      spaFetch(`${prefix}/users`, { cache: 'no-cache' }),
      spaFetch(`${prefix}/users`),
    ])
    const r0 = await allRes[0].json()
    const r1 = await allRes[1].json()
    expect(fetcher.counter).to.equal(2)

    expect(r0).to.be.an('array')
    expect(r1).to.be.an('array')
    expect(r1).to.have.lengthOf(4)
  })
})

describe('Using request object rather than url/init pairs', () => {
  //
  it('Runs two requests, one with Request and one with url/unit, but identical', async () => {
    fetcher.counter = 0
    spaFetch.cache = new Map()
    //
    const allRes = await Promise.all([
      spaFetch(`${prefix}/users`),
      spaFetch(new Request(`${prefix}/users`))
    ])

    const r0 = await allRes[0].json()
    const r1 = await allRes[1].json()
    expect(fetcher.counter).to.equal(1)

    expect(r0).to.be.an('array')
    expect(r0).to.have.lengthOf(4)

    expect(r1).to.be.an('array')
    expect(r1).to.have.lengthOf(4)
  })

  it('runs two requests, one with Request and one with url/unit, but different', async () => {
    fetcher.counter = 0
    spaFetch.cache = new Map()
    //
    const allRes = await Promise.all([
      spaFetch(`${prefix}/users`),
      spaFetch(new Request(`${prefix}/users`, { cache: 'no-cache' }))
    ])

    const r0 = await allRes[0].json()
    const r1 = await allRes[1].json()
    expect(fetcher.counter).to.equal(2)

    expect(r0).to.be.an('array')
    expect(r0).to.have.lengthOf(4)

    expect(r1).to.be.an('array')
    expect(r1).to.have.lengthOf(4)
  })


  it('runs two requests, one with Request and one with url/unit, identical, Request using init', async () => {
    fetcher.counter = 0
    spaFetch.cache = new Map()
    //
    const allRes = await Promise.all([
      spaFetch(`${prefix}/users`, { cache: 'no-cache' }),
      spaFetch(new Request(`${prefix}/users`), { cache: 'no-cache' })
    ])

    const r0 = await allRes[0].json()
    const r1 = await allRes[1].json()
    expect(fetcher.counter).to.equal(1)

    expect(r0).to.be.an('array')
    expect(r0).to.have.lengthOf(4)

    expect(r1).to.be.an('array')
    expect(r1).to.have.lengthOf(4)
  })

  it('runs two requests, one with Request and one with url/unit, identical, Request using own init AND fetch()\'s init', async () => {
    fetcher.counter = 0
    spaFetch.cache = new Map()
    //
    const allRes = await Promise.all([
      spaFetch(`${prefix}/users`, { cache: 'no-cache' }),
      spaFetch(new Request(`${prefix}/users`, { cache: 'no-store' }), { cache: 'no-cache' })
    ])

    const r0 = await allRes[0].json()
    const r1 = await allRes[1].json()
    expect(fetcher.counter).to.equal(1)

    expect(r0).to.be.an('array')
    expect(r0).to.have.lengthOf(4)

    expect(r1).to.be.an('array')
    expect(r1).to.have.lengthOf(4)
  })

  it('runs two requests, but cache expires', async () => {
    fetcher.counter = 0
    spaFetch.cache = new Map()
    spaFetchConfig.cacheDuration = 50

    const p0 = await spaFetch(`${prefix}/users`)
    await sleep(60)
    const p1 = await spaFetch(`${prefix}/users`)
    await sleep(60)
    const p2 = await spaFetch(`${prefix}/users`)
    await sleep(60)

    const r0 = await p0.json()
    const r1 = await p1.json()
    const r2 = await p2.json()
    expect(fetcher.counter).to.equal(3)

    expect(r0).to.be.an('array')
    expect(r0).to.have.lengthOf(4)
    expect(r1).to.have.lengthOf(4)
    expect(r2).to.have.lengthOf(4)
  })
})

describe('Error management', () => {
  it('Runs one simple request with network error', async () => {
    fetcher.counter = 0
    spaFetch.cache = new Map()
    //
    try {
      const allRes = await Promise.all([
        spaFetch(`http://localhost:8081/stores/1.0.0/users`)
      ])
    } catch (e) {
      expect(e).to.be.an('error')
    }
    expect(fetcher.counter).to.equal(1)
  })

  it('Runs two identical request with network error', async () => {
    fetcher.counter = 0
    spaFetch.cache = new Map()
    //
    try {
      await Promise.all([
        spaFetch(`http://localhost:9999/stores/1.0.0/users`)
      ])
    } catch (e) {
      expect(e).to.be.an('error')
    }

    try {
      await Promise.all([
        spaFetch(`http://localhost:9999/stores/1.0.0/users`)
      ])
    } catch (e) {
      expect(e).to.be.an('error')
    }
    expect(fetcher.counter).to.equal(1)
  })

  it('Runs three requests, three identical, all cached, returning 404', async () => {
    fetcher.counter = 0
    spaFetch.cache = new Map()
    //
    const allRes = await Promise.all([
      spaFetch(`${prefix}/users/99`),
      spaFetch(`${prefix}/users/99`),
      spaFetch(`${prefix}/users/99`)
    ])
    const r0 = await allRes[0].status
    const r1 = await allRes[1].status
    const r2 = await allRes[2].status
    expect(fetcher.counter).to.equal(1)

    expect(r0).to.equal(404)
    expect(r1).to.equal(404)
    expect(r2).to.equal(404)
  })
})