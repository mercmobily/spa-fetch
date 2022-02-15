import { spaFetch, spaFetchConfig } from '../../index.js'

/* global describe, it, expect */
/*
  Normal, one request
  Two requests, identical, cached
  Three requests, two cached, one not
  Two requests, slightly different parameters
  Two identical posts, two different calls (only GET is cached)
  Specify method in small letters via init, via Request, via Request's init

  Request object
    One using Request, one using url, params, identical
    One using Request, one using url, params, different
    One using Request plus init, one using url, params, identical
    One using Request plus init, one using url, params, different

  Cache duration
    One request, cache expires, another request identical to the previous one
*/

const fetcher = function (p1, p2) {
  fetcher.counter++
  return fetch(p1, p2)
}
fetcher.counter = 0

spaFetchConfig.fetcher = fetcher

const prefix = 'http://localhost:8080/stores/1.0.0'

describe('The Home Page', () => {
  it('successfully loads', async () => {

    // const test = fetch(new Request({}))
    const allRes = await Promise.all([
      spaFetch(`${prefix}/users`),
      spaFetch(`${prefix}/users`),
      spaFetch(`${prefix}/users`)
    ])

    const r1 = await allRes[0].json()
    const r2 = await allRes[1].json()
    const r3 = await allRes[2].json()
    expect(fetcher.counter).to.equal(1)

    console.log(r1, r2, r3)
    expect(r1).to.be.an('array')
  })
})
