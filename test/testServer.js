const JsonRestStores = require('jsonreststores')
const express = require('express')
const http = require('http')

const port = 8080

function startServer () {
    return new Promise((resolve) => {
      const app = express()
      var server = http.createServer(app)
  
      server.listen({ port }, () => {
        JsonRestStores.requireStoresFromPath('./stores', app)
        resolve(server)
      })
      
    })
  }

  const run = async () => {
// The next step is to define four records which will be used extensively during tests.
// Note that `_chiaraAddress4` (with an underscore) is used to _add_ the record, whereas
// `chiaraAddress4` is used to compare it with the result of a fetch (which, in case of
// addresses, will also include the full `person` record under the property `userIdRecord`)
    tony = { name: 'Tony', surname: 'Mobily', id: 0 }
    chiara = { name: 'Chiara', surname: 'Fabbietti', id: 1 }
    chiaraTag4 = { id: 4, userId: 1, name: 'Chiara Tag 0' }
    _chiaraAddress4 = { id: 4, userId: 1, line1: 'Chiara Address 0' }
    chiaraAddress4 = { id: 4, userId: 1, line1: 'Chiara Address 0', userIdRecord: chiara }

// The server is started by using the previously declared function
    server = await startServer()

// The main aim of the next chunk of code is to create `defaultConfig`, which will be
// the default configuration used by `loader`. It defines the correct prefix to make
// requests to the right address and port, and will pass `cross-fetch` as the
// fetching function
    url = `http://127.0.0.1:${port}/stores/1.0.0`
  
// The next three variables represents the three stores used in the tests:
// `users`, `addresse` and `tags`
    users = JsonRestStores.stores('1.0.0').users
    addresses = JsonRestStores.stores('1.0.0').addresses
    tags = JsonRestStores.stores('1.0.0').tags
 
// The next step in this huge prep is to actualy populate the stores.
// Note that in some cases the "common" records are used
    await users.implementInsert({ body: tony })
    await users.implementInsert({ body: chiara })
    await users.implementInsert({ body: { name: 'Julian', surname: 'Mobily', id: 2 }})
    await users.implementInsert({ body: { name: 'Reuben', surname: 'Mobily', id: 3 }})

    await addresses.implementInsert({ body: { id: 0, userId: 0, line1: 'Tony Address 0' }})
    await addresses.implementInsert({ body: { id: 1, userId: 0, line1: 'Tony Address 1' }})
    await addresses.implementInsert({ body: { id: 2, userId: 0, line1: 'Tony Address 2' }})
    await addresses.implementInsert({ body: { id: 3, userId: 0, line1: 'Tony Address 3' }})

    await addresses.implementInsert({ body: _chiaraAddress4 })
    await addresses.implementInsert({ body: { id: 5, userId: 1, line1: 'Chiara Address 1' }})
    await addresses.implementInsert({ body: { id: 6, userId: 1, line1: 'Chiara Address 2' }})
    await addresses.implementInsert({ body: { id: 7, userId: 1, line1: 'Chiara Address 3' }})

    await tags.implementInsert({ body: { id: 0, userId: 0, name: 'Tony Tag 0' }})
    await tags.implementInsert({ body: { id: 1, userId: 0, name: 'Tony Tag 1' }})
    await tags.implementInsert({ body: { id: 2, userId: 0, name: 'Tony Tag 2' }})
    await tags.implementInsert({ body: { id: 3, userId: 0, name: 'Tony Tag 3' }})

    await tags.implementInsert({ body: chiaraTag4 })
    await tags.implementInsert({ body: { id: 5, userId: 1, name: 'Chiara Tag 1' }})
    await tags.implementInsert({ body: { id: 6, userId: 1, name: 'Chiara Tag 2' }})
    await tags.implementInsert({ body: { id: 7, userId: 1, name: 'Chiara Tag 3' }})  
  }

  run()