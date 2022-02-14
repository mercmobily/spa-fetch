var JsonRestStores = require('jsonreststores')
var HTTPMixin = require('jsonreststores/http')
var Schema = require('simpleschema')
const MemoryMixin = require('jsonreststores/jsonreststores-mem.js')

class Store extends MemoryMixin(HTTPMixin(JsonRestStores)) {
  static get schema () {
      return new Schema({
      id: { type: 'id', searchable: true },
      name: { type: 'string', trim: 60 },
      surname: { type: 'string', searchable: true, trim: 60 }
      })
  }

  static get version () { return '1.0.0' }

  static get storeName () { return 'users' }
  static get publicURLprefix () { return '/stores' }
  static get publicURL () { return '/users/:id' }

  static get handlePut () { return true }
  static get handlePost () { return true }
  static get handleGet () { return true }
  static get handleGetQuery () { return true }
  static get handleDelete () { return true }
}
exports = module.exports = new Store()
