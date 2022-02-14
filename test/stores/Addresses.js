var JsonRestStores = require('jsonreststores')
var HTTPMixin = require('jsonreststores/http')
var Schema = require('simpleschema')
const MemoryMixin = require('jsonreststores/jsonreststores-mem.js')

class Store extends MemoryMixin(HTTPMixin(JsonRestStores)) {
  static get schema () {
      return new Schema({
        userId: { type: 'id', searchable: true },
        line1: { type: 'string', trim: 60 },
        line2: { type: 'string', trim: 60 },
        state: { type: 'string', searchable: true, trim: 60 },
        zip: { type: 'string', searchable: true, trim: 10 }
      })
  }

  static get version () { return '1.0.0' }

  static get storeName () { return 'addresses' }
  static get publicURLprefix () { return '/stores' }
  static get publicURL () { return '/addresses/:id' }

  static get handlePut () { return true }
  static get handlePost () { return true }
  static get handleGet () { return true }
  static get handleGetQuery () { return true }
  static get handleDelete () { return true }

  async transformResult(request, record, op) {
    // Enrich the record with the user information
    if (op === 'fetch') {
      const users = JsonRestStores.stores('1.0.0').users
      record.userIdRecord = await users.implementFetch( { params: { id: record.userId } })
   }
 }
}
exports = module.exports = new Store()
