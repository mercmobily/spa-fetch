// # Location-based record loading

/*
  TODO:
  * Make nice web site for the data loader
  * Write the full globalFetch
  * Make the mixins for data loading and using globalFetch
*/

//
// All Single Page Applications need to handle their routing. This means that for example when viewing a contact,
// the page is supposed to have, in the Location bar, all of the information it needs to load that contact's record. 
// For example, viewing /users/10 is enough to tell the client side to show the information about
// the user with ID 10. Viewing /users should display all users as a list; /users/10/addresses should display all addresses
// belonging to user with ID 10; /users/10/addresses/20 should display the address with ID 20, owned by the user with ID 10.
// This code assumes that each type of datum (users, addresses, etc.) will have an endpoint, and that each endpoint provides
// a way to get a specific ID (e.g. /users/10) and to get a list of records (e.g. /users or /addresses). They are called "stores" in
// the code, since they are endpoints that store data. The code also expects the endpoint to following the same name convention
// as the URL -- so, for example viewing /users/10 in the Single Page Application will run a GET request on the URL
// /users/10; or, if viewing the page /users/10/addresses/20, it will make two requests, /users/10 and /addresses/20 (unless
// pre-loading was used -- more on this later).
//
// The end goal of the code is to run `fetch()` calls, and fill in the object `loadedElementData` with the loaded data in
// as properties with the suffix `Record`. For example:
//
// * loading the page /users/10 in an SPA, assuming a page path of /users/:userId should result in the `loadedData` object 
//   containing `{ userIdRecord: { id: 10, name: ..., ... } }`;
//
// * loading the page `/users/10/address/20` assuming a page path of /users/:userId/addresses/:addressId should result
// in the `loadedData` object containing `{ userIdRecord: { id: 10, name: '..., ... }, addressIdRecord: { id: 20, ... } }` 
//
// ## Minimising requests
//
// There is a case to be made, however, where loading /addresses/20 will return a record which _already includes_ all the data you
// would possibly need for the _user_ with ID 10, as long as the address record follows an established naming convention.
//
// For example, loading /addresses/20 might return a record that includes the key `userIdRecord` (`{ userIdRecord: {id: 2, ...}}`) 
// If that is the case, _then_ call /users/1 would be a very expensive waste of resources (bandwidth, server power, DB requests,
// and so on). If loading /addresses/20 returns a record which will include the property `userIdRecord`, then the second
// request would be wasteful, and won't be carried out. Note that queries should be carried out in reverse order, so that
// if the page `/users/10/address/20` is visited, the address record will be loaded first, and then the user record. This
// is because the last record is likely to be more specific than the previous ones -- and possibly already contain the
// parents' records.
//
// ## Making requests 
//
// It is also assumed that a page might need more data from more stores than the ones used in in the page's URL.
// For example, the application's URL might be /carModels/:carModelId; however, the page might want to _also_ display
// information about the car _maker_ for that model. 
// In this case, the element will have a dataUrl like this /carMakers/:carMakerId/carModels/:carModelId whereas the page's URL 
// (just /carModels/:carModelId) will only provide enough information for one store call to carModels. Note that 
// in most cases page URL and data URL will be the same; however, there are case like this one where a page's URL is 
// shorter than the data URL. For example, an element could be used in two different paths, one specific one matching
// the data URL, and one less specific one shorter than the page URL.
//
// This case is also covered: the code will load /carModels, and then look for any sign of a property called carMakerId 
// in the returned record. If present (e.g. ` { ... carMakerId: 50 }`), it will "fill in the void": it will load
// /carMakers/50 hence providing data to the element (unless the record also returns `carMakersRecord`, in which case
// loading would be unnecessary, as explained in the previous section).
//
// Remember that if the data URL is `/carMakers/:carMakerId/carModels/:carModelId`, the code will expect to need two
// calls: one on the `carModels` store, and one to the `carMakers` store, in that order (last to first).
//
// For example if a user visits /carModels/2, the code will scan the data URL (`/carMakers/:carMakerId/carModels/:carModelId`)
// and will start from `carModels/:carModelId` (the last store/id pair): it will load it by querying the server for 
// `/carModels/2`). If the returned record has `{ id: 2, name: "Model 3", carMakerId: 10 }`, since the data URL has an
// ID (`:carModelId`) that matches the record's property (`carModelId`), the code will know that to complete loading
// (that is, to load `/carMakers/:carMakerId`) it should use the ID `10` (`/carMakers/10`) to complete loading.
//
// As explained above, if the record returned by /carModels _also_ contains makerIdRecord, the second call will NOT be
// made at all: makerIdRecord will be assigned directly to loadedElementData without making a further request. This allows
// further optimisation of network traffic.
//
// ## Aggressive or non-aggressive requests
//
// An element URL like this: /carMakers/:carMakerId/carModels/:carModelId facing a request like
// carMakers/10/carModels/20  will trigger a fetch call on carModels/20; the received record is then checked: does it contain
// a field called `carMakersRecord`? If so, a call to /carMakers/ will NOT be carried out, since it will be superfluous (the
// data has already been received from the server and it's assumed to be correct).
//
// However, there are some cases where it's _known_ that /carModels  will _not_ return carMakerIdRecord. In 
// this case, it's ideal to enable _aggressive loading_, where the two requests (/carMakers/10 and carModels/20) are
// run concurrently. Without aggressive loading, even thought a car model does NOT return any information about the car
// maker, the request to the carMaker would only happen once the first request to carModel has completed.
//
// ## Lists
//
// When visiting a page such as `/users/10/addresses` (with URL template /users/:userId/addresses), the expected result is a
// list of addresses. Assuming that the element has a dataUrl that matches the page URL, this code will first resolve the
// single-records (in this case, it will request `/user/10` to the server); it will then query the server for the
// addresses with adequate filtering; so, the endpoint will be `/addresses?userId=10`).
//
// # The code
//
// The function that does the magic is this one:

