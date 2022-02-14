/* TODO
  Make it work when `url` is a request object instead
  Understand if when URL is a request object, it's simply stringified or parameters are used too
  Make config object, exported, to set timeouts, prefixes, error handling,
  Write more tests running the server
*/

const makeHash = (url, obj) => {
    // put properties in sorted order to make the hash canonical
    // the canonical sort is top level only, 
    //    does not sort properties in nested objects
    let items = Object.entries(obj).sort((a, b) => b[0].localeCompare(a[0]));
    // add URL on the front
    items.unshift(url);
    return JSON.stringify(items);
}

export const globalFetch = async (resource, init = {}) => {
    const key = makeHash(resource, init);
    const now = Date.now();

    // Clean up expired cached values
    for (const [key, value] of globalFetch.cache) {
      if (value.expires < now) {
        globalFetch.cache.delete(key);
      }
    }

    const expirationDuration = 5 * 1000;
    const newExpiration = now + expirationDuration;

    const cachedItem = globalFetch.cache.get(key);
    // if we found an item and it expires in the future (not expired yet)
    if (cachedItem && cachedItem.expires >= now) {
        // update expiration time
        cachedItem.expires = newExpiration;
        return cachedItem.result.clone();
    }

    // couldn't use a value from the cache
    // make the request
    let p = fetch(resource, init);
    p.then(response => {
        if (!response.ok) {
            // if response not OK, remove it from the cache
            globalFetch.cache.delete(key);
        } else {
            globalFetch.cache.set(key, { result: response, expires: newExpiration });                
        }
    }, err => {
        // if promise rejected, remove it from the cache
        globalFetch.cache.delete(key);
    });
    // save this result (will replace any expired value already in the cache)
    globalFetch.cache.set(key, { result: p, expires: newExpiration });
    return p;
}

// initalize cache
globalFetch.cache = new Map();
