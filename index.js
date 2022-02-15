/* TODO
  Make config object, exported, to set timeouts, prefixes, error handling,
  Write more tests running the server
  Make code literate
  Make decent web site
*/

export const config = {
  cacheDuration: 12000
}

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
      if (init.body) finalInit.body = init.body
    } else {
      for (const prop of allowedInitProperties) finalInit[prop] = originalRequest[prop]
      // NOTE: this will not catch request.body since at this stage it's already a stream/not
      // available because of https://bugs.chromium.org/p/chromium/issues/detail?id=969843
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
    finalInit.body = init.body
    finalUrl = finalRequest.url
  }

  // Add headers, canonalised
  finalInit.headers = canonicalize(finalInit.headers)
  finalInit.body = canonicalize(finalInit.body)

  for (const k in finalInit) {
    if (typeof finalInit[k] === 'undefined') delete finalInit[k]
  }
  // put properties in sorted order to make the hash canonical
  // the canonical sort is top level only,
  //    does not sort properties in nested objects
  const items = canonicalize(finalInit)

  // add URL on the front
  items.unshift(finalUrl + ' ')

  console.log('RETURNING', JSON.stringify(items))
  return JSON.stringify(items)
}

export const globalFetch = async (resource, init = {}) => {
  const key = makeHash(resource, init)
  const now = Date.now()

  // Clean up expired cached values
  for (const [key, value] of globalFetch.cache) {
    if (value.expires < now) {
      globalFetch.cache.delete(key)
    }
  }

  const cachedItem = globalFetch.cache.get(key)

  if (cachedItem && cachedItem.expires >= now) {
    const responsePromise = new Promise((resolve, reject) => {
      cachedItem.fetchPromise.then(
        response => { resolve(response.clone()) },
        error => { reject(error) }
      )
    })
    return responsePromise
  }

  const fetchPromise = fetch(resource, init)
  globalFetch.cache.set(key, { fetchPromise, expires: now + config.cacheDuration })

  return fetchPromise
}

// initalize cache
globalFetch.cache = new Map()