export async function loader (dataUrl = '', routingData = {}, isList = false, elementData, config) {
  const dataUrlInfo = makeUpDataUrlInfo (dataUrl, routingData, isList)

  return loadData (dataUrlInfo, dataUrl, routingData, isList, elementData, config)
}


// The parameters for the `loader()` function are:
// * `dataUrl` - the data URL that will spell out, in URL format, the store and ID fields to load. For example,
//    it could be `/users/:userId/address/:addressId`. It is likely match the element's routing URL, although it may not
// * `routingData` - the data taken from the page's URL. This will come from the router, which will get the
//    window's location and extrapolate a key/value hash. The page URL might be the same as the data URL
//    (for example the page URL might also be `/users/:userId/address/:addressId`, resulting in `{ users: 10, address: 20}`)
//    or it might be shorter (`/address/:addressId`, resulting in `{ address: 20}`). In those cases where the
//    `routingData` is missing IDs, this code will try and look for `userId` in the loaded records (for example
//    it will look for the property `userId` in the loaded address) 
//  * `isList` - a flag that, if true, indicates that the last part of the data URL is the name of a store which
//    will be queried without an ID, and therefore expecting to receive an array. For example the data URL
//    `/users/:userId/address/` can be used to fetch all the addresses associated to the user, with
//    the query `GET /addresses?userId=XX`. The code will throw an error if this flag is true and the last part if
//    the data URL a `:something` rather than a clear store name. 
//  * `elementData` - the object which _might_ contain properties with preloaded data. For example for a data URL
//    like `/users/:userId/address/:addressId`, if the elementData object already contains the
//    properties `userIdRecord` and `addressIdRecord`, then nothing will be loaded. This is useful in the context
//    of `elementData` being the HTML custom element displaying the information, and having properties set.
//  * `config` - an object with further configuration parameters:
//    * `storeUrlPrefix`. The prefix used to make GET calls to the store.
//    * `fetchUrlMofifier`. A function that can be used to change the store's URL in whichever way necessary
//      to comply to the server. It receives as parameters `url`, `store`, `nakedStoreUrl`, `idParamValue`,
//      `searchParams` and `dataUrlInfo`
//    * `aggressiveLoading`. A flag that will enable aggressive loading (more requests, and less chance to minimise
//      the number of requests)
//    * `fetch`. The function used to fetch. Must have the exact same signature as `window.fetch()`
//    * `verbose`. If true, it will print information to the console.
//
// The `loader` function works in two steps.
//
// ## First step: create `dataUrlInfo`
//
// The first step passes the first three parameters passed to `loader()` (`dataUrl`, `routingData` and `isList`) to the
// function `makeUpDataUrlInfo()`, which returns a `dataUrlInfo` object.
//
// The `dataUrlInfo` variable is the result of the result of the analisys the data URL and the routing data, so that
// information about the data URL is available as data rather than a string. 
//
// The end result has the following properties:
//
//  * `store2IdParams` - a hash used throughout the code to lookup which idParam
//    is used for a particular store. For example for the URL /users/:userId/addresses/:addressId,
//    store2IdParams.addresses === 'addressId' (meaning that the store 'addresses' will lookup data
//    using the address `addressId)
//  * idParamsValues - an object with the values of each idParams, taken from `routingData`. If the element's URL is
//    the same  as the data URL, then it will be identical to routingData. However, if the data URL has more information,
//    (for example the page's URL is `addresses/:addressId` and the page's URL is `/users/:userId/addresses/:addressId`,
//    `isParamsValues` will have two properties: `addressId` (containing the ID of the address, taken from the page's URL) and
//    `userId` (set to null). More commonly, they will differ if the URL uses a different naming convention for stores.
//    For example the data URL could be `/users/:userId/addresses/:addressId` whereas the page URL might be
//    `/u/:userId/addr/:addressId`.   
//  * `listStore`. If isList is true, it will contain the name of the list store (for example 'addresses'
//    when the data URL is `/users/:userId/addresses` 
//  * listFilter - an object with keys/values which by default will correspond ot the values in idParamsValue.
//    If you have a store with dataPath `/users/:userId/addresses`, the system will load the user `userId` from the store
//    `users` (that is, `/users/1`) and will also query the `addresses` store without passing an ID (`GET /addresses`)
//    whicn will return an array of addresses. However, since the user `1` is being viewed, it can be
//    assumed that only the addresses for that user will be relevant. So, the query will actually me `GET /addresses?userId=1`.
//    There is a specific variable for `listFilter` because the callack `fetchUrlModifier()` might change the listFilter
//    without changing `idParamsValues`
// 
// Note that in a URL stores cannot be repeated, whereas paramIds can. So theoretically a data URL could be
// something like `/users/:userId/usersExtra/:userId/addresses/:addressId`. To cycle through the data URL, the
// code will commonly do this:
//
//     for (let store in resolvedIdParamsValues) { 
//       const idParam = store2IdParams[store]
//
// This effectively will go through the stores/idParams pairs.
//
// ## Second step: actually loading data (if necessary) via `loadData()`
//
// The second step passes the newly obtained `dataUrlInfo` object, as well as all of the parameters of the `loader()` function,
// to the `loadData()` function, which will do the actual loading (sending `fetch()` requests to the server and storing
// the results).
//
// The ultimate goal of the `loader()` function is to return an object with the following properties:
//   * loadedElementData. The actual loaded data.
//   * resolvedIdParamsValues - the 'resolved' version of idParamsValues. The variable paramsValues might be incomplete if
//     for example the page URL is /addresses/:addressid whereas the store data URL is /users/:userId/addresses/:addressid.
//     In this case the code will load /addresses/10 and then look in the record for an `userId` property. So, idParamsValues
//     will be { userId: 10 } whereas resolvedIdParamsValues will be (for example) `{ userId: 10, addressId: 20 }`.
//   * resolvedListFilter - the 'resolved' version of listFilter. The same logic as `resolvedIdParamsValues` applies.
//
// Here is the code to make all of this happen.
//
// # The function `makeUpDataUrlInfo()`
//
// This function is very straightforward. It will go through the process of splitting the dataUrl variable into
// tokens separated by '/' (the URL separator), and return the dataUrlInfo object which includes idParamsValues, 
// `store2IdParams` and (for lists) `listStore` and `listFilter`. 
//
// Here is the function, which is rather straightforward:

 function makeUpDataUrlInfo (dataUrl, routingData = {}, isList) {
  const tokens  = dataUrl.split('/').filter(s => s)

  /* For lists, the last part must not be a `:` */
  /* since a list request must end with a store */
  if (tokens[tokens.length - 1][0] === ':' && isList) {
    throw new Error('In list stores, the last part of the URL must not start with ":"')
  }
  
  let previousPartIsAStore = false
  let store = null
  let idParamsValues = {}
  let listFilter = {}
  let store2IdParams = {}
  for (let i = 0, l = tokens.length; i < l; i++) {

    let t = tokens[i]
    if (t[0] !== ':') {
      store = t
      previousPartIsAStore = true
      continue
    }
    
    if (t[0] === ':') {
      let idParam = t.substring(1)

      /* Sanity check in the URL. You can't write something like /something/:someId/:someOtherId */
      if (!previousPartIsAStore) throw new Error(`Part ${idParam[0]} doesn't have a corresponding store in url ${dataUrl}`)

      let idParamValue = routingData[idParam] || null
      
      /* Assign the main variables */
      idParamsValues[store] = idParamValue
      store2IdParams[store] = idParam

      /* If it's a list, add the item to the query string */
      if (isList) {
        listFilter[idParam] = idParamValue
      }
    }

  }

  /* At this stage, `store` will be the last store encountered. So, for lists it will be */
  /* the actual list store (since the URL always must end with the list store*/

  const result = {
    idParamsValues,
    store2IdParams,
    listStore: isList ? store : null,
    listFilter: isList ? listFilter : null,      
  }
  
  return result
}

