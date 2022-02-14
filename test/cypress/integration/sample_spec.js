import { globalFetch } from '../../index.js'

const prefix = 'http://localhost:8080/stores/1.0.0'

describe('The Home Page', () => {
    it('successfully loads', async () => {

        debugger
      const res1 = await globalFetch(`${prefix}/users`)
      const res2 = await globalFetch(`${prefix}/users`)
      const res3 = await globalFetch(`${prefix}/users`)
      const json1 = await res1.json()
      const json2 = await res2.json()
      const json3 = await res3.json()
      console.log(res1, res2, res3, json1, json2, json3)
    })

  })
