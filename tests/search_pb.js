/**
 * @fileoverview
 * @enhanceable
 * @public
 */
// GENERATED CODE -- DO NOT EDIT!

var jspb = require('google-protobuf');
var goog = jspb;
var global = Function('return this')();

goog.exportSymbol('proto.foo.Search2', null, global);
goog.exportSymbol('proto.foo.SearchRequest', null, global);

/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.foo.SearchRequest = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.foo.SearchRequest, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  proto.foo.SearchRequest.displayName = 'proto.foo.SearchRequest';
}


if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto suitable for use in Soy templates.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     com.google.apps.jspb.JsClassTemplate.JS_RESERVED_WORDS.
 * @param {boolean=} opt_includeInstance Whether to include the JSPB instance
 *     for transitional soy proto support: http://goto/soy-param-migration
 * @return {!Object}
 */
proto.foo.SearchRequest.prototype.toObject = function(opt_includeInstance) {
  return proto.foo.SearchRequest.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Whether to include the JSPB
 *     instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.foo.SearchRequest} msg The msg instance to transform.
 * @return {!Object}
 */
proto.foo.SearchRequest.toObject = function(includeInstance, msg) {
  var f, obj = {
    query: jspb.Message.getField(msg, 1),
    pageNumber: jspb.Message.getField(msg, 2),
    resultPerPage: jspb.Message.getField(msg, 3)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Creates a deep clone of this proto. No data is shared with the original.
 * @return {!proto.foo.SearchRequest} The clone.
 */
proto.foo.SearchRequest.prototype.cloneMessage = function() {
  return /** @type {!proto.foo.SearchRequest} */ (jspb.Message.cloneMessage(this));
};


/**
 * required string query = 1;
 * @return {string}
 */
proto.foo.SearchRequest.prototype.getQuery = function() {
  return /** @type {string} */ (!this.hasQuery() ? "" : jspb.Message.getField(this, 1));
};


/** @param {string|undefined} value  */
proto.foo.SearchRequest.prototype.setQuery = function(value) {
  jspb.Message.setField(this, 1, value);
};


proto.foo.SearchRequest.prototype.clearQuery = function() {
  jspb.Message.setField(this, 1, undefined);
};


/**
 * Returns whether this field is set.
 * @return{!boolean}
 */
proto.foo.SearchRequest.prototype.hasQuery = function() {
  return jspb.Message.getField(this, 1) != null;
};


/**
 * optional int32 page_number = 2;
 * @return {number}
 */
proto.foo.SearchRequest.prototype.getPageNumber = function() {
  return /** @type {number} */ (!this.hasPageNumber() ? 0 : jspb.Message.getField(this, 2));
};


/** @param {number?|undefined} value  */
proto.foo.SearchRequest.prototype.setPageNumber = function(value) {
  jspb.Message.setField(this, 2, value);
};


proto.foo.SearchRequest.prototype.clearPageNumber = function() {
  jspb.Message.setField(this, 2, undefined);
};


/**
 * Returns whether this field is set.
 * @return{!boolean}
 */
proto.foo.SearchRequest.prototype.hasPageNumber = function() {
  return jspb.Message.getField(this, 2) != null;
};


/**
 * optional int32 result_per_page = 3;
 * @return {number}
 */
proto.foo.SearchRequest.prototype.getResultPerPage = function() {
  return /** @type {number} */ (!this.hasResultPerPage() ? 0 : jspb.Message.getField(this, 3));
};


/** @param {number?|undefined} value  */
proto.foo.SearchRequest.prototype.setResultPerPage = function(value) {
  jspb.Message.setField(this, 3, value);
};


proto.foo.SearchRequest.prototype.clearResultPerPage = function() {
  jspb.Message.setField(this, 3, undefined);
};


/**
 * Returns whether this field is set.
 * @return{!boolean}
 */
proto.foo.SearchRequest.prototype.hasResultPerPage = function() {
  return jspb.Message.getField(this, 3) != null;
};



/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.foo.Search2 = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.foo.Search2, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  proto.foo.Search2.displayName = 'proto.foo.Search2';
}


if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto suitable for use in Soy templates.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     com.google.apps.jspb.JsClassTemplate.JS_RESERVED_WORDS.
 * @param {boolean=} opt_includeInstance Whether to include the JSPB instance
 *     for transitional soy proto support: http://goto/soy-param-migration
 * @return {!Object}
 */
proto.foo.Search2.prototype.toObject = function(opt_includeInstance) {
  return proto.foo.Search2.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Whether to include the JSPB
 *     instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.foo.Search2} msg The msg instance to transform.
 * @return {!Object}
 */
proto.foo.Search2.toObject = function(includeInstance, msg) {
  var f, obj = {
    query: jspb.Message.getField(msg, 5)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Creates a deep clone of this proto. No data is shared with the original.
 * @return {!proto.foo.Search2} The clone.
 */
proto.foo.Search2.prototype.cloneMessage = function() {
  return /** @type {!proto.foo.Search2} */ (jspb.Message.cloneMessage(this));
};


/**
 * required string query = 5;
 * @return {string}
 */
proto.foo.Search2.prototype.getQuery = function() {
  return /** @type {string} */ (!this.hasQuery() ? "" : jspb.Message.getField(this, 5));
};


/** @param {string|undefined} value  */
proto.foo.Search2.prototype.setQuery = function(value) {
  jspb.Message.setField(this, 5, value);
};


proto.foo.Search2.prototype.clearQuery = function() {
  jspb.Message.setField(this, 5, undefined);
};


/**
 * Returns whether this field is set.
 * @return{!boolean}
 */
proto.foo.Search2.prototype.hasQuery = function() {
  return jspb.Message.getField(this, 5) != null;
};


goog.object.extend(exports, proto.foo);