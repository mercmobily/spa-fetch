/* TODO
  Write more tests running the server
  Make code literate
  Make decent web site
*/

export const spaFetchConfig = {
  cacheDuration: 12000,
  fetcher: null
}

const config = spaFetchConfig

function canonicalize (obj) {
  if (!obj) return
  if (typeof obj === 'string') return obj
  const a = Object.entries(obj)
  return a.sort((a, b) => b[0].localeCompare(a[0]))
}

function makeHash (url, init) {
  //
  const finalInit = {}
  let finalUrl = ''
  let finalRequest

  const allowedInitProperties = ['method', 'mode', 'credentials', 'cache', 'redirect', 'referrer', 'integrity', 'headers']

  // FIRST PARAMETER IS A REQUEST!
  // ----------------------------
  if (url instanceof Request) {
    const originalRequest = url
    // If an init is specified, then make a new request with a mix of
    // the values from the original request, AND the extra init ones
    if (init) {
      const originalRequestInit = {}
      for (const prop of allowedInitProperties) originalRequestInit[prop] = originalRequest[prop]
      finalRequest = new Request(originalRequest.url, { ...originalRequestInit, ...init })
      for (const prop of allowedInitProperties) finalInit[prop] = finalRequest[prop]
    } else {
      for (const prop of allowedInitProperties) finalInit[prop] = originalRequest[prop]
      finalRequest = url
      // finalInit will stay as {}
    }
    finalUrl = originalRequest.url

    // FIRST PARAMETER IS A URL!
    // --------------------------------
    // It will make up a request with the same passed parameters, and will
    // make up finalInit with the corresponding properties
  } else {
    finalRequest = new Request(url, init)
    for (const prop of allowedInitProperties) finalInit[prop] = finalRequest[prop]
    finalUrl = finalRequest.url
  }

  // This will totally prevent caching
  // No point in doing anything else once the method is 100% worked out
  if (finalInit.method !== 'GET') return ''

  // Delete empty ones, if any
  for (const k in finalInit) {
    if (typeof finalInit[k] === 'undefined') delete finalInit[k]
  }

  // Put properties in sorted order to make the hash canonical
  // the canonical sort is top level only,
  finalInit.headers = canonicalize(finalInit.headers)
  const items = canonicalize(finalInit)

  // add URL on the front
  items.unshift(finalUrl + ' ')

  return JSON.stringify(items)
}

export const spaFetch = async (resource, init = {}) => {
  const key = makeHash(resource, init)
  const now = Date.now()

  // Clean up expired cached values
  for (const [key, value] of spaFetch.cache) {
    if (value.expires < now) {
      spaFetch.cache.delete(key)
    }
  }

  if (key) {
    const cachedItem = spaFetch.cache.get(key)

    if (cachedItem && cachedItem.expires >= now) {
      const responsePromise = new Promise((resolve, reject) => {
        cachedItem.fetchPromise.then(
          response => { resolve(response.clone()) },
          error => { reject(error) }
        )
      })
      return responsePromise
    }
  }

  let fetchPromise
  if (config.fetcher) {
    fetchPromise = config.fetcher(resource, init)
  } else {
    fetchPromise = fetch(resource, init)
  }

  if (key) {
    spaFetch.cache.set(key, { fetchPromise, expires: now + config.cacheDuration })
  }

  return fetchPromise
}

// initalize cache
spaFetch.cache = new Map()