// At this stage ome information might still be partial. For example, potentially some parmaIds might be
// essentially missing (if the page URL is smaller than the data URL, for example).
//
// # The function `loadData()`
//
// This function will load the data in the most intelligent way possible.
// In a perfect world, the data URL and the page path are the same (e.g. `/users/:userId/address/:addressId`). However,
// things don't always work out this way. For example page path could be `/addresses/:addressId`, _without_ including
// the userId.
// 
// When reading this code, remember that _the ultimate goal of this function is to add properties to the `loadedElementData`
// object. The name of the properties will match the idParams names, followed by the word
// `Record`. For example the data URL `/users/:userId/address/:addressId` will need to ensure that the properties
// `userIdRecord` and `addressIdRecord` are added to  the `loadedElementData` object -- unless they are already
// present in the `elementData` record.
// 
// In the case above, if `userIdRecord` and `addressIdRecord` are _already_ defined in `elementData`, then _nothing_
// should be loaded.
//
// At the same time, if the page path actually is `/addresses/:addressId` and the data URL is
// `/users/:userId/address/:addressId`, then it will be necessary work out the userId "somehow".
//
// For example if the page /addresses/10 is visited, the data URL `/users/:userId/address/:addressId` will imply
// the fetching of the address with ID 10, and then the fetching of the user with a not-yet-specified ID. So, where does
// the user ID actually come from? What will happen is that the address with ID 10 will be fetched, and if the record has a
// property called `userId`, that will be taken as the correct value for the `fetch` call in the `users` store.
// As explained already several times, if the property `userIdRecord` is already present in the newly loaded address record,
// then loading will be skipped for the user record.
// If no userId property can be found in the address object, the load will fail.
//
// Note that dataUrl and routingData are technically unnecessary to this function; they are passed here
// for consistency and readability of the code.
//
// Here is the function.
async function loadData (dataUrlInfo, dataUrl, routingData, isList, elementData, config) {

// First of all, the configuration values are turned into shorter variable
  const storeUrlPrefix = config.storeUrlPrefix
  const fetchUrlModifier = config.fetchUrlModifier
  const aggressiveLoading = !!config.aggressiveLoading
  const fetch = config.fetch || window.fetch

// The hash store2IdParams is also turned into something shorter, since it will be used a lot in the following ode 
  const store2IdParams = dataUrlInfo.store2IdParams

// The following three variables are really important in this code, because they will be the actual final output
// of this function. The main one is obviously `loadedElementData`, the object with the actual data. The function
// also returns `resolvedIParamsValues` and `resolvedListFilter`, which are "completed" versions of their
// counterparts `idParamValues` and `listFilter`, which can be incomplete in case the page URL doesn't include all of the
// IDs for the data URL. the "resolved" versions will include all of the IDs, including the newly found one.
  const loadedElementData = {}
  const resolvedIdParamsValues = { ...dataUrlInfo.idParamsValues }
  const resolvedListFilter = { ...dataUrlInfo.listFilter }  

// To load all of the records, this function essentually works as an endless while loop, which
// breaks once either all of the data is actually loaded, or if there isn't enough
// information to actually complete loading all required data.
//
// Within the `while` loop, there is a `for` loop where the data URL's parameters are taken in reverse order.
// Note that this loop will be potentially iterated several times.
//
// Each iteration of the loop can be seen as an attempt to add something to add to the loading queue (`toLoad`); anything in
// the loading queue will be loaded immediately after the end of the `for` cycle. As long as _something_ is loaded, a new
// `for` cycle is restarted again thanks to the endless `while` loop.
// 
// Very importantly, when something is loaded the record is analysed, effectively looking for paramIds that were
// potentially still missing in the `resolvedIdParamsValues` hash. 
// 
// The `while` loop will break free in two cases.
//
//   (1) the `for` cycle didn't add anything in the loading queue _and_ there were unresolved idParams; this is the
//   unwanted case:  an error will be thrown since the function was unsuccessful for lack of IDs
//
//   (2) the `for` cycle didn't add anything in the loading queue _and_ there were _no_ unresolved idParams; this is the
//   successful case: everything was loaded, and a `break` statement will break out of the endless `while` loop.
//
// For clarity, here are some example cases.
// 
// ## Case 1
// _In this case, data URL is `/users/:userId/addresses/:addressId` and the page URL is `/addresses/:addressId` and the
// address record includes `userId`. Location is assumed to be `/users/10/addresses/20`_
//
// When the `while` loop starts, `resolvedIdParamsValues` is `{ addressId: 20, userId: null }` and `loadedElementData` is `{}`.
// The for cycle starts: the first key is `addressId` (the last one). Since the value is not null (in fact, it's 20).
// The first value considered is `addressId`, which has a value of 20. Since `loadedElementData` doesn't include a
// property `addressIdRecord` (yet), `toLoad` array will have one entry added (to load the address). And since
// aggressive loading is off, only one entry will be added in the `for` cycle -- which breaks away.
// 
// Once out, there is one entry to load: the promise is resolved, the loading of the address record actually happens.
// Once loaded, the full record is added to `loadedElementData` (with key `addressIdRecord`).
// The record is then analysed: does it contain a known `idParam`? As it turns out, it does: the record
// has `{ userId: 10, addressLine1: ..., ...}`. So, the known `idParam` is added to `resolveIdParamsValue` (with key
// `addressId`).
// 
// The endless `while` cycle will start again. However, this time `resolvedIdParamsValues` is 
// `{ addresses: 20, users: 10 }` and `loadedElementData` is `{ addressIdRecord: { userId: 10, ... } }`.
// The first value considered is `addressId`, value `20`. Since there is _already_ a key `addressIdRecord` in
// `loadedElementData`, the value is essentially skipped with a `continue` statement.
// The next value considered is `userId`, value `10` (which came from the addressId object, when it was loaded).
// Since `loadedElementData` doesn't include a
// property `userIdRecord` (yet), `toLoad` array will have one entry added (to load the user). And since
// aggressive loading is off, only one entry will be added in the `for` cycle -- which breaks away.
// 
// Once out, there is one entry to load: the promise is resolved, the loading of the user record actually happens, at
// which point the returned record is analysed: does it contain a known `idParam`? It doesn't, so nothing happens.
// 
// The endless `while` cycle will start again. `resolvedIdParamsValues` is still `{ addresses: 20, useres: 10 }`,
// but `loadedElementData` includes the `userIdRecord` property `{ addressIdRecord: { userId: 10, ... }, userIdRecord: { ... } }`.
// 
// This means that both `idParams` will effectively skip. At the end of the cycle, the `toLoad` array will be empty, _and_
// the flag `nullAndUnloadedPresent` will be false: this is the cue to break the not-so-endless `while` cycle.
// 
// Loading was successful.
// 
// ## Case 2
// _In this case, data URL is `/users/:userId/addresses/:addressId` and the page URL is `/addresses/:addressId` but the
// address record does _not_ include `userId`. Location is assumed to be `/users/10/addresses/20`_
//
// When the `while` loop starts, `resolvedIdParamsValues` is `{ addressId: 20, userId: null }` and `loadedElementData` is `{}`.
// The for cycle starts: the first key is `addressId` (the last one). Since the value is not null (in fact, it's 20).
// The first value considered is `addressId`, which has a value of 20. Since `loadedElementData` doesn't include a
// property `addressIdRecord` (yet), `toLoad` array will have one entry added (to load the address). And since
// aggressive loading is off, only one entry will be added in the `for` cycle -- which breaks away.
// 
// Once out, there is one entry to load: the promise is resolved, the loading of the address record actually happens.
// Once loaded, the full record is added to `loadedElementData` (with key `addressIdRecord`).
// The record is then analysed: does it contain a known `idParam`? The answer is no; the `resolveIdParamsValue`
// is left unchanged.
// 
// The endless `while` cycle will start again. The `resolvedIdParamsValues` variable is still 
// `{ addresses: 20, users: null }` and `loadedElementData` is `{ addressIdRecord: { userId: 10, ... } }`.
// The first value considered is `addressId`, value `20`. Since there is _already_ a key `addressIdRecord` in
// `loadedElementData`, the value is essentially skipped with a `continue` statement.
// The next value considered is `userId`, value `null` -- which sets the `nullAndUnloadedPresent` variable to `true`.
//  
// At the end of the cycle, the `toLoad` array will be empty, _and_
// the flag `nullAndUnloadedPresent` will be `true`: this is the cue that there isn't enough data to complete the loading. 
// 
// Loading was not successful.
// 
// ## The actual code
// The code starts with the endless `while` cycle described above. `alreadylookedInto` is a hash that will prevent
// analysing a record twice. `nullAndUnloadedPresent` and `toLoad` are variables that will change in the `for` cycle.

  const alreadylookedInto = {}
  let totalLoads = 0
  while (true) { 
    let nullAndUnloadedPresent = false
    const toLoad = []

// The for cycle will go through the keys of `resolvedIdParamsValues`, to attempt the load. 

    for (const store of Object.keys(resolvedIdParamsValues).reverse()) {
      const idParam =  store2IdParams[store]

// If there is already a ...Record property in the [loaded]ElementData object, it means that data is already available,
// So, this idParam will be skipped, and the function will progress towards the desirerable outcome of nothing to load
// with no idParam set to null.
//
// The function `lookIntoRecord()` will make sure that any idParams in the record is added to the `resolvedIdParams` hash.
// The `lookIntoRecord` will make sure that any missing idParams in resolvedIdParamsValues are filled in by the record; the
// `alreadylookedInto` hash makes sure that it only happens once per store.

      const record = elementData[`${idParam}Record`] || loadedElementData[`${idParam}Record`]
      
      if (record) { 
        if (!alreadylookedInto[`${idParam}Record`]) {
          lookIntoRecord(record, elementData, loadedElementData, resolvedIdParamsValues, resolvedListFilter, store2IdParams, isList, store)
          alreadylookedInto[`${idParam}Record`] = true
        }
        continue
      }
      
// If resolvedIdParamsValues is null, then the flag `nullAndUnloadedPresent` is set to true and the cycle is interrupted
// (since it's impossible to load data without a valid ID).
// Setting the flag This is crucial since the undesirable result of "nothing to load" _and_ "some idParams are null"
// will throw an error later down the track.

      if (resolvedIdParamsValues[store] === null) {
        nullAndUnloadedPresent = true
        continue
      }

// At this stage, there is an idParam value and no data already loaded (otherwise, given the two previous
// ifs, the cycle would have `continue`d to the next iteration, searching for something to load).
//
// It's important to fully uderstand that:
//
// * The `for` cycle's job is to add promises to the `toLoad` array, where each promise will make one `fetch()` call
// * The number of promises depends on whether `aggressiveLoading` is set or not. If `aggressiveLoading` is _not_ set,
//   then only one promises will be added (the `for` cycle will encounter a `break` after the first promise is added).
// * At the end of the cycle, if `toLoad` has values, `Promise.all()` will be called on `toLoad`, so that all
//   promises are resolved
// * The `for` cycle will be repeated as many times as needed. Since each `for` iteration might possible uncover
//   more IDs and records, which will enable loading in the next `while` iteration.
//
// The promises added to `toLoad` are functions that will work out the load URL adding `storeUrlPrefix`, and then
// allow developers to change such url with the `fetchUrlModifier()` function. Crucially, once the data is loaded
// it will be added to the `loadedElementData` object (so, the parameter will be skipped in future iterations of the
// `for` cycle) _and_ the function `lookIntoRecord()` will be called, which will potentially add extra entries
// into `loadedElementData`, `resolvedIdParamsValues` and `resolvedListFilter` (depending of what's in the record).
// 
// So, first of all, since there is an `idParam` and the data is not preloaded, push the async loading function's
// _result_ (a promise) into the `toLoad` array (note: it won't be resolved, just added)

      toLoad.push(
        (async () => { 
          
          // Manipulate the fetch URL as needed. Note that the prefix is part of the
          // nakedStoreUrl
          let idParamValue = resolvedIdParamsValues[store]
          let nakedStoreUrl = `${storeUrlPrefix}/${store}`
          let url = `${nakedStoreUrl}/${idParamValue}`
          // console.log('loading URL:', url)
          if (typeof fetchUrlModifier === 'function') url = fetchUrlModifier(url, store, nakedStoreUrl, idParamValue, {}, dataUrlInfo)

          // Actually fetch the record
          if (config.verbose) console.log('FETCHING:', url)
          let response = await fetch(url)
          let record = await response.json()

          loadedElementData[`${idParam}Record`] = record

          if (!alreadylookedInto[`${idParam}Record`]) {
            lookIntoRecord(record, elementData, loadedElementData, resolvedIdParamsValues,  resolvedListFilter, store2IdParams, isList, store)
            alreadylookedInto[`${idParam}Record`] = true
          }
          return true
        })()
      )

        // Only allow pushing of more items here if aggressiveLoading is set.
        // If not, stop after adding one entry
        if (!aggressiveLoading) break     
    }

    // The `for` cycle has finished. The whole `for` cycle might well be repeated again; however, for now, this is
    // what can be loaded.
    //
    // If there is nothing to load, then it will be game over one way or another.
    // If `nullAndUnloadedPresent` is true, then it's the unwanted result: the data cannot be loaded, since IDs are
    // missing.
    // If `nullAndUnloadedPresent` is false, then it means loading is properly finished,

    if (!toLoad.length) {
      if (nullAndUnloadedPresent) {
        console.error('Data on loading:', {
          dataUrlInfo,
          loadedElementData,
          resolvedIdParamsValues,
          resolvedListFilter
        })
        throw new Error('Not enough information to resolve the URL: ')
      }
      /* Break the `while` cycle: loading of records is finished */ 
      break

    // If there is something to load, then yes, load it. This is done by `await`ing the promises in `toLoad`.
    } else {
      // Load all pending store stuff
      let p
      if (toLoad.length) p = await Promise.all(toLoad)
      totalLoads += toLoad.length
    }

    // This point demarks the end of the while cycle. If the code reaches this point,
    // it means that something was loaded, but more network calls are possibly
    // necessary to fetch all of the needed data.
    //
    // This can happen for example if an element with data path 
    // /users/:userId/addresses/:addressId is viewed in a page on route /addresses/:addressId -- in which
    // case `:userId` is NOT resolved from the routing, but it IS resolved once the address
    // information is loaded (assuming that addresse have a property called `userId`)
    //
    // The `for` cycle will restart, possibly adding promises to `toLoad`, and so on. 
  }


// There is a small, but ugly, possibility that even though all records were there, some Ids are
// still missing. This must not happen, as the viewing element will be unable to reload
// if needed. Do a check on that
  const idParamsMissing = Object.keys(resolvedIdParamsValues).filter(store => resolvedIdParamsValues[store] === null)
  if (idParamsMissing.length) {
    throw new Error(`Loading successful, but IDs missing for stores: ${idParamsMissing.join(', ')}`)
  }
  

  // Now that the loading is done, there is potentially one more thing to do: addresses.
  // For example assume that the page URL is actually `/users/:userId/addresses/:addressId/deliveries`
  //
  // Such a URL will imply that `deliveries` is a store from which the code is after a _list_ of
  // `deliveries` records. So, it will need to make one more `fetch` call _without_ specifying the ID
  // after `deliveries`.
  //
  // It will be potentially like this: `/users/10/addresses/20/deliveries`
  //
  // The same URL manipulation function is called, with `null` as `idParam` 
  if (isList) {
    
    /* Manipulate the fetch URL as needed. Note that the prefix is part of the nakedStoreUrl */
    let searchParams = new URLSearchParams(resolvedListFilter).toString()
    let nakedStoreUrl = `${storeUrlPrefix}/${dataUrlInfo.listStore}`
    let searchParamsAsString = searchParams ? '?' + searchParams : searchParams 
    let url = `${nakedStoreUrl}${searchParamsAsString}`
    if (typeof fetchUrlModifier === 'function') url = fetchUrlModifier(url, dataUrlInfo.listStore, nakedStoreUrl, null, searchParams, dataUrlInfo)

    /* Actually fetch the list */
    if (config.verbose) console.log('FETCHING:', url)
    const response = await fetch(url)
    loadedElementData[`${dataUrlInfo.listStore}List`] = await response.json() 
  }

  // The end result of ths function, as explained at the very beginning, is making network requests
  // and return the objects `loadedElementData`, `resolvedIdParamsValues` and `resolvedListFilter` (for lists).

  return {
    loadedElementData,
    resolvedIdParamsValues,
    resolvedListFilter: resolvedListFilter || null,
    totalLoads
  }
}

