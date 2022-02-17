// # The basic test server

// This is a simple server that returns basic data from a standard endppint

// The only non-core modules for this file are `express` and `jsonreststores` (which piggy backs on Express).
const JsonRestStores = require('jsonreststores')
const express = require('express')
const http = require('http')

// This is the running function, since Node doesn't support root-level async functions
const run = async () => {

// First of all, the Express app is created and the store is attached to it.
// The store itself will define its endpoint using the Express `app` variable
  const app = express()
  JsonRestStores.requireStoresFromPath('./test/stores', app)
  const users = JsonRestStores.stores('1.0.0').users

// Some default values are added to the memory store. This is what will be
// returned when querying
  await users.implementInsert({ body: { name: 'Tony', surname: 'Mobily', id: 0 } })
  await users.implementInsert({ body: { name: 'Chiara', surname: 'Fabbietti', id: 1 } })
  await users.implementInsert({ body: { name: 'Julian', surname: 'Mobily', id: 2 } })
  await users.implementInsert({ body: { name: 'Reuben', surname: 'Mobily', id: 3 } })

  // The server is then created and run
  var server = http.createServer(app)
  server.listen({ port: 8080 })
}

run()
