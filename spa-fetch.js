// # Spa-fetch
//
// ## Avoid repeated identical fetch() calls in a short amount of time
//
// spa-fetch is a wrapper to Javascript's native `fetch()` call which will prevent multiple `fetch()` **GET** calls being made
// against the same URL in a short amount of time.
//
// It also provides hooks which will allow specific code to be run before and after each fetch call.
//
// ## Use cases
//
// You may have a SPA (Single Page Application) made up of fully decoupled components that use the browser
// location to load data. If two decoupled components are nested location-wise (e.g. one is `/users/:userId` and the other one
// is `/users/:userId/address/:addressId`), they may both attempt to make a request for `/users/10` (assuming that `userId` is 10)
// within a short amount of time.
//
// You may have an application that in which the user can trigger an HTTP GET call via UI, and want to make sure that each call
// behaves as if the server had responded, without overwhelming the server with requests.
//
// You may have an SPA and want to centralise the UI response for specific fetch errors. For example a 401 could trigger a
// dialog to re-login.
//
// ## Configuring the function
//
// spa-fetch can be configured by simply changing the exported object spaFetchConfig, defined like so:

export const spaFetchConfig = {
  cacheDuration: 1000,
  fetcher: null
}
const config = spaFetchConfig

// ## Creating a unique string out of `fetch()`'s parameters
//
// One of the main goals of this module is to cache HTTP GET requests. Therefore, the module must be able to tell whether two
// `fetch()` calls were made with the same parameters.
//
// This is normally achieved by creating a unique hash based on the passed parameters -- matching hashes will imply matching
// requests.
//
// Unfortunately, there is a considerable level of complication since `fetch()` can effectively be used in three
// different ways, each one requiring a different way of creating the hash.
//
// Consider that the parameters are `resource` and `init`, the parameters can be defined in three ways:
//
// * `resource` is a URL string, and `init` is an object with specific properties. In this case, the browser will create a `Request`
// object internally, based on the passed URL string and the `init` parameters. The parameters required by `Request`'s constructor
// match the ones in `fetch()`. This means that the browser, behind the scenes, will simply call `new Request(resource, init)` if
// `resource` is an URL string. In terms of creating the hash, this is the simplest case.
//
// * `resource` is a `Request` object. In this case, the browser will have no need to create a `Request` object, since the developer
// has one already created. In terms of creating the hash, this is a very difficult scenario since serialising a `Request` object needs
// to be done knowing exactly which properties are important. Things are complicated by the fact that the properties `body` and `headers`
// are special cases (`body` is exposed as a stream, and `headers` is a Map).
//
// * `resource` is a `Request` object, and `init` is an object. In this case, the browser will somehow create a new `Request` object using
// `resource` as a starting point, but with the properties in `init` applied to it too. This means that the `Request` object `resource` might
// have the `cache` property set as default. However, since `init` contains `{ cache: 'no-cache' }`, the final `Request` object will actually
// have `no-cache` set for the `cache` property -- basically, the `init` object has the last say.
//
// The hashing needs to work reliably for two requests with identical parameters even in cases where those parameters are
// set using different patterns seen above. For example, the hashes need to match for these two requests:
//
//     // `resource` is a URL string, and `init` is an object
//     const res1 = await spaFetch('http://www.google.com', { cache: 'reload', headers: { 'x-something': 10 } })
//
//     // `resource` is a Request object created with cache as `reload`, and then
//     // spaFetch called with `init` where cache is `reload`
//     const request2 = new Request('http://www.google.com', { cache: 'no-cache', headers: { 'x-something': 10 }})
//     const res2 = await spaFetch(request2, { cache: 'reload'})
//
// This is an extreme example, but it shows how `request2`'s property for `cache` is then overridden by the
// `prop` variable passed to `spaFetch`.
//
// The best way to have reliable comparisons is to always create a `Request` object (even when `spaFetch()` is called with `resource` being
// a URL string), and comparing the relevant properties from the newly created `Request` object.
//
// This is done in two blocks of code; they both aim at creating two variables `finalInit` and `finalUrl` which
// will be used to create the hash.
//
// Here is how it works:
//
function makeHash (resource, init) {
  //
  const finalInit = {}
  let finalUrl = ''
  let finalRequest

  const allowedInitProperties = ['method', 'mode', 'credentials', 'cache', 'redirect', 'referrer', 'integrity', 'headers']

// This is the full list of properties which make a request unique. Note that `body` is missing, since `spaFetch()` will only
// ever cache `GET` requests. (Luckily so: `body` is also defined as a stream in a `Request` object, and it would me difficult to
// serialise).
//
// The first case considered is where the `resource` parameter is a URL string, rather than a `Request`:

  /* FIRST PARAMETER IS A URL!    */
  /* ---------------------------- */
  if (!(resource instanceof Request)) {
    finalRequest = new Request(resource, init)
    for (const prop of allowedInitProperties) finalInit[prop] = finalRequest[prop]
    finalUrl = finalRequest.url

// This is the simple case. A new request is created, based on the `resource` (which is a URL string) and the `init` object.
// While this may seem wasteful, it will ensure that any kind of property normalisation carried out by the `Request` constuctor
// doesn't affect comparison.
// So, first a new request is created (in `finalRequest`). Then finalInit is created, by talking all of the allowed init
// properties over from the newly created `Request`. Finally, finalUrl is set, taken from the `url` property of the newly
// created request (`finalRequest.url`).
//
// A much more involved process is needed in case the `resource` parameter if an instance of `Request`:

    /* FIRST PARAMETER IS A REQUEST! */
    /* ----------------------------- */
  } else {
    const originalRequest = resource
    if (!init) {
      finalRequest = resource
      for (const prop of allowedInitProperties) finalInit[prop] = originalRequest[prop]
      finalUrl = finalRequest.url
    } else {
      const originalRequestInit = {}
      for (const prop of allowedInitProperties) originalRequestInit[prop] = originalRequest[prop]
      finalRequest = new Request(originalRequest.url, { ...originalRequestInit, ...init })
      for (const prop of allowedInitProperties) finalInit[prop] = finalRequest[prop]
      finalUrl = originalRequest.url
    }
  }

// In this case, there are two distinct possibilities: one where the `init` object is passed, and one where it's not.
//
// The first case is the easy one: the code is identical to the previous case, with the exception that the `Request` object
// doesn't need to be created (since it was passed).
// 
// The second case, where `init` was passed, is much more involved. The passed `Request` does _not_ have all of the properties
// needed, since there is a second `init` parameter that will affect those properties.
// The solution is to first create an `originalRequestInit` based on the original, passed `Request` object; then, another request
// called `finalRequest` is created, using the URL parameter from the original request, and -- as properties -- using the
// original `originalRequestInit` object mixed with the passed `init` object
// (That is, `new Request(originalRequest.url, { ...originalRequestInit, ...init })`). Finally, the `finalInit` variable is created
// based on the important properties of _that_ newly created request.
// 
// The browser is likely to do something very similar when is passed a `Request` object _and_ and `init` object to the `fetch()` function.
//
// At this stage, the two crucial variables `finalInit` and `finalUrl` are set.
// First of all, if the method is different to `GET` (in capital letters, as it was normalised by the browser itself), then the function
// will return an empty string. This will mean 'no caching':

  if (finalInit.method !== 'GET') return ''

// Also, any empty value is filtered out of `finalInit`:

  for (const k in finalInit) {
    if (typeof finalInit[k] === 'undefined') delete finalInit[k]
  }

// This is the function's home stretch. There is yet one last gotcha: the `headers` property behaves like a map, rather than like
// an object or an array. That `Object.fromEntries()` will ensure that it's converted into an object before running `canonicalize()` on it:

  finalInit.headers = canonicalize(Object.fromEntries(finalInit.headers))
  const items = canonicalize(finalInit)

// Thanks to `canonicalize()` (explained in the next paragraph), the `items` variable is an array. The last step is to add the URL to it,
// and return the `stringify()` version of it: the work is done.

  items.unshift(finalUrl + ' ')

  return JSON.stringify(items)
}