// Its job is to change loadedElementData, resolvedIdParamsValues, resolvedListFilter depending of the contents of
// `record`, `elementData` and `loadedElementData`. `store2IdParams`, `isList` and `store` are accessory information
// to make that possible.
//
// In detail:
// * `loadedElementData`. It looks for properties in the record with names matching the store name and `Record` (such
//    as `userIdRecord`). 
// * `resolvedIdParamsValues` and `resolvedListFilter`. It looks for properties in the record with names matching
//    idParams (such as `userId` in the address record), and uses it to fill in the blanks
// Rather than using recursion, the function analyses the passed `record`: if it finds propperties that represent
// other records, it will add those to the list of records to check and will continue the cycle.
//
function lookIntoRecord(record, elementData, loadedElementData, resolvedIdParamsValues, resolvedListFilter, store2IdParams, isList, store) {

  if (typeof record  !== 'object' ) return 

// The function works by unshifting elements from the `recordToCheck` array, which is primed to only contain
// the passed `record`.
  const recordsToCheck = []
  recordsToCheck.push(record)

// The cycle starts now: in the first iteration, the only element there is shifted out and `recordsToCheck` becomes
// empty.
  let r
  while (r = recordsToCheck.shift()) {

// Go through all stores again (that is, all keys of the `resolvedIdParamsValues` object) and look for information
// in the loaded record:
//
//   * idParamsValues that were missing from the URL, or
//   * `[...idParam...]Record` entries in the loadedElement structure)
//
// Assume that the data URL is like this: `/users/:userId/usersExtra/:userId/addresses/:addressId`, and the page URL is
// like this `/addresses/:addressId`, and fetching the address record returns a record that includes `userId`;  
// the cycle will go through each store/idParam values (`users/userId`, `usersExtra/userId` and `addresses/addressId`). 
// Since `resolvedIdParamsValues.users` and `resolvedIdParamsValues.usersExtra` are initally null (since the page URL
// doesn't include them), and since the record includes the matching idParam (`userId`), the idParam `userId` will be added
// to resolvedIdParamsValues for both `users` and `usersExtra`.

    for (let store in resolvedIdParamsValues) { 
      const idParam = store2IdParams[store]

// Look for missing store IDs in the loaded record
// If the loaded record has a paramIdValue that was missing (not present in routingData)
// it will most certainly be a valid idParams (which was missing in the URL in the first place)

      if (typeof r[idParam] !== 'undefined' && resolvedIdParamsValues[store] === null) {
        resolvedIdParamsValues[store] = r[idParam]
      }

// Look for a `[...idParam...]Record` entry in the loaded record. For example the record for the addresses
// store might contain the `userIdRecord` property, and -- since the URL includes 
// `/users/:userId/addresses/:addressId` -- it will be assumed to contain a valid record for the `users` store
// If that is the case, the property's content (supposed to be a full record object) will be assigned to
// `loadedElementData` object for that store straight away.
// 
// The property's content will _also_ ne added to the list of records to be checked, which will make this very
// while() cycle go for longer, since the statement `r = recordsToCheck.shift()` will return another record.

      const elementDataRecord = elementData[`${idParam}Record`] || loadedElementData[`${idParam}Record`]

      if (!elementDataRecord && typeof r[`${idParam}Record`]  !== 'undefined') {
        loadedElementData[`${idParam}Record`] = r[`${idParam}Record`]                  
        recordsToCheck.push(r[`${idParam}Record`])
      }

      // For lists, also try and resolve the list filter in case some
      // parameters are missing and are present in the loaded record
      if (isList) {
        if (resolvedListFilter[idParam] === null && typeof r[idParam] !== 'undefined') {
          resolvedListFilter[idParam] = r[idParam]
        }
      }
    }
  }
}

