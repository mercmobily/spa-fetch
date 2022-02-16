[![npm version][npm-image]][npm-url]
[![install size][install-size-image]][install-size-url]
# spa-fetch documentation

Visit the [full web site](https://mobily-enterprises.github.io/spa-fetch) with the full source code as literate code.

## Use as drop-in replacement of the native `fetch()`

The easiest and most basic use of spa-fetch is to simply import it 

````
import { spaFetch } from '@spa-fetch'

...
...
await function () {
  response = await spaFetch('/users/10')
  data = await response.json()

  console.log(data)
}
````

Note that if you make the same HTTP GET call twice within 1 second, the server will only he hit _once_. However, the data will be available for each call:


````
import { spaFetch } from '@spa-fetch'

...
...
await function () {
  response1 = await spaFetch('/users/10')
  response2 = await spaFetch('/users/10')
  
  data1 = await response1.json()
  data2 = await response2.json()

  console.log(data1)
  console.log(data2)
}
````

Caching will happen regardless of how `spaFetch()` is called: using a text URL or a `Request` object as first parameter, and whether `init` is passed as its second parameter. If two HTTP GET calls are equivalent, they will be cached.

## Configuring the module

spa-fetch esports a variable called `spaFetchConfig` that you can use to configure it.

The configuration properties are:

* `cacheDuration` -- defaults to 1000ms (1 second). Determines how long items are cached for
* `fetcher` -- defaults as null. If set, the passed function will be used to fetch, rather than `window.fetch()`

### Setting a specific duration for the cache

````
import { spaFetch, spaFetchConfig } from '@spa-fetch'

spaFetchConfig.cacheDuration = 200

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

...
...
await function () {
  response1 = await spaFetch('/users/10')
  await sleep(300)
  response2 = await spaFetch('/users/10') // This will trigger a second server call
  
  data1 = await response1.json()
  data2 = await response2.json()

  console.log(data1)
  console.log(data2)
}
````

Unlike the previous case, in this case _two_ calls will be made

### Setting an alternative fetch function

If you want to run specific operations before and after the fetch call, you can define an alternative `fetch()` function:

````
import { spaFetch, spaFetchConfig } from '@spa-fetch'

spaFetchConfig.fetcher = (resource, init) => {
  console.log('About to fetch...', resource)
  const p = fetch(resource, init)

  p.then(
    (response) => {
      console.log('The response is:', response)
    },
    (error) => {
      console.log('The error is:', error)
    }  
  )
  return p
}
````

This will ensure that specific code is run both before the actual `fetch()` is called, and once the response is received.