// The lines above use the `canonicalize()` function to convert a parameter into an array. The reason this happens, is to ensure that
// an object will be converted in such a way so that the result of `stringify()` will be the same regardless of the order the properties
// were defined in. The problem is that `JSON.stringify({a:10, b: 20})` returns something different to `JSON.stringify({b:20, a: 10})`.
//
// This function ensures that an object is converted into an array with properties sorted, which will ensure that `JSON.stringify()` will
// return the same value regardless of the order in which the properties were defined.
function canonicalize (obj) {
  if (typeof obj === 'object') {
    if (obj === null) return null
    const a = Object.entries(obj)
    return a.sort((a, b) => b[0].localeCompare(a[0]))
  }
  /* Not an object: return as is */
  return obj
}

// The implementation of `spaFetch()` can be broken down into several steps:
//
// * Create the hash of the call. This is done with the function makeHash seen above
// * Clean up the cache (stores in `spaFetch.cache`) of expired entries
// * Check if the item is already in the cache. If it is, return a clone of the response in the cache and end the process right there
// * Actually run `fetch()` with the passed parameters, and save the promise. If it's to be cached, cache it
// * Return a clone of the response
//
// Here is the code explained, step by step.
//
// First of all, the hash is created, as well as the `now` variable (which will be handy later)
export const spaFetch = async (resource, init = {}) => {
  const hash = makeHash(resource, init)
  const now = Date.now()

// This maintenance cycle is run every time `spaFetch()` is called. This could be done with a
// setTimeout(), but it's easier to do it each time to prevent build-ups.
  for (const [hash, value] of spaFetch.cache) {
    if (value.expires < now) {
      spaFetch.cache.delete(hash)
    }
  }

// If the entry is to be cached (meaning, `hash` is not empty), the code will look in the cache
// for it.
// **If present**, and it's not expired, then a new promise is returned. This part is critical: if the
// response were to be returned straight away, then any call to `await response.json()` to actually get
// the data _would only work the first time it's run_. This means that subsequent calls getting the
// response for the caches would be unable to use it for anything useful.
// This is why rather than returning the response, it returns a promise that will resolve with the
// _clone_ of the response returned by the fetch promise.
// So:
//
// * The cache always contains the `promise` returned by `fetch()`, stored as `fetchPromise`
// * When hitting the cache, what is actually returned is a promise that will call
//   `fetchPromise.then()` and, once it gets the reponse, it will `clone` it and return it
// * If there is an error, it will reject the promise with the same error.
//
// This means that the returned promise will work _exactly_ as the one returned by `fetch()` for
// all intents and purposes, with the difference that the `response` returned is a clone of the
// one in the cache.
// Here is the code:
  if (hash) {
    const cachedItem = spaFetch.cache.get(hash)

    if (cachedItem && cachedItem.expires >= now) {
      const responsePromise = new Promise((resolve, reject) => {
        cachedItem.fetchPromise.then(
          response => {
            const responseClone = response.clone()
            resolve(responseClone)
          },
          error => {
            reject(error)
          }
        )
      })
      return responsePromise
    }
  }

// If the call gets to this stage, it means that it _wasn't_ in the cache. This means that it will need
// to be called.
//
// Note that developers are able to change the module's configuration to use a different fetching function (which
// will be expected to return a `fetch()` promise)
  let fetchPromise
  if (config.fetcher) {
    fetchPromise = config.fetcher(resource, init)
  } else {
    fetchPromise = fetch(resource, init)
  }

// If the item is to be cached (see: `hash` is not empty), it will do so:
  if (hash) {
    spaFetch.cache.set(hash, { fetchPromise, expires: now + config.cacheDuration })
  }

// Even if the cache was empty, it's still _paramount_ to return a proxy promise (as explained above) rather than
// the original `fetch()` promise, in order to prevent the case where `await response.json()` is called -- and the cached
// value is rendered useless.
  return new Promise((resolve, reject) => {
    fetchPromise.then(
      response => {
        const responseClone = response.clone()
        resolve(responseClone)
      },
      error => {
        reject(error)
      }
    )
  })
}

// The cache is a property of the `spaFetch()` function. This helps with testing
spaFetch.cache = new Map()

// # Conclusions
//
// Writing this module had two distinct challenges. The first one, was the creation of a hash function that
// _really_ worked regardless of the way `fetch()` was used. The second one, was to return a promise
// that worked _exactly_ like `fetch()`, although only one actual call was made.
//
// The end result is something that can facilitate the creation of decoupled components which might end up making
// the exact same network request at the same time.
//
// Note: there is a [code review](https://codereview.stackexchange.com/questions/274119/configuration-of-an-es6-module-that-provides-a-fetch-temporary-cache)
// happening. Also, this module is the result of [this StackOverflow question](https://stackoverflow.com/questions/70342607/global-memoizing-fetch-to-prevent-multiple-of-the-same-request)