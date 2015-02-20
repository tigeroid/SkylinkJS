/*! skylinkjs - v0.5.7 - 2015-02-21 */

!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.io=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){

module.exports = _dereq_('./lib/');

},{"./lib/":2}],2:[function(_dereq_,module,exports){

/**
 * Module dependencies.
 */

var url = _dereq_('./url');
var parser = _dereq_('socket.io-parser');
var Manager = _dereq_('./manager');
var debug = _dereq_('debug')('socket.io-client');

/**
 * Module exports.
 */

module.exports = exports = lookup;

/**
 * Managers cache.
 */

var cache = exports.managers = {};

/**
 * Looks up an existing `Manager` for multiplexing.
 * If the user summons:
 *
 *   `io('http://localhost/a');`
 *   `io('http://localhost/b');`
 *
 * We reuse the existing instance based on same scheme/port/host,
 * and we initialize sockets for each namespace.
 *
 * @api public
 */

function lookup(uri, opts) {
  if (typeof uri == 'object') {
    opts = uri;
    uri = undefined;
  }

  opts = opts || {};

  var parsed = url(uri);
  var source = parsed.source;
  var id = parsed.id;
  var io;

  if (opts.forceNew || opts['force new connection'] || false === opts.multiplex) {
    debug('ignoring socket cache for %s', source);
    io = Manager(source, opts);
  } else {
    if (!cache[id]) {
      debug('new io instance for %s', source);
      cache[id] = Manager(source, opts);
    }
    io = cache[id];
  }

  return io.socket(parsed.path);
}

/**
 * Protocol version.
 *
 * @api public
 */

exports.protocol = parser.protocol;

/**
 * `connect`.
 *
 * @param {String} uri
 * @api public
 */

exports.connect = lookup;

/**
 * Expose constructors for standalone build.
 *
 * @api public
 */

exports.Manager = _dereq_('./manager');
exports.Socket = _dereq_('./socket');

},{"./manager":3,"./socket":5,"./url":6,"debug":9,"socket.io-parser":43}],3:[function(_dereq_,module,exports){

/**
 * Module dependencies.
 */

var url = _dereq_('./url');
var eio = _dereq_('engine.io-client');
var Socket = _dereq_('./socket');
var Emitter = _dereq_('component-emitter');
var parser = _dereq_('socket.io-parser');
var on = _dereq_('./on');
var bind = _dereq_('component-bind');
var object = _dereq_('object-component');
var debug = _dereq_('debug')('socket.io-client:manager');
var indexOf = _dereq_('indexof');

/**
 * Module exports
 */

module.exports = Manager;

/**
 * `Manager` constructor.
 *
 * @param {String} engine instance or engine uri/opts
 * @param {Object} options
 * @api public
 */

function Manager(uri, opts){
  if (!(this instanceof Manager)) return new Manager(uri, opts);
  if (uri && ('object' == typeof uri)) {
    opts = uri;
    uri = undefined;
  }
  opts = opts || {};

  opts.path = opts.path || '/socket.io';
  this.nsps = {};
  this.subs = [];
  this.opts = opts;
  this.reconnection(opts.reconnection !== false);
  this.reconnectionAttempts(opts.reconnectionAttempts || Infinity);
  this.reconnectionDelay(opts.reconnectionDelay || 1000);
  this.reconnectionDelayMax(opts.reconnectionDelayMax || 5000);
  this.timeout(null == opts.timeout ? 20000 : opts.timeout);
  this.readyState = 'closed';
  this.uri = uri;
  this.connected = [];
  this.attempts = 0;
  this.encoding = false;
  this.packetBuffer = [];
  this.encoder = new parser.Encoder();
  this.decoder = new parser.Decoder();
  this.autoConnect = opts.autoConnect !== false;
  if (this.autoConnect) this.open();
}

/**
 * Propagate given event to sockets and emit on `this`
 *
 * @api private
 */

Manager.prototype.emitAll = function() {
  this.emit.apply(this, arguments);
  for (var nsp in this.nsps) {
    this.nsps[nsp].emit.apply(this.nsps[nsp], arguments);
  }
};

/**
 * Mix in `Emitter`.
 */

Emitter(Manager.prototype);

/**
 * Sets the `reconnection` config.
 *
 * @param {Boolean} true/false if it should automatically reconnect
 * @return {Manager} self or value
 * @api public
 */

Manager.prototype.reconnection = function(v){
  if (!arguments.length) return this._reconnection;
  this._reconnection = !!v;
  return this;
};

/**
 * Sets the reconnection attempts config.
 *
 * @param {Number} max reconnection attempts before giving up
 * @return {Manager} self or value
 * @api public
 */

Manager.prototype.reconnectionAttempts = function(v){
  if (!arguments.length) return this._reconnectionAttempts;
  this._reconnectionAttempts = v;
  return this;
};

/**
 * Sets the delay between reconnections.
 *
 * @param {Number} delay
 * @return {Manager} self or value
 * @api public
 */

Manager.prototype.reconnectionDelay = function(v){
  if (!arguments.length) return this._reconnectionDelay;
  this._reconnectionDelay = v;
  return this;
};

/**
 * Sets the maximum delay between reconnections.
 *
 * @param {Number} delay
 * @return {Manager} self or value
 * @api public
 */

Manager.prototype.reconnectionDelayMax = function(v){
  if (!arguments.length) return this._reconnectionDelayMax;
  this._reconnectionDelayMax = v;
  return this;
};

/**
 * Sets the connection timeout. `false` to disable
 *
 * @return {Manager} self or value
 * @api public
 */

Manager.prototype.timeout = function(v){
  if (!arguments.length) return this._timeout;
  this._timeout = v;
  return this;
};

/**
 * Starts trying to reconnect if reconnection is enabled and we have not
 * started reconnecting yet
 *
 * @api private
 */

Manager.prototype.maybeReconnectOnOpen = function() {
  // Only try to reconnect if it's the first time we're connecting
  if (!this.openReconnect && !this.reconnecting && this._reconnection && this.attempts === 0) {
    // keeps reconnection from firing twice for the same reconnection loop
    this.openReconnect = true;
    this.reconnect();
  }
};


/**
 * Sets the current transport `socket`.
 *
 * @param {Function} optional, callback
 * @return {Manager} self
 * @api public
 */

Manager.prototype.open =
Manager.prototype.connect = function(fn){
  debug('readyState %s', this.readyState);
  if (~this.readyState.indexOf('open')) return this;

  debug('opening %s', this.uri);
  this.engine = eio(this.uri, this.opts);
  var socket = this.engine;
  var self = this;
  this.readyState = 'opening';
  this.skipReconnect = false;

  // emit `open`
  var openSub = on(socket, 'open', function() {
    self.onopen();
    fn && fn();
  });

  // emit `connect_error`
  var errorSub = on(socket, 'error', function(data){
    debug('connect_error');
    self.cleanup();
    self.readyState = 'closed';
    self.emitAll('connect_error', data);
    if (fn) {
      var err = new Error('Connection error');
      err.data = data;
      fn(err);
    }

    self.maybeReconnectOnOpen();
  });

  // emit `connect_timeout`
  if (false !== this._timeout) {
    var timeout = this._timeout;
    debug('connect attempt will timeout after %d', timeout);

    // set timer
    var timer = setTimeout(function(){
      debug('connect attempt timed out after %d', timeout);
      openSub.destroy();
      socket.close();
      socket.emit('error', 'timeout');
      self.emitAll('connect_timeout', timeout);
    }, timeout);

    this.subs.push({
      destroy: function(){
        clearTimeout(timer);
      }
    });
  }

  this.subs.push(openSub);
  this.subs.push(errorSub);

  return this;
};

/**
 * Called upon transport open.
 *
 * @api private
 */

Manager.prototype.onopen = function(){
  debug('open');

  // clear old subs
  this.cleanup();

  // mark as open
  this.readyState = 'open';
  this.emit('open');

  // add new subs
  var socket = this.engine;
  this.subs.push(on(socket, 'data', bind(this, 'ondata')));
  this.subs.push(on(this.decoder, 'decoded', bind(this, 'ondecoded')));
  this.subs.push(on(socket, 'error', bind(this, 'onerror')));
  this.subs.push(on(socket, 'close', bind(this, 'onclose')));
};

/**
 * Called with data.
 *
 * @api private
 */

Manager.prototype.ondata = function(data){
  this.decoder.add(data);
};

/**
 * Called when parser fully decodes a packet.
 *
 * @api private
 */

Manager.prototype.ondecoded = function(packet) {
  this.emit('packet', packet);
};

/**
 * Called upon socket error.
 *
 * @api private
 */

Manager.prototype.onerror = function(err){
  debug('error', err);
  this.emitAll('error', err);
};

/**
 * Creates a new socket for the given `nsp`.
 *
 * @return {Socket}
 * @api public
 */

Manager.prototype.socket = function(nsp){
  var socket = this.nsps[nsp];
  if (!socket) {
    socket = new Socket(this, nsp);
    this.nsps[nsp] = socket;
    var self = this;
    socket.on('connect', function(){
      if (!~indexOf(self.connected, socket)) {
        self.connected.push(socket);
      }
    });
  }
  return socket;
};

/**
 * Called upon a socket close.
 *
 * @param {Socket} socket
 */

Manager.prototype.destroy = function(socket){
  var index = indexOf(this.connected, socket);
  if (~index) this.connected.splice(index, 1);
  if (this.connected.length) return;

  this.close();
};

/**
 * Writes a packet.
 *
 * @param {Object} packet
 * @api private
 */

Manager.prototype.packet = function(packet){
  debug('writing packet %j', packet);
  var self = this;

  if (!self.encoding) {
    // encode, then write to engine with result
    self.encoding = true;
    this.encoder.encode(packet, function(encodedPackets) {
      for (var i = 0; i < encodedPackets.length; i++) {
        self.engine.write(encodedPackets[i]);
      }
      self.encoding = false;
      self.processPacketQueue();
    });
  } else { // add packet to the queue
    self.packetBuffer.push(packet);
  }
};

/**
 * If packet buffer is non-empty, begins encoding the
 * next packet in line.
 *
 * @api private
 */

Manager.prototype.processPacketQueue = function() {
  if (this.packetBuffer.length > 0 && !this.encoding) {
    var pack = this.packetBuffer.shift();
    this.packet(pack);
  }
};

/**
 * Clean up transport subscriptions and packet buffer.
 *
 * @api private
 */

Manager.prototype.cleanup = function(){
  var sub;
  while (sub = this.subs.shift()) sub.destroy();

  this.packetBuffer = [];
  this.encoding = false;

  this.decoder.destroy();
};

/**
 * Close the current socket.
 *
 * @api private
 */

Manager.prototype.close =
Manager.prototype.disconnect = function(){
  this.skipReconnect = true;
  this.readyState = 'closed';
  this.engine && this.engine.close();
};

/**
 * Called upon engine close.
 *
 * @api private
 */

Manager.prototype.onclose = function(reason){
  debug('close');
  this.cleanup();
  this.readyState = 'closed';
  this.emit('close', reason);
  if (this._reconnection && !this.skipReconnect) {
    this.reconnect();
  }
};

/**
 * Attempt a reconnection.
 *
 * @api private
 */

Manager.prototype.reconnect = function(){
  if (this.reconnecting || this.skipReconnect) return this;

  var self = this;
  this.attempts++;

  if (this.attempts > this._reconnectionAttempts) {
    debug('reconnect failed');
    this.emitAll('reconnect_failed');
    this.reconnecting = false;
  } else {
    var delay = this.attempts * this.reconnectionDelay();
    delay = Math.min(delay, this.reconnectionDelayMax());
    debug('will wait %dms before reconnect attempt', delay);

    this.reconnecting = true;
    var timer = setTimeout(function(){
      if (self.skipReconnect) return;

      debug('attempting reconnect');
      self.emitAll('reconnect_attempt', self.attempts);
      self.emitAll('reconnecting', self.attempts);

      // check again for the case socket closed in above events
      if (self.skipReconnect) return;

      self.open(function(err){
        if (err) {
          debug('reconnect attempt error');
          self.reconnecting = false;
          self.reconnect();
          self.emitAll('reconnect_error', err.data);
        } else {
          debug('reconnect success');
          self.onreconnect();
        }
      });
    }, delay);

    this.subs.push({
      destroy: function(){
        clearTimeout(timer);
      }
    });
  }
};

/**
 * Called upon successful reconnect.
 *
 * @api private
 */

Manager.prototype.onreconnect = function(){
  var attempt = this.attempts;
  this.attempts = 0;
  this.reconnecting = false;
  this.emitAll('reconnect', attempt);
};

},{"./on":4,"./socket":5,"./url":6,"component-bind":7,"component-emitter":8,"debug":9,"engine.io-client":10,"indexof":39,"object-component":40,"socket.io-parser":43}],4:[function(_dereq_,module,exports){

/**
 * Module exports.
 */

module.exports = on;

/**
 * Helper for subscriptions.
 *
 * @param {Object|EventEmitter} obj with `Emitter` mixin or `EventEmitter`
 * @param {String} event name
 * @param {Function} callback
 * @api public
 */

function on(obj, ev, fn) {
  obj.on(ev, fn);
  return {
    destroy: function(){
      obj.removeListener(ev, fn);
    }
  };
}

},{}],5:[function(_dereq_,module,exports){

/**
 * Module dependencies.
 */

var parser = _dereq_('socket.io-parser');
var Emitter = _dereq_('component-emitter');
var toArray = _dereq_('to-array');
var on = _dereq_('./on');
var bind = _dereq_('component-bind');
var debug = _dereq_('debug')('socket.io-client:socket');
var hasBin = _dereq_('has-binary');

/**
 * Module exports.
 */

module.exports = exports = Socket;

/**
 * Internal events (blacklisted).
 * These events can't be emitted by the user.
 *
 * @api private
 */

var events = {
  connect: 1,
  connect_error: 1,
  connect_timeout: 1,
  disconnect: 1,
  error: 1,
  reconnect: 1,
  reconnect_attempt: 1,
  reconnect_failed: 1,
  reconnect_error: 1,
  reconnecting: 1
};

/**
 * Shortcut to `Emitter#emit`.
 */

var emit = Emitter.prototype.emit;

/**
 * `Socket` constructor.
 *
 * @api public
 */

function Socket(io, nsp){
  this.io = io;
  this.nsp = nsp;
  this.json = this; // compat
  this.ids = 0;
  this.acks = {};
  if (this.io.autoConnect) this.open();
  this.receiveBuffer = [];
  this.sendBuffer = [];
  this.connected = false;
  this.disconnected = true;
}

/**
 * Mix in `Emitter`.
 */

Emitter(Socket.prototype);

/**
 * Subscribe to open, close and packet events
 *
 * @api private
 */

Socket.prototype.subEvents = function() {
  if (this.subs) return;

  var io = this.io;
  this.subs = [
    on(io, 'open', bind(this, 'onopen')),
    on(io, 'packet', bind(this, 'onpacket')),
    on(io, 'close', bind(this, 'onclose'))
  ];
};

/**
 * "Opens" the socket.
 *
 * @api public
 */

Socket.prototype.open =
Socket.prototype.connect = function(){
  if (this.connected) return this;

  this.subEvents();
  this.io.open(); // ensure open
  if ('open' == this.io.readyState) this.onopen();
  return this;
};

/**
 * Sends a `message` event.
 *
 * @return {Socket} self
 * @api public
 */

Socket.prototype.send = function(){
  var args = toArray(arguments);
  args.unshift('message');
  this.emit.apply(this, args);
  return this;
};

/**
 * Override `emit`.
 * If the event is in `events`, it's emitted normally.
 *
 * @param {String} event name
 * @return {Socket} self
 * @api public
 */

Socket.prototype.emit = function(ev){
  if (events.hasOwnProperty(ev)) {
    emit.apply(this, arguments);
    return this;
  }

  var args = toArray(arguments);
  var parserType = parser.EVENT; // default
  if (hasBin(args)) { parserType = parser.BINARY_EVENT; } // binary
  var packet = { type: parserType, data: args };

  // event ack callback
  if ('function' == typeof args[args.length - 1]) {
    debug('emitting packet with ack id %d', this.ids);
    this.acks[this.ids] = args.pop();
    packet.id = this.ids++;
  }

  if (this.connected) {
    this.packet(packet);
  } else {
    this.sendBuffer.push(packet);
  }

  return this;
};

/**
 * Sends a packet.
 *
 * @param {Object} packet
 * @api private
 */

Socket.prototype.packet = function(packet){
  packet.nsp = this.nsp;
  this.io.packet(packet);
};

/**
 * Called upon engine `open`.
 *
 * @api private
 */

Socket.prototype.onopen = function(){
  debug('transport is open - connecting');

  // write connect packet if necessary
  if ('/' != this.nsp) {
    this.packet({ type: parser.CONNECT });
  }
};

/**
 * Called upon engine `close`.
 *
 * @param {String} reason
 * @api private
 */

Socket.prototype.onclose = function(reason){
  debug('close (%s)', reason);
  this.connected = false;
  this.disconnected = true;
  this.emit('disconnect', reason);
};

/**
 * Called with socket packet.
 *
 * @param {Object} packet
 * @api private
 */

Socket.prototype.onpacket = function(packet){
  if (packet.nsp != this.nsp) return;

  switch (packet.type) {
    case parser.CONNECT:
      this.onconnect();
      break;

    case parser.EVENT:
      this.onevent(packet);
      break;

    case parser.BINARY_EVENT:
      this.onevent(packet);
      break;

    case parser.ACK:
      this.onack(packet);
      break;

    case parser.BINARY_ACK:
      this.onack(packet);
      break;

    case parser.DISCONNECT:
      this.ondisconnect();
      break;

    case parser.ERROR:
      this.emit('error', packet.data);
      break;
  }
};

/**
 * Called upon a server event.
 *
 * @param {Object} packet
 * @api private
 */

Socket.prototype.onevent = function(packet){
  var args = packet.data || [];
  debug('emitting event %j', args);

  if (null != packet.id) {
    debug('attaching ack callback to event');
    args.push(this.ack(packet.id));
  }

  if (this.connected) {
    emit.apply(this, args);
  } else {
    this.receiveBuffer.push(args);
  }
};

/**
 * Produces an ack callback to emit with an event.
 *
 * @api private
 */

Socket.prototype.ack = function(id){
  var self = this;
  var sent = false;
  return function(){
    // prevent double callbacks
    if (sent) return;
    sent = true;
    var args = toArray(arguments);
    debug('sending ack %j', args);

    var type = hasBin(args) ? parser.BINARY_ACK : parser.ACK;
    self.packet({
      type: type,
      id: id,
      data: args
    });
  };
};

/**
 * Called upon a server acknowlegement.
 *
 * @param {Object} packet
 * @api private
 */

Socket.prototype.onack = function(packet){
  debug('calling ack %s with %j', packet.id, packet.data);
  var fn = this.acks[packet.id];
  fn.apply(this, packet.data);
  delete this.acks[packet.id];
};

/**
 * Called upon server connect.
 *
 * @api private
 */

Socket.prototype.onconnect = function(){
  this.connected = true;
  this.disconnected = false;
  this.emit('connect');
  this.emitBuffered();
};

/**
 * Emit buffered events (received and emitted).
 *
 * @api private
 */

Socket.prototype.emitBuffered = function(){
  var i;
  for (i = 0; i < this.receiveBuffer.length; i++) {
    emit.apply(this, this.receiveBuffer[i]);
  }
  this.receiveBuffer = [];

  for (i = 0; i < this.sendBuffer.length; i++) {
    this.packet(this.sendBuffer[i]);
  }
  this.sendBuffer = [];
};

/**
 * Called upon server disconnect.
 *
 * @api private
 */

Socket.prototype.ondisconnect = function(){
  debug('server disconnect (%s)', this.nsp);
  this.destroy();
  this.onclose('io server disconnect');
};

/**
 * Called upon forced client/server side disconnections,
 * this method ensures the manager stops tracking us and
 * that reconnections don't get triggered for this.
 *
 * @api private.
 */

Socket.prototype.destroy = function(){
  if (this.subs) {
    // clean subscriptions to avoid reconnections
    for (var i = 0; i < this.subs.length; i++) {
      this.subs[i].destroy();
    }
    this.subs = null;
  }

  this.io.destroy(this);
};

/**
 * Disconnects the socket manually.
 *
 * @return {Socket} self
 * @api public
 */

Socket.prototype.close =
Socket.prototype.disconnect = function(){
  if (this.connected) {
    debug('performing disconnect (%s)', this.nsp);
    this.packet({ type: parser.DISCONNECT });
  }

  // remove socket from pool
  this.destroy();

  if (this.connected) {
    // fire events
    this.onclose('io client disconnect');
  }
  return this;
};

},{"./on":4,"component-bind":7,"component-emitter":8,"debug":9,"has-binary":35,"socket.io-parser":43,"to-array":47}],6:[function(_dereq_,module,exports){
(function (global){

/**
 * Module dependencies.
 */

var parseuri = _dereq_('parseuri');
var debug = _dereq_('debug')('socket.io-client:url');

/**
 * Module exports.
 */

module.exports = url;

/**
 * URL parser.
 *
 * @param {String} url
 * @param {Object} An object meant to mimic window.location.
 *                 Defaults to window.location.
 * @api public
 */

function url(uri, loc){
  var obj = uri;

  // default to window.location
  var loc = loc || global.location;
  if (null == uri) uri = loc.protocol + '//' + loc.hostname;

  // relative path support
  if ('string' == typeof uri) {
    if ('/' == uri.charAt(0)) {
      if ('/' == uri.charAt(1)) {
        uri = loc.protocol + uri;
      } else {
        uri = loc.hostname + uri;
      }
    }

    if (!/^(https?|wss?):\/\//.test(uri)) {
      debug('protocol-less url %s', uri);
      if ('undefined' != typeof loc) {
        uri = loc.protocol + '//' + uri;
      } else {
        uri = 'https://' + uri;
      }
    }

    // parse
    debug('parse %s', uri);
    obj = parseuri(uri);
  }

  // make sure we treat `localhost:80` and `localhost` equally
  if (!obj.port) {
    if (/^(http|ws)$/.test(obj.protocol)) {
      obj.port = '80';
    }
    else if (/^(http|ws)s$/.test(obj.protocol)) {
      obj.port = '443';
    }
  }

  obj.path = obj.path || '/';

  // define unique id
  obj.id = obj.protocol + '://' + obj.host + ':' + obj.port;
  // define href
  obj.href = obj.protocol + '://' + obj.host + (loc && loc.port == obj.port ? '' : (':' + obj.port));

  return obj;
}

}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"debug":9,"parseuri":41}],7:[function(_dereq_,module,exports){
/**
 * Slice reference.
 */

var slice = [].slice;

/**
 * Bind `obj` to `fn`.
 *
 * @param {Object} obj
 * @param {Function|String} fn or string
 * @return {Function}
 * @api public
 */

module.exports = function(obj, fn){
  if ('string' == typeof fn) fn = obj[fn];
  if ('function' != typeof fn) throw new Error('bind() requires a function');
  var args = slice.call(arguments, 2);
  return function(){
    return fn.apply(obj, args.concat(slice.call(arguments)));
  }
};

},{}],8:[function(_dereq_,module,exports){

/**
 * Expose `Emitter`.
 */

module.exports = Emitter;

/**
 * Initialize a new `Emitter`.
 *
 * @api public
 */

function Emitter(obj) {
  if (obj) return mixin(obj);
};

/**
 * Mixin the emitter properties.
 *
 * @param {Object} obj
 * @return {Object}
 * @api private
 */

function mixin(obj) {
  for (var key in Emitter.prototype) {
    obj[key] = Emitter.prototype[key];
  }
  return obj;
}

/**
 * Listen on the given `event` with `fn`.
 *
 * @param {String} event
 * @param {Function} fn
 * @return {Emitter}
 * @api public
 */

Emitter.prototype.on =
Emitter.prototype.addEventListener = function(event, fn){
  this._callbacks = this._callbacks || {};
  (this._callbacks[event] = this._callbacks[event] || [])
    .push(fn);
  return this;
};

/**
 * Adds an `event` listener that will be invoked a single
 * time then automatically removed.
 *
 * @param {String} event
 * @param {Function} fn
 * @return {Emitter}
 * @api public
 */

Emitter.prototype.once = function(event, fn){
  var self = this;
  this._callbacks = this._callbacks || {};

  function on() {
    self.off(event, on);
    fn.apply(this, arguments);
  }

  on.fn = fn;
  this.on(event, on);
  return this;
};

/**
 * Remove the given callback for `event` or all
 * registered callbacks.
 *
 * @param {String} event
 * @param {Function} fn
 * @return {Emitter}
 * @api public
 */

Emitter.prototype.off =
Emitter.prototype.removeListener =
Emitter.prototype.removeAllListeners =
Emitter.prototype.removeEventListener = function(event, fn){
  this._callbacks = this._callbacks || {};

  // all
  if (0 == arguments.length) {
    this._callbacks = {};
    return this;
  }

  // specific event
  var callbacks = this._callbacks[event];
  if (!callbacks) return this;

  // remove all handlers
  if (1 == arguments.length) {
    delete this._callbacks[event];
    return this;
  }

  // remove specific handler
  var cb;
  for (var i = 0; i < callbacks.length; i++) {
    cb = callbacks[i];
    if (cb === fn || cb.fn === fn) {
      callbacks.splice(i, 1);
      break;
    }
  }
  return this;
};

/**
 * Emit `event` with the given args.
 *
 * @param {String} event
 * @param {Mixed} ...
 * @return {Emitter}
 */

Emitter.prototype.emit = function(event){
  this._callbacks = this._callbacks || {};
  var args = [].slice.call(arguments, 1)
    , callbacks = this._callbacks[event];

  if (callbacks) {
    callbacks = callbacks.slice(0);
    for (var i = 0, len = callbacks.length; i < len; ++i) {
      callbacks[i].apply(this, args);
    }
  }

  return this;
};

/**
 * Return array of callbacks for `event`.
 *
 * @param {String} event
 * @return {Array}
 * @api public
 */

Emitter.prototype.listeners = function(event){
  this._callbacks = this._callbacks || {};
  return this._callbacks[event] || [];
};

/**
 * Check if this emitter has `event` handlers.
 *
 * @param {String} event
 * @return {Boolean}
 * @api public
 */

Emitter.prototype.hasListeners = function(event){
  return !! this.listeners(event).length;
};

},{}],9:[function(_dereq_,module,exports){

/**
 * Expose `debug()` as the module.
 */

module.exports = debug;

/**
 * Create a debugger with the given `name`.
 *
 * @param {String} name
 * @return {Type}
 * @api public
 */

function debug(name) {
  if (!debug.enabled(name)) return function(){};

  return function(fmt){
    fmt = coerce(fmt);

    var curr = new Date;
    var ms = curr - (debug[name] || curr);
    debug[name] = curr;

    fmt = name
      + ' '
      + fmt
      + ' +' + debug.humanize(ms);

    // This hackery is required for IE8
    // where `console.log` doesn't have 'apply'
    window.console
      && console.log
      && Function.prototype.apply.call(console.log, console, arguments);
  }
}

/**
 * The currently active debug mode names.
 */

debug.names = [];
debug.skips = [];

/**
 * Enables a debug mode by name. This can include modes
 * separated by a colon and wildcards.
 *
 * @param {String} name
 * @api public
 */

debug.enable = function(name) {
  try {
    localStorage.debug = name;
  } catch(e){}

  var split = (name || '').split(/[\s,]+/)
    , len = split.length;

  for (var i = 0; i < len; i++) {
    name = split[i].replace('*', '.*?');
    if (name[0] === '-') {
      debug.skips.push(new RegExp('^' + name.substr(1) + '$'));
    }
    else {
      debug.names.push(new RegExp('^' + name + '$'));
    }
  }
};

/**
 * Disable debug output.
 *
 * @api public
 */

debug.disable = function(){
  debug.enable('');
};

/**
 * Humanize the given `ms`.
 *
 * @param {Number} m
 * @return {String}
 * @api private
 */

debug.humanize = function(ms) {
  var sec = 1000
    , min = 60 * 1000
    , hour = 60 * min;

  if (ms >= hour) return (ms / hour).toFixed(1) + 'h';
  if (ms >= min) return (ms / min).toFixed(1) + 'm';
  if (ms >= sec) return (ms / sec | 0) + 's';
  return ms + 'ms';
};

/**
 * Returns true if the given mode name is enabled, false otherwise.
 *
 * @param {String} name
 * @return {Boolean}
 * @api public
 */

debug.enabled = function(name) {
  for (var i = 0, len = debug.skips.length; i < len; i++) {
    if (debug.skips[i].test(name)) {
      return false;
    }
  }
  for (var i = 0, len = debug.names.length; i < len; i++) {
    if (debug.names[i].test(name)) {
      return true;
    }
  }
  return false;
};

/**
 * Coerce `val`.
 */

function coerce(val) {
  if (val instanceof Error) return val.stack || val.message;
  return val;
}

// persist

try {
  if (window.localStorage) debug.enable(localStorage.debug);
} catch(e){}

},{}],10:[function(_dereq_,module,exports){

module.exports =  _dereq_('./lib/');

},{"./lib/":11}],11:[function(_dereq_,module,exports){

module.exports = _dereq_('./socket');

/**
 * Exports parser
 *
 * @api public
 *
 */
module.exports.parser = _dereq_('engine.io-parser');

},{"./socket":12,"engine.io-parser":24}],12:[function(_dereq_,module,exports){
(function (global){
/**
 * Module dependencies.
 */

var transports = _dereq_('./transports');
var Emitter = _dereq_('component-emitter');
var debug = _dereq_('debug')('engine.io-client:socket');
var index = _dereq_('indexof');
var parser = _dereq_('engine.io-parser');
var parseuri = _dereq_('parseuri');
var parsejson = _dereq_('parsejson');
var parseqs = _dereq_('parseqs');

/**
 * Module exports.
 */

module.exports = Socket;

/**
 * Noop function.
 *
 * @api private
 */

function noop(){}

/**
 * Socket constructor.
 *
 * @param {String|Object} uri or options
 * @param {Object} options
 * @api public
 */

function Socket(uri, opts){
  if (!(this instanceof Socket)) return new Socket(uri, opts);

  opts = opts || {};

  if (uri && 'object' == typeof uri) {
    opts = uri;
    uri = null;
  }

  if (uri) {
    uri = parseuri(uri);
    opts.host = uri.host;
    opts.secure = uri.protocol == 'https' || uri.protocol == 'wss';
    opts.port = uri.port;
    if (uri.query) opts.query = uri.query;
  }

  this.secure = null != opts.secure ? opts.secure :
    (global.location && 'https:' == location.protocol);

  if (opts.host) {
    var pieces = opts.host.split(':');
    opts.hostname = pieces.shift();
    if (pieces.length) opts.port = pieces.pop();
  }

  this.agent = opts.agent || false;
  this.hostname = opts.hostname ||
    (global.location ? location.hostname : 'localhost');
  this.port = opts.port || (global.location && location.port ?
       location.port :
       (this.secure ? 443 : 80));
  this.query = opts.query || {};
  if ('string' == typeof this.query) this.query = parseqs.decode(this.query);
  this.upgrade = false !== opts.upgrade;
  this.path = (opts.path || '/engine.io').replace(/\/$/, '') + '/';
  this.forceJSONP = !!opts.forceJSONP;
  this.jsonp = false !== opts.jsonp;
  this.forceBase64 = !!opts.forceBase64;
  this.enablesXDR = !!opts.enablesXDR;
  this.timestampParam = opts.timestampParam || 't';
  this.timestampRequests = opts.timestampRequests;
  this.transports = opts.transports || ['polling', 'websocket'];
  this.readyState = '';
  this.writeBuffer = [];
  this.callbackBuffer = [];
  this.policyPort = opts.policyPort || 843;
  this.rememberUpgrade = opts.rememberUpgrade || false;
  this.open();
  this.binaryType = null;
  this.onlyBinaryUpgrades = opts.onlyBinaryUpgrades;
}

Socket.priorWebsocketSuccess = false;

/**
 * Mix in `Emitter`.
 */

Emitter(Socket.prototype);

/**
 * Protocol version.
 *
 * @api public
 */

Socket.protocol = parser.protocol; // this is an int

/**
 * Expose deps for legacy compatibility
 * and standalone browser access.
 */

Socket.Socket = Socket;
Socket.Transport = _dereq_('./transport');
Socket.transports = _dereq_('./transports');
Socket.parser = _dereq_('engine.io-parser');

/**
 * Creates transport of the given type.
 *
 * @param {String} transport name
 * @return {Transport}
 * @api private
 */

Socket.prototype.createTransport = function (name) {
  debug('creating transport "%s"', name);
  var query = clone(this.query);

  // append engine.io protocol identifier
  query.EIO = parser.protocol;

  // transport name
  query.transport = name;

  // session id if we already have one
  if (this.id) query.sid = this.id;

  var transport = new transports[name]({
    agent: this.agent,
    hostname: this.hostname,
    port: this.port,
    secure: this.secure,
    path: this.path,
    query: query,
    forceJSONP: this.forceJSONP,
    jsonp: this.jsonp,
    forceBase64: this.forceBase64,
    enablesXDR: this.enablesXDR,
    timestampRequests: this.timestampRequests,
    timestampParam: this.timestampParam,
    policyPort: this.policyPort,
    socket: this
  });

  return transport;
};

function clone (obj) {
  var o = {};
  for (var i in obj) {
    if (obj.hasOwnProperty(i)) {
      o[i] = obj[i];
    }
  }
  return o;
}

/**
 * Initializes transport to use and starts probe.
 *
 * @api private
 */
Socket.prototype.open = function () {
  var transport;
  if (this.rememberUpgrade && Socket.priorWebsocketSuccess && this.transports.indexOf('websocket') != -1) {
    transport = 'websocket';
  } else if (0 == this.transports.length) {
    // Emit error on next tick so it can be listened to
    var self = this;
    setTimeout(function() {
      self.emit('error', 'No transports available');
    }, 0);
    return;
  } else {
    transport = this.transports[0];
  }
  this.readyState = 'opening';

  // Retry with the next transport if the transport is disabled (jsonp: false)
  var transport;
  try {
    transport = this.createTransport(transport);
  } catch (e) {
    this.transports.shift();
    this.open();
    return;
  }

  transport.open();
  this.setTransport(transport);
};

/**
 * Sets the current transport. Disables the existing one (if any).
 *
 * @api private
 */

Socket.prototype.setTransport = function(transport){
  debug('setting transport %s', transport.name);
  var self = this;

  if (this.transport) {
    debug('clearing existing transport %s', this.transport.name);
    this.transport.removeAllListeners();
  }

  // set up transport
  this.transport = transport;

  // set up transport listeners
  transport
  .on('drain', function(){
    self.onDrain();
  })
  .on('packet', function(packet){
    self.onPacket(packet);
  })
  .on('error', function(e){
    self.onError(e);
  })
  .on('close', function(){
    self.onClose('transport close');
  });
};

/**
 * Probes a transport.
 *
 * @param {String} transport name
 * @api private
 */

Socket.prototype.probe = function (name) {
  debug('probing transport "%s"', name);
  var transport = this.createTransport(name, { probe: 1 })
    , failed = false
    , self = this;

  Socket.priorWebsocketSuccess = false;

  function onTransportOpen(){
    if (self.onlyBinaryUpgrades) {
      var upgradeLosesBinary = !this.supportsBinary && self.transport.supportsBinary;
      failed = failed || upgradeLosesBinary;
    }
    if (failed) return;

    debug('probe transport "%s" opened', name);
    transport.send([{ type: 'ping', data: 'probe' }]);
    transport.once('packet', function (msg) {
      if (failed) return;
      if ('pong' == msg.type && 'probe' == msg.data) {
        debug('probe transport "%s" pong', name);
        self.upgrading = true;
        self.emit('upgrading', transport);
        if (!transport) return;
        Socket.priorWebsocketSuccess = 'websocket' == transport.name;

        debug('pausing current transport "%s"', self.transport.name);
        self.transport.pause(function () {
          if (failed) return;
          if ('closed' == self.readyState) return;
          debug('changing transport and sending upgrade packet');

          cleanup();

          self.setTransport(transport);
          transport.send([{ type: 'upgrade' }]);
          self.emit('upgrade', transport);
          transport = null;
          self.upgrading = false;
          self.flush();
        });
      } else {
        debug('probe transport "%s" failed', name);
        var err = new Error('probe error');
        err.transport = transport.name;
        self.emit('upgradeError', err);
      }
    });
  }

  function freezeTransport() {
    if (failed) return;

    // Any callback called by transport should be ignored since now
    failed = true;

    cleanup();

    transport.close();
    transport = null;
  }

  //Handle any error that happens while probing
  function onerror(err) {
    var error = new Error('probe error: ' + err);
    error.transport = transport.name;

    freezeTransport();

    debug('probe transport "%s" failed because of error: %s', name, err);

    self.emit('upgradeError', error);
  }

  function onTransportClose(){
    onerror("transport closed");
  }

  //When the socket is closed while we're probing
  function onclose(){
    onerror("socket closed");
  }

  //When the socket is upgraded while we're probing
  function onupgrade(to){
    if (transport && to.name != transport.name) {
      debug('"%s" works - aborting "%s"', to.name, transport.name);
      freezeTransport();
    }
  }

  //Remove all listeners on the transport and on self
  function cleanup(){
    transport.removeListener('open', onTransportOpen);
    transport.removeListener('error', onerror);
    transport.removeListener('close', onTransportClose);
    self.removeListener('close', onclose);
    self.removeListener('upgrading', onupgrade);
  }

  transport.once('open', onTransportOpen);
  transport.once('error', onerror);
  transport.once('close', onTransportClose);

  this.once('close', onclose);
  this.once('upgrading', onupgrade);

  transport.open();

};

/**
 * Called when connection is deemed open.
 *
 * @api public
 */

Socket.prototype.onOpen = function () {
  debug('socket open');
  this.readyState = 'open';
  Socket.priorWebsocketSuccess = 'websocket' == this.transport.name;
  this.emit('open');
  this.flush();

  // we check for `readyState` in case an `open`
  // listener already closed the socket
  if ('open' == this.readyState && this.upgrade && this.transport.pause) {
    debug('starting upgrade probes');
    for (var i = 0, l = this.upgrades.length; i < l; i++) {
      this.probe(this.upgrades[i]);
    }
  }
};

/**
 * Handles a packet.
 *
 * @api private
 */

Socket.prototype.onPacket = function (packet) {
  if ('opening' == this.readyState || 'open' == this.readyState) {
    debug('socket receive: type "%s", data "%s"', packet.type, packet.data);

    this.emit('packet', packet);

    // Socket is live - any packet counts
    this.emit('heartbeat');

    switch (packet.type) {
      case 'open':
        this.onHandshake(parsejson(packet.data));
        break;

      case 'pong':
        this.setPing();
        break;

      case 'error':
        var err = new Error('server error');
        err.code = packet.data;
        this.emit('error', err);
        break;

      case 'message':
        this.emit('data', packet.data);
        this.emit('message', packet.data);
        break;
    }
  } else {
    debug('packet received with socket readyState "%s"', this.readyState);
  }
};

/**
 * Called upon handshake completion.
 *
 * @param {Object} handshake obj
 * @api private
 */

Socket.prototype.onHandshake = function (data) {
  this.emit('handshake', data);
  this.id = data.sid;
  this.transport.query.sid = data.sid;
  this.upgrades = this.filterUpgrades(data.upgrades);
  this.pingInterval = data.pingInterval;
  this.pingTimeout = data.pingTimeout;
  this.onOpen();
  // In case open handler closes socket
  if  ('closed' == this.readyState) return;
  this.setPing();

  // Prolong liveness of socket on heartbeat
  this.removeListener('heartbeat', this.onHeartbeat);
  this.on('heartbeat', this.onHeartbeat);
};

/**
 * Resets ping timeout.
 *
 * @api private
 */

Socket.prototype.onHeartbeat = function (timeout) {
  clearTimeout(this.pingTimeoutTimer);
  var self = this;
  self.pingTimeoutTimer = setTimeout(function () {
    if ('closed' == self.readyState) return;
    self.onClose('ping timeout');
  }, timeout || (self.pingInterval + self.pingTimeout));
};

/**
 * Pings server every `this.pingInterval` and expects response
 * within `this.pingTimeout` or closes connection.
 *
 * @api private
 */

Socket.prototype.setPing = function () {
  var self = this;
  clearTimeout(self.pingIntervalTimer);
  self.pingIntervalTimer = setTimeout(function () {
    debug('writing ping packet - expecting pong within %sms', self.pingTimeout);
    self.ping();
    self.onHeartbeat(self.pingTimeout);
  }, self.pingInterval);
};

/**
* Sends a ping packet.
*
* @api public
*/

Socket.prototype.ping = function () {
  this.sendPacket('ping');
};

/**
 * Called on `drain` event
 *
 * @api private
 */

Socket.prototype.onDrain = function() {
  for (var i = 0; i < this.prevBufferLen; i++) {
    if (this.callbackBuffer[i]) {
      this.callbackBuffer[i]();
    }
  }

  this.writeBuffer.splice(0, this.prevBufferLen);
  this.callbackBuffer.splice(0, this.prevBufferLen);

  // setting prevBufferLen = 0 is very important
  // for example, when upgrading, upgrade packet is sent over,
  // and a nonzero prevBufferLen could cause problems on `drain`
  this.prevBufferLen = 0;

  if (this.writeBuffer.length == 0) {
    this.emit('drain');
  } else {
    this.flush();
  }
};

/**
 * Flush write buffers.
 *
 * @api private
 */

Socket.prototype.flush = function () {
  if ('closed' != this.readyState && this.transport.writable &&
    !this.upgrading && this.writeBuffer.length) {
    debug('flushing %d packets in socket', this.writeBuffer.length);
    this.transport.send(this.writeBuffer);
    // keep track of current length of writeBuffer
    // splice writeBuffer and callbackBuffer on `drain`
    this.prevBufferLen = this.writeBuffer.length;
    this.emit('flush');
  }
};

/**
 * Sends a message.
 *
 * @param {String} message.
 * @param {Function} callback function.
 * @return {Socket} for chaining.
 * @api public
 */

Socket.prototype.write =
Socket.prototype.send = function (msg, fn) {
  this.sendPacket('message', msg, fn);
  return this;
};

/**
 * Sends a packet.
 *
 * @param {String} packet type.
 * @param {String} data.
 * @param {Function} callback function.
 * @api private
 */

Socket.prototype.sendPacket = function (type, data, fn) {
  if ('closing' == this.readyState || 'closed' == this.readyState) {
    return;
  }

  var packet = { type: type, data: data };
  this.emit('packetCreate', packet);
  this.writeBuffer.push(packet);
  this.callbackBuffer.push(fn);
  this.flush();
};

/**
 * Closes the connection.
 *
 * @api private
 */

Socket.prototype.close = function () {
  if ('opening' == this.readyState || 'open' == this.readyState) {
    this.readyState = 'closing';

    var self = this;

    function close() {
      self.onClose('forced close');
      debug('socket closing - telling transport to close');
      self.transport.close();
    }

    function cleanupAndClose() {
      self.removeListener('upgrade', cleanupAndClose);
      self.removeListener('upgradeError', cleanupAndClose);
      close();
    }

    function waitForUpgrade() {
      // wait for upgrade to finish since we can't send packets while pausing a transport
      self.once('upgrade', cleanupAndClose);
      self.once('upgradeError', cleanupAndClose);
    }

    if (this.writeBuffer.length) {
      this.once('drain', function() {
        if (this.upgrading) {
          waitForUpgrade();
        } else {
          close();
        }
      });
    } else if (this.upgrading) {
      waitForUpgrade();
    } else {
      close();
    }
  }

  return this;
};

/**
 * Called upon transport error
 *
 * @api private
 */

Socket.prototype.onError = function (err) {
  debug('socket error %j', err);
  Socket.priorWebsocketSuccess = false;
  this.emit('error', err);
  this.onClose('transport error', err);
};

/**
 * Called upon transport close.
 *
 * @api private
 */

Socket.prototype.onClose = function (reason, desc) {
  if ('opening' == this.readyState || 'open' == this.readyState || 'closing' == this.readyState) {
    debug('socket close with reason: "%s"', reason);
    var self = this;

    // clear timers
    clearTimeout(this.pingIntervalTimer);
    clearTimeout(this.pingTimeoutTimer);

    // clean buffers in next tick, so developers can still
    // grab the buffers on `close` event
    setTimeout(function() {
      self.writeBuffer = [];
      self.callbackBuffer = [];
      self.prevBufferLen = 0;
    }, 0);

    // stop event from firing again for transport
    this.transport.removeAllListeners('close');

    // ensure transport won't stay open
    this.transport.close();

    // ignore further transport communication
    this.transport.removeAllListeners();

    // set ready state
    this.readyState = 'closed';

    // clear session id
    this.id = null;

    // emit close event
    this.emit('close', reason, desc);
  }
};

/**
 * Filters upgrades, returning only those matching client transports.
 *
 * @param {Array} server upgrades
 * @api private
 *
 */

Socket.prototype.filterUpgrades = function (upgrades) {
  var filteredUpgrades = [];
  for (var i = 0, j = upgrades.length; i<j; i++) {
    if (~index(this.transports, upgrades[i])) filteredUpgrades.push(upgrades[i]);
  }
  return filteredUpgrades;
};

}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./transport":13,"./transports":14,"component-emitter":8,"debug":21,"engine.io-parser":24,"indexof":39,"parsejson":31,"parseqs":32,"parseuri":33}],13:[function(_dereq_,module,exports){
/**
 * Module dependencies.
 */

var parser = _dereq_('engine.io-parser');
var Emitter = _dereq_('component-emitter');

/**
 * Module exports.
 */

module.exports = Transport;

/**
 * Transport abstract constructor.
 *
 * @param {Object} options.
 * @api private
 */

function Transport (opts) {
  this.path = opts.path;
  this.hostname = opts.hostname;
  this.port = opts.port;
  this.secure = opts.secure;
  this.query = opts.query;
  this.timestampParam = opts.timestampParam;
  this.timestampRequests = opts.timestampRequests;
  this.readyState = '';
  this.agent = opts.agent || false;
  this.socket = opts.socket;
  this.enablesXDR = opts.enablesXDR;
}

/**
 * Mix in `Emitter`.
 */

Emitter(Transport.prototype);

/**
 * A counter used to prevent collisions in the timestamps used
 * for cache busting.
 */

Transport.timestamps = 0;

/**
 * Emits an error.
 *
 * @param {String} str
 * @return {Transport} for chaining
 * @api public
 */

Transport.prototype.onError = function (msg, desc) {
  var err = new Error(msg);
  err.type = 'TransportError';
  err.description = desc;
  this.emit('error', err);
  return this;
};

/**
 * Opens the transport.
 *
 * @api public
 */

Transport.prototype.open = function () {
  if ('closed' == this.readyState || '' == this.readyState) {
    this.readyState = 'opening';
    this.doOpen();
  }

  return this;
};

/**
 * Closes the transport.
 *
 * @api private
 */

Transport.prototype.close = function () {
  if ('opening' == this.readyState || 'open' == this.readyState) {
    this.doClose();
    this.onClose();
  }

  return this;
};

/**
 * Sends multiple packets.
 *
 * @param {Array} packets
 * @api private
 */

Transport.prototype.send = function(packets){
  if ('open' == this.readyState) {
    this.write(packets);
  } else {
    throw new Error('Transport not open');
  }
};

/**
 * Called upon open
 *
 * @api private
 */

Transport.prototype.onOpen = function () {
  this.readyState = 'open';
  this.writable = true;
  this.emit('open');
};

/**
 * Called with data.
 *
 * @param {String} data
 * @api private
 */

Transport.prototype.onData = function(data){
  var packet = parser.decodePacket(data, this.socket.binaryType);
  this.onPacket(packet);
};

/**
 * Called with a decoded packet.
 */

Transport.prototype.onPacket = function (packet) {
  this.emit('packet', packet);
};

/**
 * Called upon close.
 *
 * @api private
 */

Transport.prototype.onClose = function () {
  this.readyState = 'closed';
  this.emit('close');
};

},{"component-emitter":8,"engine.io-parser":24}],14:[function(_dereq_,module,exports){
(function (global){
/**
 * Module dependencies
 */

var XMLHttpRequest = _dereq_('xmlhttprequest');
var XHR = _dereq_('./polling-xhr');
var JSONP = _dereq_('./polling-jsonp');
var websocket = _dereq_('./websocket');

/**
 * Export transports.
 */

exports.polling = polling;
exports.websocket = websocket;

/**
 * Polling transport polymorphic constructor.
 * Decides on xhr vs jsonp based on feature detection.
 *
 * @api private
 */

function polling(opts){
  var xhr;
  var xd = false;
  var xs = false;
  var jsonp = false !== opts.jsonp;

  if (global.location) {
    var isSSL = 'https:' == location.protocol;
    var port = location.port;

    // some user agents have empty `location.port`
    if (!port) {
      port = isSSL ? 443 : 80;
    }

    xd = opts.hostname != location.hostname || port != opts.port;
    xs = opts.secure != isSSL;
  }

  opts.xdomain = xd;
  opts.xscheme = xs;
  xhr = new XMLHttpRequest(opts);

  if ('open' in xhr && !opts.forceJSONP) {
    return new XHR(opts);
  } else {
    if (!jsonp) throw new Error('JSONP disabled');
    return new JSONP(opts);
  }
}

}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./polling-jsonp":15,"./polling-xhr":16,"./websocket":18,"xmlhttprequest":19}],15:[function(_dereq_,module,exports){
(function (global){

/**
 * Module requirements.
 */

var Polling = _dereq_('./polling');
var inherit = _dereq_('component-inherit');

/**
 * Module exports.
 */

module.exports = JSONPPolling;

/**
 * Cached regular expressions.
 */

var rNewline = /\n/g;
var rEscapedNewline = /\\n/g;

/**
 * Global JSONP callbacks.
 */

var callbacks;

/**
 * Callbacks count.
 */

var index = 0;

/**
 * Noop.
 */

function empty () { }

/**
 * JSONP Polling constructor.
 *
 * @param {Object} opts.
 * @api public
 */

function JSONPPolling (opts) {
  Polling.call(this, opts);

  this.query = this.query || {};

  // define global callbacks array if not present
  // we do this here (lazily) to avoid unneeded global pollution
  if (!callbacks) {
    // we need to consider multiple engines in the same page
    if (!global.___eio) global.___eio = [];
    callbacks = global.___eio;
  }

  // callback identifier
  this.index = callbacks.length;

  // add callback to jsonp global
  var self = this;
  callbacks.push(function (msg) {
    self.onData(msg);
  });

  // append to query string
  this.query.j = this.index;

  // prevent spurious errors from being emitted when the window is unloaded
  if (global.document && global.addEventListener) {
    global.addEventListener('beforeunload', function () {
      if (self.script) self.script.onerror = empty;
    }, false);
  }
}

/**
 * Inherits from Polling.
 */

inherit(JSONPPolling, Polling);

/*
 * JSONP only supports binary as base64 encoded strings
 */

JSONPPolling.prototype.supportsBinary = false;

/**
 * Closes the socket.
 *
 * @api private
 */

JSONPPolling.prototype.doClose = function () {
  if (this.script) {
    this.script.parentNode.removeChild(this.script);
    this.script = null;
  }

  if (this.form) {
    this.form.parentNode.removeChild(this.form);
    this.form = null;
    this.iframe = null;
  }

  Polling.prototype.doClose.call(this);
};

/**
 * Starts a poll cycle.
 *
 * @api private
 */

JSONPPolling.prototype.doPoll = function () {
  var self = this;
  var script = document.createElement('script');

  if (this.script) {
    this.script.parentNode.removeChild(this.script);
    this.script = null;
  }

  script.async = true;
  script.src = this.uri();
  script.onerror = function(e){
    self.onError('jsonp poll error',e);
  };

  var insertAt = document.getElementsByTagName('script')[0];
  insertAt.parentNode.insertBefore(script, insertAt);
  this.script = script;

  var isUAgecko = 'undefined' != typeof navigator && /gecko/i.test(navigator.userAgent);
  
  if (isUAgecko) {
    setTimeout(function () {
      var iframe = document.createElement('iframe');
      document.body.appendChild(iframe);
      document.body.removeChild(iframe);
    }, 100);
  }
};

/**
 * Writes with a hidden iframe.
 *
 * @param {String} data to send
 * @param {Function} called upon flush.
 * @api private
 */

JSONPPolling.prototype.doWrite = function (data, fn) {
  var self = this;

  if (!this.form) {
    var form = document.createElement('form');
    var area = document.createElement('textarea');
    var id = this.iframeId = 'eio_iframe_' + this.index;
    var iframe;

    form.className = 'socketio';
    form.style.position = 'absolute';
    form.style.top = '-1000px';
    form.style.left = '-1000px';
    form.target = id;
    form.method = 'POST';
    form.setAttribute('accept-charset', 'utf-8');
    area.name = 'd';
    form.appendChild(area);
    document.body.appendChild(form);

    this.form = form;
    this.area = area;
  }

  this.form.action = this.uri();

  function complete () {
    initIframe();
    fn();
  }

  function initIframe () {
    if (self.iframe) {
      try {
        self.form.removeChild(self.iframe);
      } catch (e) {
        self.onError('jsonp polling iframe removal error', e);
      }
    }

    try {
      // ie6 dynamic iframes with target="" support (thanks Chris Lambacher)
      var html = '<iframe src="javascript:0" name="'+ self.iframeId +'">';
      iframe = document.createElement(html);
    } catch (e) {
      iframe = document.createElement('iframe');
      iframe.name = self.iframeId;
      iframe.src = 'javascript:0';
    }

    iframe.id = self.iframeId;

    self.form.appendChild(iframe);
    self.iframe = iframe;
  }

  initIframe();

  // escape \n to prevent it from being converted into \r\n by some UAs
  // double escaping is required for escaped new lines because unescaping of new lines can be done safely on server-side
  data = data.replace(rEscapedNewline, '\\\n');
  this.area.value = data.replace(rNewline, '\\n');

  try {
    this.form.submit();
  } catch(e) {}

  if (this.iframe.attachEvent) {
    this.iframe.onreadystatechange = function(){
      if (self.iframe.readyState == 'complete') {
        complete();
      }
    };
  } else {
    this.iframe.onload = complete;
  }
};

}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./polling":17,"component-inherit":20}],16:[function(_dereq_,module,exports){
(function (global){
/**
 * Module requirements.
 */

var XMLHttpRequest = _dereq_('xmlhttprequest');
var Polling = _dereq_('./polling');
var Emitter = _dereq_('component-emitter');
var inherit = _dereq_('component-inherit');
var debug = _dereq_('debug')('engine.io-client:polling-xhr');

/**
 * Module exports.
 */

module.exports = XHR;
module.exports.Request = Request;

/**
 * Empty function
 */

function empty(){}

/**
 * XHR Polling constructor.
 *
 * @param {Object} opts
 * @api public
 */

function XHR(opts){
  Polling.call(this, opts);

  if (global.location) {
    var isSSL = 'https:' == location.protocol;
    var port = location.port;

    // some user agents have empty `location.port`
    if (!port) {
      port = isSSL ? 443 : 80;
    }

    this.xd = opts.hostname != global.location.hostname ||
      port != opts.port;
    this.xs = opts.secure != isSSL;
  }
}

/**
 * Inherits from Polling.
 */

inherit(XHR, Polling);

/**
 * XHR supports binary
 */

XHR.prototype.supportsBinary = true;

/**
 * Creates a request.
 *
 * @param {String} method
 * @api private
 */

XHR.prototype.request = function(opts){
  opts = opts || {};
  opts.uri = this.uri();
  opts.xd = this.xd;
  opts.xs = this.xs;
  opts.agent = this.agent || false;
  opts.supportsBinary = this.supportsBinary;
  opts.enablesXDR = this.enablesXDR;
  return new Request(opts);
};

/**
 * Sends data.
 *
 * @param {String} data to send.
 * @param {Function} called upon flush.
 * @api private
 */

XHR.prototype.doWrite = function(data, fn){
  var isBinary = typeof data !== 'string' && data !== undefined;
  var req = this.request({ method: 'POST', data: data, isBinary: isBinary });
  var self = this;
  req.on('success', fn);
  req.on('error', function(err){
    self.onError('xhr post error', err);
  });
  this.sendXhr = req;
};

/**
 * Starts a poll cycle.
 *
 * @api private
 */

XHR.prototype.doPoll = function(){
  debug('xhr poll');
  var req = this.request();
  var self = this;
  req.on('data', function(data){
    self.onData(data);
  });
  req.on('error', function(err){
    self.onError('xhr poll error', err);
  });
  this.pollXhr = req;
};

/**
 * Request constructor
 *
 * @param {Object} options
 * @api public
 */

function Request(opts){
  this.method = opts.method || 'GET';
  this.uri = opts.uri;
  this.xd = !!opts.xd;
  this.xs = !!opts.xs;
  this.async = false !== opts.async;
  this.data = undefined != opts.data ? opts.data : null;
  this.agent = opts.agent;
  this.isBinary = opts.isBinary;
  this.supportsBinary = opts.supportsBinary;
  this.enablesXDR = opts.enablesXDR;
  this.create();
}

/**
 * Mix in `Emitter`.
 */

Emitter(Request.prototype);

/**
 * Creates the XHR object and sends the request.
 *
 * @api private
 */

Request.prototype.create = function(){
  var xhr = this.xhr = new XMLHttpRequest({ agent: this.agent, xdomain: this.xd, xscheme: this.xs, enablesXDR: this.enablesXDR });
  var self = this;

  try {
    debug('xhr open %s: %s', this.method, this.uri);
    xhr.open(this.method, this.uri, this.async);
    if (this.supportsBinary) {
      // This has to be done after open because Firefox is stupid
      // http://stackoverflow.com/questions/13216903/get-binary-data-with-xmlhttprequest-in-a-firefox-extension
      xhr.responseType = 'arraybuffer';
    }

    if ('POST' == this.method) {
      try {
        if (this.isBinary) {
          xhr.setRequestHeader('Content-type', 'application/octet-stream');
        } else {
          xhr.setRequestHeader('Content-type', 'text/plain;charset=UTF-8');
        }
      } catch (e) {}
    }

    // ie6 check
    if ('withCredentials' in xhr) {
      xhr.withCredentials = true;
    }

    if (this.hasXDR()) {
      xhr.onload = function(){
        self.onLoad();
      };
      xhr.onerror = function(){
        self.onError(xhr.responseText);
      };
    } else {
      xhr.onreadystatechange = function(){
        if (4 != xhr.readyState) return;
        if (200 == xhr.status || 1223 == xhr.status) {
          self.onLoad();
        } else {
          // make sure the `error` event handler that's user-set
          // does not throw in the same tick and gets caught here
          setTimeout(function(){
            self.onError(xhr.status);
          }, 0);
        }
      };
    }

    debug('xhr data %s', this.data);
    xhr.send(this.data);
  } catch (e) {
    // Need to defer since .create() is called directly fhrom the constructor
    // and thus the 'error' event can only be only bound *after* this exception
    // occurs.  Therefore, also, we cannot throw here at all.
    setTimeout(function() {
      self.onError(e);
    }, 0);
    return;
  }

  if (global.document) {
    this.index = Request.requestsCount++;
    Request.requests[this.index] = this;
  }
};

/**
 * Called upon successful response.
 *
 * @api private
 */

Request.prototype.onSuccess = function(){
  this.emit('success');
  this.cleanup();
};

/**
 * Called if we have data.
 *
 * @api private
 */

Request.prototype.onData = function(data){
  this.emit('data', data);
  this.onSuccess();
};

/**
 * Called upon error.
 *
 * @api private
 */

Request.prototype.onError = function(err){
  this.emit('error', err);
  this.cleanup();
};

/**
 * Cleans up house.
 *
 * @api private
 */

Request.prototype.cleanup = function(){
  if ('undefined' == typeof this.xhr || null === this.xhr) {
    return;
  }
  // xmlhttprequest
  if (this.hasXDR()) {
    this.xhr.onload = this.xhr.onerror = empty;
  } else {
    this.xhr.onreadystatechange = empty;
  }

  try {
    this.xhr.abort();
  } catch(e) {}

  if (global.document) {
    delete Request.requests[this.index];
  }

  this.xhr = null;
};

/**
 * Called upon load.
 *
 * @api private
 */

Request.prototype.onLoad = function(){
  var data;
  try {
    var contentType;
    try {
      contentType = this.xhr.getResponseHeader('Content-Type').split(';')[0];
    } catch (e) {}
    if (contentType === 'application/octet-stream') {
      data = this.xhr.response;
    } else {
      if (!this.supportsBinary) {
        data = this.xhr.responseText;
      } else {
        data = 'ok';
      }
    }
  } catch (e) {
    this.onError(e);
  }
  if (null != data) {
    this.onData(data);
  }
};

/**
 * Check if it has XDomainRequest.
 *
 * @api private
 */

Request.prototype.hasXDR = function(){
  return 'undefined' !== typeof global.XDomainRequest && !this.xs && this.enablesXDR;
};

/**
 * Aborts the request.
 *
 * @api public
 */

Request.prototype.abort = function(){
  this.cleanup();
};

/**
 * Aborts pending requests when unloading the window. This is needed to prevent
 * memory leaks (e.g. when using IE) and to ensure that no spurious error is
 * emitted.
 */

if (global.document) {
  Request.requestsCount = 0;
  Request.requests = {};
  if (global.attachEvent) {
    global.attachEvent('onunload', unloadHandler);
  } else if (global.addEventListener) {
    global.addEventListener('beforeunload', unloadHandler, false);
  }
}

function unloadHandler() {
  for (var i in Request.requests) {
    if (Request.requests.hasOwnProperty(i)) {
      Request.requests[i].abort();
    }
  }
}

}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./polling":17,"component-emitter":8,"component-inherit":20,"debug":21,"xmlhttprequest":19}],17:[function(_dereq_,module,exports){
/**
 * Module dependencies.
 */

var Transport = _dereq_('../transport');
var parseqs = _dereq_('parseqs');
var parser = _dereq_('engine.io-parser');
var inherit = _dereq_('component-inherit');
var debug = _dereq_('debug')('engine.io-client:polling');

/**
 * Module exports.
 */

module.exports = Polling;

/**
 * Is XHR2 supported?
 */

var hasXHR2 = (function() {
  var XMLHttpRequest = _dereq_('xmlhttprequest');
  var xhr = new XMLHttpRequest({ xdomain: false });
  return null != xhr.responseType;
})();

/**
 * Polling interface.
 *
 * @param {Object} opts
 * @api private
 */

function Polling(opts){
  var forceBase64 = (opts && opts.forceBase64);
  if (!hasXHR2 || forceBase64) {
    this.supportsBinary = false;
  }
  Transport.call(this, opts);
}

/**
 * Inherits from Transport.
 */

inherit(Polling, Transport);

/**
 * Transport name.
 */

Polling.prototype.name = 'polling';

/**
 * Opens the socket (triggers polling). We write a PING message to determine
 * when the transport is open.
 *
 * @api private
 */

Polling.prototype.doOpen = function(){
  this.poll();
};

/**
 * Pauses polling.
 *
 * @param {Function} callback upon buffers are flushed and transport is paused
 * @api private
 */

Polling.prototype.pause = function(onPause){
  var pending = 0;
  var self = this;

  this.readyState = 'pausing';

  function pause(){
    debug('paused');
    self.readyState = 'paused';
    onPause();
  }

  if (this.polling || !this.writable) {
    var total = 0;

    if (this.polling) {
      debug('we are currently polling - waiting to pause');
      total++;
      this.once('pollComplete', function(){
        debug('pre-pause polling complete');
        --total || pause();
      });
    }

    if (!this.writable) {
      debug('we are currently writing - waiting to pause');
      total++;
      this.once('drain', function(){
        debug('pre-pause writing complete');
        --total || pause();
      });
    }
  } else {
    pause();
  }
};

/**
 * Starts polling cycle.
 *
 * @api public
 */

Polling.prototype.poll = function(){
  debug('polling');
  this.polling = true;
  this.doPoll();
  this.emit('poll');
};

/**
 * Overloads onData to detect payloads.
 *
 * @api private
 */

Polling.prototype.onData = function(data){
  var self = this;
  debug('polling got data %s', data);
  var callback = function(packet, index, total) {
    // if its the first message we consider the transport open
    if ('opening' == self.readyState) {
      self.onOpen();
    }

    // if its a close packet, we close the ongoing requests
    if ('close' == packet.type) {
      self.onClose();
      return false;
    }

    // otherwise bypass onData and handle the message
    self.onPacket(packet);
  };

  // decode payload
  parser.decodePayload(data, this.socket.binaryType, callback);

  // if an event did not trigger closing
  if ('closed' != this.readyState) {
    // if we got data we're not polling
    this.polling = false;
    this.emit('pollComplete');

    if ('open' == this.readyState) {
      this.poll();
    } else {
      debug('ignoring poll - transport state "%s"', this.readyState);
    }
  }
};

/**
 * For polling, send a close packet.
 *
 * @api private
 */

Polling.prototype.doClose = function(){
  var self = this;

  function close(){
    debug('writing close packet');
    self.write([{ type: 'close' }]);
  }

  if ('open' == this.readyState) {
    debug('transport open - closing');
    close();
  } else {
    // in case we're trying to close while
    // handshaking is in progress (GH-164)
    debug('transport not open - deferring close');
    this.once('open', close);
  }
};

/**
 * Writes a packets payload.
 *
 * @param {Array} data packets
 * @param {Function} drain callback
 * @api private
 */

Polling.prototype.write = function(packets){
  var self = this;
  this.writable = false;
  var callbackfn = function() {
    self.writable = true;
    self.emit('drain');
  };

  var self = this;
  parser.encodePayload(packets, this.supportsBinary, function(data) {
    self.doWrite(data, callbackfn);
  });
};

/**
 * Generates uri for connection.
 *
 * @api private
 */

Polling.prototype.uri = function(){
  var query = this.query || {};
  var schema = this.secure ? 'https' : 'http';
  var port = '';

  // cache busting is forced
  if (false !== this.timestampRequests) {
    query[this.timestampParam] = +new Date + '-' + Transport.timestamps++;
  }

  if (!this.supportsBinary && !query.sid) {
    query.b64 = 1;
  }

  query = parseqs.encode(query);

  // avoid port if default for schema
  if (this.port && (('https' == schema && this.port != 443) ||
     ('http' == schema && this.port != 80))) {
    port = ':' + this.port;
  }

  // prepend ? to query
  if (query.length) {
    query = '?' + query;
  }

  return schema + '://' + this.hostname + port + this.path + query;
};

},{"../transport":13,"component-inherit":20,"debug":21,"engine.io-parser":24,"parseqs":32,"xmlhttprequest":19}],18:[function(_dereq_,module,exports){
/**
 * Module dependencies.
 */

var Transport = _dereq_('../transport');
var parser = _dereq_('engine.io-parser');
var parseqs = _dereq_('parseqs');
var inherit = _dereq_('component-inherit');
var debug = _dereq_('debug')('engine.io-client:websocket');

/**
 * `ws` exposes a WebSocket-compatible interface in
 * Node, or the `WebSocket` or `MozWebSocket` globals
 * in the browser.
 */

var WebSocket = _dereq_('ws');

/**
 * Module exports.
 */

module.exports = WS;

/**
 * WebSocket transport constructor.
 *
 * @api {Object} connection options
 * @api public
 */

function WS(opts){
  var forceBase64 = (opts && opts.forceBase64);
  if (forceBase64) {
    this.supportsBinary = false;
  }
  Transport.call(this, opts);
}

/**
 * Inherits from Transport.
 */

inherit(WS, Transport);

/**
 * Transport name.
 *
 * @api public
 */

WS.prototype.name = 'websocket';

/*
 * WebSockets support binary
 */

WS.prototype.supportsBinary = true;

/**
 * Opens socket.
 *
 * @api private
 */

WS.prototype.doOpen = function(){
  if (!this.check()) {
    // let probe timeout
    return;
  }

  var self = this;
  var uri = this.uri();
  var protocols = void(0);
  var opts = { agent: this.agent };

  this.ws = new WebSocket(uri, protocols, opts);

  if (this.ws.binaryType === undefined) {
    this.supportsBinary = false;
  }

  this.ws.binaryType = 'arraybuffer';
  this.addEventListeners();
};

/**
 * Adds event listeners to the socket
 *
 * @api private
 */

WS.prototype.addEventListeners = function(){
  var self = this;

  this.ws.onopen = function(){
    self.onOpen();
  };
  this.ws.onclose = function(){
    self.onClose();
  };
  this.ws.onmessage = function(ev){
    self.onData(ev.data);
  };
  this.ws.onerror = function(e){
    self.onError('websocket error', e);
  };
};

/**
 * Override `onData` to use a timer on iOS.
 * See: https://gist.github.com/mloughran/2052006
 *
 * @api private
 */

if ('undefined' != typeof navigator
  && /iPad|iPhone|iPod/i.test(navigator.userAgent)) {
  WS.prototype.onData = function(data){
    var self = this;
    setTimeout(function(){
      Transport.prototype.onData.call(self, data);
    }, 0);
  };
}

/**
 * Writes data to socket.
 *
 * @param {Array} array of packets.
 * @api private
 */

WS.prototype.write = function(packets){
  var self = this;
  this.writable = false;
  // encodePacket efficient as it uses WS framing
  // no need for encodePayload
  for (var i = 0, l = packets.length; i < l; i++) {
    parser.encodePacket(packets[i], this.supportsBinary, function(data) {
      //Sometimes the websocket has already been closed but the browser didn't
      //have a chance of informing us about it yet, in that case send will
      //throw an error
      try {
        self.ws.send(data);
      } catch (e){
        debug('websocket closed before onclose event');
      }
    });
  }

  function ondrain() {
    self.writable = true;
    self.emit('drain');
  }
  // fake drain
  // defer to next tick to allow Socket to clear writeBuffer
  setTimeout(ondrain, 0);
};

/**
 * Called upon close
 *
 * @api private
 */

WS.prototype.onClose = function(){
  Transport.prototype.onClose.call(this);
};

/**
 * Closes socket.
 *
 * @api private
 */

WS.prototype.doClose = function(){
  if (typeof this.ws !== 'undefined') {
    this.ws.close();
  }
};

/**
 * Generates uri for connection.
 *
 * @api private
 */

WS.prototype.uri = function(){
  var query = this.query || {};
  var schema = this.secure ? 'wss' : 'ws';
  var port = '';

  // avoid port if default for schema
  if (this.port && (('wss' == schema && this.port != 443)
    || ('ws' == schema && this.port != 80))) {
    port = ':' + this.port;
  }

  // append timestamp to URI
  if (this.timestampRequests) {
    query[this.timestampParam] = +new Date;
  }

  // communicate binary support capabilities
  if (!this.supportsBinary) {
    query.b64 = 1;
  }

  query = parseqs.encode(query);

  // prepend ? to query
  if (query.length) {
    query = '?' + query;
  }

  return schema + '://' + this.hostname + port + this.path + query;
};

/**
 * Feature detection for WebSocket.
 *
 * @return {Boolean} whether this transport is available.
 * @api public
 */

WS.prototype.check = function(){
  return !!WebSocket && !('__initialize' in WebSocket && this.name === WS.prototype.name);
};

},{"../transport":13,"component-inherit":20,"debug":21,"engine.io-parser":24,"parseqs":32,"ws":34}],19:[function(_dereq_,module,exports){
// browser shim for xmlhttprequest module
var hasCORS = _dereq_('has-cors');

module.exports = function(opts) {
  var xdomain = opts.xdomain;

  // scheme must be same when usign XDomainRequest
  // http://blogs.msdn.com/b/ieinternals/archive/2010/05/13/xdomainrequest-restrictions-limitations-and-workarounds.aspx
  var xscheme = opts.xscheme;

  // XDomainRequest has a flow of not sending cookie, therefore it should be disabled as a default.
  // https://github.com/Automattic/engine.io-client/pull/217
  var enablesXDR = opts.enablesXDR;

  // XMLHttpRequest can be disabled on IE
  try {
    if ('undefined' != typeof XMLHttpRequest && (!xdomain || hasCORS)) {
      return new XMLHttpRequest();
    }
  } catch (e) { }

  // Use XDomainRequest for IE8 if enablesXDR is true
  // because loading bar keeps flashing when using jsonp-polling
  // https://github.com/yujiosaka/socke.io-ie8-loading-example
  try {
    if ('undefined' != typeof XDomainRequest && !xscheme && enablesXDR) {
      return new XDomainRequest();
    }
  } catch (e) { }

  if (!xdomain) {
    try {
      return new ActiveXObject('Microsoft.XMLHTTP');
    } catch(e) { }
  }
}

},{"has-cors":37}],20:[function(_dereq_,module,exports){

module.exports = function(a, b){
  var fn = function(){};
  fn.prototype = b.prototype;
  a.prototype = new fn;
  a.prototype.constructor = a;
};
},{}],21:[function(_dereq_,module,exports){

/**
 * This is the web browser implementation of `debug()`.
 *
 * Expose `debug()` as the module.
 */

exports = module.exports = _dereq_('./debug');
exports.log = log;
exports.formatArgs = formatArgs;
exports.save = save;
exports.load = load;
exports.useColors = useColors;

/**
 * Colors.
 */

exports.colors = [
  'lightseagreen',
  'forestgreen',
  'goldenrod',
  'dodgerblue',
  'darkorchid',
  'crimson'
];

/**
 * Currently only WebKit-based Web Inspectors, Firefox >= v31,
 * and the Firebug extension (any Firefox version) are known
 * to support "%c" CSS customizations.
 *
 * TODO: add a `localStorage` variable to explicitly enable/disable colors
 */

function useColors() {
  // is webkit? http://stackoverflow.com/a/16459606/376773
  return ('WebkitAppearance' in document.documentElement.style) ||
    // is firebug? http://stackoverflow.com/a/398120/376773
    (window.console && (console.firebug || (console.exception && console.table))) ||
    // is firefox >= v31?
    // https://developer.mozilla.org/en-US/docs/Tools/Web_Console#Styling_messages
    (navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/) && parseInt(RegExp.$1, 10) >= 31);
}

/**
 * Map %j to `JSON.stringify()`, since no Web Inspectors do that by default.
 */

exports.formatters.j = function(v) {
  return JSON.stringify(v);
};


/**
 * Colorize log arguments if enabled.
 *
 * @api public
 */

function formatArgs() {
  var args = arguments;
  var useColors = this.useColors;

  args[0] = (useColors ? '%c' : '')
    + this.namespace
    + (useColors ? ' %c' : ' ')
    + args[0]
    + (useColors ? '%c ' : ' ')
    + '+' + exports.humanize(this.diff);

  if (!useColors) return args;

  var c = 'color: ' + this.color;
  args = [args[0], c, 'color: inherit'].concat(Array.prototype.slice.call(args, 1));

  // the final "%c" is somewhat tricky, because there could be other
  // arguments passed either before or after the %c, so we need to
  // figure out the correct index to insert the CSS into
  var index = 0;
  var lastC = 0;
  args[0].replace(/%[a-z%]/g, function(match) {
    if ('%' === match) return;
    index++;
    if ('%c' === match) {
      // we only are interested in the *last* %c
      // (the user may have provided their own)
      lastC = index;
    }
  });

  args.splice(lastC, 0, c);
  return args;
}

/**
 * Invokes `console.log()` when available.
 * No-op when `console.log` is not a "function".
 *
 * @api public
 */

function log() {
  // This hackery is required for IE8,
  // where the `console.log` function doesn't have 'apply'
  return 'object' == typeof console
    && 'function' == typeof console.log
    && Function.prototype.apply.call(console.log, console, arguments);
}

/**
 * Save `namespaces`.
 *
 * @param {String} namespaces
 * @api private
 */

function save(namespaces) {
  try {
    if (null == namespaces) {
      localStorage.removeItem('debug');
    } else {
      localStorage.debug = namespaces;
    }
  } catch(e) {}
}

/**
 * Load `namespaces`.
 *
 * @return {String} returns the previously persisted debug modes
 * @api private
 */

function load() {
  var r;
  try {
    r = localStorage.debug;
  } catch(e) {}
  return r;
}

/**
 * Enable namespaces listed in `localStorage.debug` initially.
 */

exports.enable(load());

},{"./debug":22}],22:[function(_dereq_,module,exports){

/**
 * This is the common logic for both the Node.js and web browser
 * implementations of `debug()`.
 *
 * Expose `debug()` as the module.
 */

exports = module.exports = debug;
exports.coerce = coerce;
exports.disable = disable;
exports.enable = enable;
exports.enabled = enabled;
exports.humanize = _dereq_('ms');

/**
 * The currently active debug mode names, and names to skip.
 */

exports.names = [];
exports.skips = [];

/**
 * Map of special "%n" handling functions, for the debug "format" argument.
 *
 * Valid key names are a single, lowercased letter, i.e. "n".
 */

exports.formatters = {};

/**
 * Previously assigned color.
 */

var prevColor = 0;

/**
 * Previous log timestamp.
 */

var prevTime;

/**
 * Select a color.
 *
 * @return {Number}
 * @api private
 */

function selectColor() {
  return exports.colors[prevColor++ % exports.colors.length];
}

/**
 * Create a debugger with the given `namespace`.
 *
 * @param {String} namespace
 * @return {Function}
 * @api public
 */

function debug(namespace) {

  // define the `disabled` version
  function disabled() {
  }
  disabled.enabled = false;

  // define the `enabled` version
  function enabled() {

    var self = enabled;

    // set `diff` timestamp
    var curr = +new Date();
    var ms = curr - (prevTime || curr);
    self.diff = ms;
    self.prev = prevTime;
    self.curr = curr;
    prevTime = curr;

    // add the `color` if not set
    if (null == self.useColors) self.useColors = exports.useColors();
    if (null == self.color && self.useColors) self.color = selectColor();

    var args = Array.prototype.slice.call(arguments);

    args[0] = exports.coerce(args[0]);

    if ('string' !== typeof args[0]) {
      // anything else let's inspect with %o
      args = ['%o'].concat(args);
    }

    // apply any `formatters` transformations
    var index = 0;
    args[0] = args[0].replace(/%([a-z%])/g, function(match, format) {
      // if we encounter an escaped % then don't increase the array index
      if (match === '%') return match;
      index++;
      var formatter = exports.formatters[format];
      if ('function' === typeof formatter) {
        var val = args[index];
        match = formatter.call(self, val);

        // now we need to remove `args[index]` since it's inlined in the `format`
        args.splice(index, 1);
        index--;
      }
      return match;
    });

    if ('function' === typeof exports.formatArgs) {
      args = exports.formatArgs.apply(self, args);
    }
    var logFn = enabled.log || exports.log || console.log.bind(console);
    logFn.apply(self, args);
  }
  enabled.enabled = true;

  var fn = exports.enabled(namespace) ? enabled : disabled;

  fn.namespace = namespace;

  return fn;
}

/**
 * Enables a debug mode by namespaces. This can include modes
 * separated by a colon and wildcards.
 *
 * @param {String} namespaces
 * @api public
 */

function enable(namespaces) {
  exports.save(namespaces);

  var split = (namespaces || '').split(/[\s,]+/);
  var len = split.length;

  for (var i = 0; i < len; i++) {
    if (!split[i]) continue; // ignore empty strings
    namespaces = split[i].replace(/\*/g, '.*?');
    if (namespaces[0] === '-') {
      exports.skips.push(new RegExp('^' + namespaces.substr(1) + '$'));
    } else {
      exports.names.push(new RegExp('^' + namespaces + '$'));
    }
  }
}

/**
 * Disable debug output.
 *
 * @api public
 */

function disable() {
  exports.enable('');
}

/**
 * Returns true if the given mode name is enabled, false otherwise.
 *
 * @param {String} name
 * @return {Boolean}
 * @api public
 */

function enabled(name) {
  var i, len;
  for (i = 0, len = exports.skips.length; i < len; i++) {
    if (exports.skips[i].test(name)) {
      return false;
    }
  }
  for (i = 0, len = exports.names.length; i < len; i++) {
    if (exports.names[i].test(name)) {
      return true;
    }
  }
  return false;
}

/**
 * Coerce `val`.
 *
 * @param {Mixed} val
 * @return {Mixed}
 * @api private
 */

function coerce(val) {
  if (val instanceof Error) return val.stack || val.message;
  return val;
}

},{"ms":23}],23:[function(_dereq_,module,exports){
/**
 * Helpers.
 */

var s = 1000;
var m = s * 60;
var h = m * 60;
var d = h * 24;
var y = d * 365.25;

/**
 * Parse or format the given `val`.
 *
 * Options:
 *
 *  - `long` verbose formatting [false]
 *
 * @param {String|Number} val
 * @param {Object} options
 * @return {String|Number}
 * @api public
 */

module.exports = function(val, options){
  options = options || {};
  if ('string' == typeof val) return parse(val);
  return options.long
    ? long(val)
    : short(val);
};

/**
 * Parse the given `str` and return milliseconds.
 *
 * @param {String} str
 * @return {Number}
 * @api private
 */

function parse(str) {
  var match = /^((?:\d+)?\.?\d+) *(ms|seconds?|s|minutes?|m|hours?|h|days?|d|years?|y)?$/i.exec(str);
  if (!match) return;
  var n = parseFloat(match[1]);
  var type = (match[2] || 'ms').toLowerCase();
  switch (type) {
    case 'years':
    case 'year':
    case 'y':
      return n * y;
    case 'days':
    case 'day':
    case 'd':
      return n * d;
    case 'hours':
    case 'hour':
    case 'h':
      return n * h;
    case 'minutes':
    case 'minute':
    case 'm':
      return n * m;
    case 'seconds':
    case 'second':
    case 's':
      return n * s;
    case 'ms':
      return n;
  }
}

/**
 * Short format for `ms`.
 *
 * @param {Number} ms
 * @return {String}
 * @api private
 */

function short(ms) {
  if (ms >= d) return Math.round(ms / d) + 'd';
  if (ms >= h) return Math.round(ms / h) + 'h';
  if (ms >= m) return Math.round(ms / m) + 'm';
  if (ms >= s) return Math.round(ms / s) + 's';
  return ms + 'ms';
}

/**
 * Long format for `ms`.
 *
 * @param {Number} ms
 * @return {String}
 * @api private
 */

function long(ms) {
  return plural(ms, d, 'day')
    || plural(ms, h, 'hour')
    || plural(ms, m, 'minute')
    || plural(ms, s, 'second')
    || ms + ' ms';
}

/**
 * Pluralization helper.
 */

function plural(ms, n, name) {
  if (ms < n) return;
  if (ms < n * 1.5) return Math.floor(ms / n) + ' ' + name;
  return Math.ceil(ms / n) + ' ' + name + 's';
}

},{}],24:[function(_dereq_,module,exports){
(function (global){
/**
 * Module dependencies.
 */

var keys = _dereq_('./keys');
var sliceBuffer = _dereq_('arraybuffer.slice');
var base64encoder = _dereq_('base64-arraybuffer');
var after = _dereq_('after');
var utf8 = _dereq_('utf8');

/**
 * Check if we are running an android browser. That requires us to use
 * ArrayBuffer with polling transports...
 *
 * http://ghinda.net/jpeg-blob-ajax-android/
 */

var isAndroid = navigator.userAgent.match(/Android/i);

/**
 * Current protocol version.
 */

exports.protocol = 3;

/**
 * Packet types.
 */

var packets = exports.packets = {
    open:     0    // non-ws
  , close:    1    // non-ws
  , ping:     2
  , pong:     3
  , message:  4
  , upgrade:  5
  , noop:     6
};

var packetslist = keys(packets);

/**
 * Premade error packet.
 */

var err = { type: 'error', data: 'parser error' };

/**
 * Create a blob api even for blob builder when vendor prefixes exist
 */

var Blob = _dereq_('blob');

/**
 * Encodes a packet.
 *
 *     <packet type id> [ <data> ]
 *
 * Example:
 *
 *     5hello world
 *     3
 *     4
 *
 * Binary is encoded in an identical principle
 *
 * @api private
 */

exports.encodePacket = function (packet, supportsBinary, utf8encode, callback) {
  if ('function' == typeof supportsBinary) {
    callback = supportsBinary;
    supportsBinary = false;
  }

  if ('function' == typeof utf8encode) {
    callback = utf8encode;
    utf8encode = null;
  }

  var data = (packet.data === undefined)
    ? undefined
    : packet.data.buffer || packet.data;

  if (global.ArrayBuffer && data instanceof ArrayBuffer) {
    return encodeArrayBuffer(packet, supportsBinary, callback);
  } else if (Blob && data instanceof global.Blob) {
    return encodeBlob(packet, supportsBinary, callback);
  }

  // Sending data as a utf-8 string
  var encoded = packets[packet.type];

  // data fragment is optional
  if (undefined !== packet.data) {
    encoded += utf8encode ? utf8.encode(String(packet.data)) : String(packet.data);
  }

  return callback('' + encoded);

};

/**
 * Encode packet helpers for binary types
 */

function encodeArrayBuffer(packet, supportsBinary, callback) {
  if (!supportsBinary) {
    return exports.encodeBase64Packet(packet, callback);
  }

  var data = packet.data;
  var contentArray = new Uint8Array(data);
  var resultBuffer = new Uint8Array(1 + data.byteLength);

  resultBuffer[0] = packets[packet.type];
  for (var i = 0; i < contentArray.length; i++) {
    resultBuffer[i+1] = contentArray[i];
  }

  return callback(resultBuffer.buffer);
}

function encodeBlobAsArrayBuffer(packet, supportsBinary, callback) {
  if (!supportsBinary) {
    return exports.encodeBase64Packet(packet, callback);
  }

  var fr = new FileReader();
  fr.onload = function() {
    packet.data = fr.result;
    exports.encodePacket(packet, supportsBinary, true, callback);
  };
  return fr.readAsArrayBuffer(packet.data);
}

function encodeBlob(packet, supportsBinary, callback) {
  if (!supportsBinary) {
    return exports.encodeBase64Packet(packet, callback);
  }

  if (isAndroid) {
    return encodeBlobAsArrayBuffer(packet, supportsBinary, callback);
  }

  var length = new Uint8Array(1);
  length[0] = packets[packet.type];
  var blob = new Blob([length.buffer, packet.data]);

  return callback(blob);
}

/**
 * Encodes a packet with binary data in a base64 string
 *
 * @param {Object} packet, has `type` and `data`
 * @return {String} base64 encoded message
 */

exports.encodeBase64Packet = function(packet, callback) {
  var message = 'b' + exports.packets[packet.type];
  if (Blob && packet.data instanceof Blob) {
    var fr = new FileReader();
    fr.onload = function() {
      var b64 = fr.result.split(',')[1];
      callback(message + b64);
    };
    return fr.readAsDataURL(packet.data);
  }

  var b64data;
  try {
    b64data = String.fromCharCode.apply(null, new Uint8Array(packet.data));
  } catch (e) {
    // iPhone Safari doesn't let you apply with typed arrays
    var typed = new Uint8Array(packet.data);
    var basic = new Array(typed.length);
    for (var i = 0; i < typed.length; i++) {
      basic[i] = typed[i];
    }
    b64data = String.fromCharCode.apply(null, basic);
  }
  message += global.btoa(b64data);
  return callback(message);
};

/**
 * Decodes a packet. Changes format to Blob if requested.
 *
 * @return {Object} with `type` and `data` (if any)
 * @api private
 */

exports.decodePacket = function (data, binaryType, utf8decode) {
  // String data
  if (typeof data == 'string' || data === undefined) {
    if (data.charAt(0) == 'b') {
      return exports.decodeBase64Packet(data.substr(1), binaryType);
    }

    if (utf8decode) {
      try {
        data = utf8.decode(data);
      } catch (e) {
        return err;
      }
    }
    var type = data.charAt(0);

    if (Number(type) != type || !packetslist[type]) {
      return err;
    }

    if (data.length > 1) {
      return { type: packetslist[type], data: data.substring(1) };
    } else {
      return { type: packetslist[type] };
    }
  }

  var asArray = new Uint8Array(data);
  var type = asArray[0];
  var rest = sliceBuffer(data, 1);
  if (Blob && binaryType === 'blob') {
    rest = new Blob([rest]);
  }
  return { type: packetslist[type], data: rest };
};

/**
 * Decodes a packet encoded in a base64 string
 *
 * @param {String} base64 encoded message
 * @return {Object} with `type` and `data` (if any)
 */

exports.decodeBase64Packet = function(msg, binaryType) {
  var type = packetslist[msg.charAt(0)];
  if (!global.ArrayBuffer) {
    return { type: type, data: { base64: true, data: msg.substr(1) } };
  }

  var data = base64encoder.decode(msg.substr(1));

  if (binaryType === 'blob' && Blob) {
    data = new Blob([data]);
  }

  return { type: type, data: data };
};

/**
 * Encodes multiple messages (payload).
 *
 *     <length>:data
 *
 * Example:
 *
 *     11:hello world2:hi
 *
 * If any contents are binary, they will be encoded as base64 strings. Base64
 * encoded strings are marked with a b before the length specifier
 *
 * @param {Array} packets
 * @api private
 */

exports.encodePayload = function (packets, supportsBinary, callback) {
  if (typeof supportsBinary == 'function') {
    callback = supportsBinary;
    supportsBinary = null;
  }

  if (supportsBinary) {
    if (Blob && !isAndroid) {
      return exports.encodePayloadAsBlob(packets, callback);
    }

    return exports.encodePayloadAsArrayBuffer(packets, callback);
  }

  if (!packets.length) {
    return callback('0:');
  }

  function setLengthHeader(message) {
    return message.length + ':' + message;
  }

  function encodeOne(packet, doneCallback) {
    exports.encodePacket(packet, supportsBinary, true, function(message) {
      doneCallback(null, setLengthHeader(message));
    });
  }

  map(packets, encodeOne, function(err, results) {
    return callback(results.join(''));
  });
};

/**
 * Async array map using after
 */

function map(ary, each, done) {
  var result = new Array(ary.length);
  var next = after(ary.length, done);

  var eachWithIndex = function(i, el, cb) {
    each(el, function(error, msg) {
      result[i] = msg;
      cb(error, result);
    });
  };

  for (var i = 0; i < ary.length; i++) {
    eachWithIndex(i, ary[i], next);
  }
}

/*
 * Decodes data when a payload is maybe expected. Possible binary contents are
 * decoded from their base64 representation
 *
 * @param {String} data, callback method
 * @api public
 */

exports.decodePayload = function (data, binaryType, callback) {
  if (typeof data != 'string') {
    return exports.decodePayloadAsBinary(data, binaryType, callback);
  }

  if (typeof binaryType === 'function') {
    callback = binaryType;
    binaryType = null;
  }

  var packet;
  if (data == '') {
    // parser error - ignoring payload
    return callback(err, 0, 1);
  }

  var length = ''
    , n, msg;

  for (var i = 0, l = data.length; i < l; i++) {
    var chr = data.charAt(i);

    if (':' != chr) {
      length += chr;
    } else {
      if ('' == length || (length != (n = Number(length)))) {
        // parser error - ignoring payload
        return callback(err, 0, 1);
      }

      msg = data.substr(i + 1, n);

      if (length != msg.length) {
        // parser error - ignoring payload
        return callback(err, 0, 1);
      }

      if (msg.length) {
        packet = exports.decodePacket(msg, binaryType, true);

        if (err.type == packet.type && err.data == packet.data) {
          // parser error in individual packet - ignoring payload
          return callback(err, 0, 1);
        }

        var ret = callback(packet, i + n, l);
        if (false === ret) return;
      }

      // advance cursor
      i += n;
      length = '';
    }
  }

  if (length != '') {
    // parser error - ignoring payload
    return callback(err, 0, 1);
  }

};

/**
 * Encodes multiple messages (payload) as binary.
 *
 * <1 = binary, 0 = string><number from 0-9><number from 0-9>[...]<number
 * 255><data>
 *
 * Example:
 * 1 3 255 1 2 3, if the binary contents are interpreted as 8 bit integers
 *
 * @param {Array} packets
 * @return {ArrayBuffer} encoded payload
 * @api private
 */

exports.encodePayloadAsArrayBuffer = function(packets, callback) {
  if (!packets.length) {
    return callback(new ArrayBuffer(0));
  }

  function encodeOne(packet, doneCallback) {
    exports.encodePacket(packet, true, true, function(data) {
      return doneCallback(null, data);
    });
  }

  map(packets, encodeOne, function(err, encodedPackets) {
    var totalLength = encodedPackets.reduce(function(acc, p) {
      var len;
      if (typeof p === 'string'){
        len = p.length;
      } else {
        len = p.byteLength;
      }
      return acc + len.toString().length + len + 2; // string/binary identifier + separator = 2
    }, 0);

    var resultArray = new Uint8Array(totalLength);

    var bufferIndex = 0;
    encodedPackets.forEach(function(p) {
      var isString = typeof p === 'string';
      var ab = p;
      if (isString) {
        var view = new Uint8Array(p.length);
        for (var i = 0; i < p.length; i++) {
          view[i] = p.charCodeAt(i);
        }
        ab = view.buffer;
      }

      if (isString) { // not true binary
        resultArray[bufferIndex++] = 0;
      } else { // true binary
        resultArray[bufferIndex++] = 1;
      }

      var lenStr = ab.byteLength.toString();
      for (var i = 0; i < lenStr.length; i++) {
        resultArray[bufferIndex++] = parseInt(lenStr[i]);
      }
      resultArray[bufferIndex++] = 255;

      var view = new Uint8Array(ab);
      for (var i = 0; i < view.length; i++) {
        resultArray[bufferIndex++] = view[i];
      }
    });

    return callback(resultArray.buffer);
  });
};

/**
 * Encode as Blob
 */

exports.encodePayloadAsBlob = function(packets, callback) {
  function encodeOne(packet, doneCallback) {
    exports.encodePacket(packet, true, true, function(encoded) {
      var binaryIdentifier = new Uint8Array(1);
      binaryIdentifier[0] = 1;
      if (typeof encoded === 'string') {
        var view = new Uint8Array(encoded.length);
        for (var i = 0; i < encoded.length; i++) {
          view[i] = encoded.charCodeAt(i);
        }
        encoded = view.buffer;
        binaryIdentifier[0] = 0;
      }

      var len = (encoded instanceof ArrayBuffer)
        ? encoded.byteLength
        : encoded.size;

      var lenStr = len.toString();
      var lengthAry = new Uint8Array(lenStr.length + 1);
      for (var i = 0; i < lenStr.length; i++) {
        lengthAry[i] = parseInt(lenStr[i]);
      }
      lengthAry[lenStr.length] = 255;

      if (Blob) {
        var blob = new Blob([binaryIdentifier.buffer, lengthAry.buffer, encoded]);
        doneCallback(null, blob);
      }
    });
  }

  map(packets, encodeOne, function(err, results) {
    return callback(new Blob(results));
  });
};

/*
 * Decodes data when a payload is maybe expected. Strings are decoded by
 * interpreting each byte as a key code for entries marked to start with 0. See
 * description of encodePayloadAsBinary
 *
 * @param {ArrayBuffer} data, callback method
 * @api public
 */

exports.decodePayloadAsBinary = function (data, binaryType, callback) {
  if (typeof binaryType === 'function') {
    callback = binaryType;
    binaryType = null;
  }

  var bufferTail = data;
  var buffers = [];

  var numberTooLong = false;
  while (bufferTail.byteLength > 0) {
    var tailArray = new Uint8Array(bufferTail);
    var isString = tailArray[0] === 0;
    var msgLength = '';

    for (var i = 1; ; i++) {
      if (tailArray[i] == 255) break;

      if (msgLength.length > 310) {
        numberTooLong = true;
        break;
      }

      msgLength += tailArray[i];
    }

    if(numberTooLong) return callback(err, 0, 1);

    bufferTail = sliceBuffer(bufferTail, 2 + msgLength.length);
    msgLength = parseInt(msgLength);

    var msg = sliceBuffer(bufferTail, 0, msgLength);
    if (isString) {
      try {
        msg = String.fromCharCode.apply(null, new Uint8Array(msg));
      } catch (e) {
        // iPhone Safari doesn't let you apply to typed arrays
        var typed = new Uint8Array(msg);
        msg = '';
        for (var i = 0; i < typed.length; i++) {
          msg += String.fromCharCode(typed[i]);
        }
      }
    }

    buffers.push(msg);
    bufferTail = sliceBuffer(bufferTail, msgLength);
  }

  var total = buffers.length;
  buffers.forEach(function(buffer, i) {
    callback(exports.decodePacket(buffer, binaryType, true), i, total);
  });
};

}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./keys":25,"after":26,"arraybuffer.slice":27,"base64-arraybuffer":28,"blob":29,"utf8":30}],25:[function(_dereq_,module,exports){

/**
 * Gets the keys for an object.
 *
 * @return {Array} keys
 * @api private
 */

module.exports = Object.keys || function keys (obj){
  var arr = [];
  var has = Object.prototype.hasOwnProperty;

  for (var i in obj) {
    if (has.call(obj, i)) {
      arr.push(i);
    }
  }
  return arr;
};

},{}],26:[function(_dereq_,module,exports){
module.exports = after

function after(count, callback, err_cb) {
    var bail = false
    err_cb = err_cb || noop
    proxy.count = count

    return (count === 0) ? callback() : proxy

    function proxy(err, result) {
        if (proxy.count <= 0) {
            throw new Error('after called too many times')
        }
        --proxy.count

        // after first error, rest are passed to err_cb
        if (err) {
            bail = true
            callback(err)
            // future error callbacks will go to error handler
            callback = err_cb
        } else if (proxy.count === 0 && !bail) {
            callback(null, result)
        }
    }
}

function noop() {}

},{}],27:[function(_dereq_,module,exports){
/**
 * An abstraction for slicing an arraybuffer even when
 * ArrayBuffer.prototype.slice is not supported
 *
 * @api public
 */

module.exports = function(arraybuffer, start, end) {
  var bytes = arraybuffer.byteLength;
  start = start || 0;
  end = end || bytes;

  if (arraybuffer.slice) { return arraybuffer.slice(start, end); }

  if (start < 0) { start += bytes; }
  if (end < 0) { end += bytes; }
  if (end > bytes) { end = bytes; }

  if (start >= bytes || start >= end || bytes === 0) {
    return new ArrayBuffer(0);
  }

  var abv = new Uint8Array(arraybuffer);
  var result = new Uint8Array(end - start);
  for (var i = start, ii = 0; i < end; i++, ii++) {
    result[ii] = abv[i];
  }
  return result.buffer;
};

},{}],28:[function(_dereq_,module,exports){
/*
 * base64-arraybuffer
 * https://github.com/niklasvh/base64-arraybuffer
 *
 * Copyright (c) 2012 Niklas von Hertzen
 * Licensed under the MIT license.
 */
(function(chars){
  "use strict";

  exports.encode = function(arraybuffer) {
    var bytes = new Uint8Array(arraybuffer),
    i, len = bytes.length, base64 = "";

    for (i = 0; i < len; i+=3) {
      base64 += chars[bytes[i] >> 2];
      base64 += chars[((bytes[i] & 3) << 4) | (bytes[i + 1] >> 4)];
      base64 += chars[((bytes[i + 1] & 15) << 2) | (bytes[i + 2] >> 6)];
      base64 += chars[bytes[i + 2] & 63];
    }

    if ((len % 3) === 2) {
      base64 = base64.substring(0, base64.length - 1) + "=";
    } else if (len % 3 === 1) {
      base64 = base64.substring(0, base64.length - 2) + "==";
    }

    return base64;
  };

  exports.decode =  function(base64) {
    var bufferLength = base64.length * 0.75,
    len = base64.length, i, p = 0,
    encoded1, encoded2, encoded3, encoded4;

    if (base64[base64.length - 1] === "=") {
      bufferLength--;
      if (base64[base64.length - 2] === "=") {
        bufferLength--;
      }
    }

    var arraybuffer = new ArrayBuffer(bufferLength),
    bytes = new Uint8Array(arraybuffer);

    for (i = 0; i < len; i+=4) {
      encoded1 = chars.indexOf(base64[i]);
      encoded2 = chars.indexOf(base64[i+1]);
      encoded3 = chars.indexOf(base64[i+2]);
      encoded4 = chars.indexOf(base64[i+3]);

      bytes[p++] = (encoded1 << 2) | (encoded2 >> 4);
      bytes[p++] = ((encoded2 & 15) << 4) | (encoded3 >> 2);
      bytes[p++] = ((encoded3 & 3) << 6) | (encoded4 & 63);
    }

    return arraybuffer;
  };
})("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/");

},{}],29:[function(_dereq_,module,exports){
(function (global){
/**
 * Create a blob builder even when vendor prefixes exist
 */

var BlobBuilder = global.BlobBuilder
  || global.WebKitBlobBuilder
  || global.MSBlobBuilder
  || global.MozBlobBuilder;

/**
 * Check if Blob constructor is supported
 */

var blobSupported = (function() {
  try {
    var b = new Blob(['hi']);
    return b.size == 2;
  } catch(e) {
    return false;
  }
})();

/**
 * Check if BlobBuilder is supported
 */

var blobBuilderSupported = BlobBuilder
  && BlobBuilder.prototype.append
  && BlobBuilder.prototype.getBlob;

function BlobBuilderConstructor(ary, options) {
  options = options || {};

  var bb = new BlobBuilder();
  for (var i = 0; i < ary.length; i++) {
    bb.append(ary[i]);
  }
  return (options.type) ? bb.getBlob(options.type) : bb.getBlob();
};

module.exports = (function() {
  if (blobSupported) {
    return global.Blob;
  } else if (blobBuilderSupported) {
    return BlobBuilderConstructor;
  } else {
    return undefined;
  }
})();

}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],30:[function(_dereq_,module,exports){
(function (global){
/*! http://mths.be/utf8js v2.0.0 by @mathias */
;(function(root) {

	// Detect free variables `exports`
	var freeExports = typeof exports == 'object' && exports;

	// Detect free variable `module`
	var freeModule = typeof module == 'object' && module &&
		module.exports == freeExports && module;

	// Detect free variable `global`, from Node.js or Browserified code,
	// and use it as `root`
	var freeGlobal = typeof global == 'object' && global;
	if (freeGlobal.global === freeGlobal || freeGlobal.window === freeGlobal) {
		root = freeGlobal;
	}

	/*--------------------------------------------------------------------------*/

	var stringFromCharCode = String.fromCharCode;

	// Taken from http://mths.be/punycode
	function ucs2decode(string) {
		var output = [];
		var counter = 0;
		var length = string.length;
		var value;
		var extra;
		while (counter < length) {
			value = string.charCodeAt(counter++);
			if (value >= 0xD800 && value <= 0xDBFF && counter < length) {
				// high surrogate, and there is a next character
				extra = string.charCodeAt(counter++);
				if ((extra & 0xFC00) == 0xDC00) { // low surrogate
					output.push(((value & 0x3FF) << 10) + (extra & 0x3FF) + 0x10000);
				} else {
					// unmatched surrogate; only append this code unit, in case the next
					// code unit is the high surrogate of a surrogate pair
					output.push(value);
					counter--;
				}
			} else {
				output.push(value);
			}
		}
		return output;
	}

	// Taken from http://mths.be/punycode
	function ucs2encode(array) {
		var length = array.length;
		var index = -1;
		var value;
		var output = '';
		while (++index < length) {
			value = array[index];
			if (value > 0xFFFF) {
				value -= 0x10000;
				output += stringFromCharCode(value >>> 10 & 0x3FF | 0xD800);
				value = 0xDC00 | value & 0x3FF;
			}
			output += stringFromCharCode(value);
		}
		return output;
	}

	/*--------------------------------------------------------------------------*/

	function createByte(codePoint, shift) {
		return stringFromCharCode(((codePoint >> shift) & 0x3F) | 0x80);
	}

	function encodeCodePoint(codePoint) {
		if ((codePoint & 0xFFFFFF80) == 0) { // 1-byte sequence
			return stringFromCharCode(codePoint);
		}
		var symbol = '';
		if ((codePoint & 0xFFFFF800) == 0) { // 2-byte sequence
			symbol = stringFromCharCode(((codePoint >> 6) & 0x1F) | 0xC0);
		}
		else if ((codePoint & 0xFFFF0000) == 0) { // 3-byte sequence
			symbol = stringFromCharCode(((codePoint >> 12) & 0x0F) | 0xE0);
			symbol += createByte(codePoint, 6);
		}
		else if ((codePoint & 0xFFE00000) == 0) { // 4-byte sequence
			symbol = stringFromCharCode(((codePoint >> 18) & 0x07) | 0xF0);
			symbol += createByte(codePoint, 12);
			symbol += createByte(codePoint, 6);
		}
		symbol += stringFromCharCode((codePoint & 0x3F) | 0x80);
		return symbol;
	}

	function utf8encode(string) {
		var codePoints = ucs2decode(string);

		// console.log(JSON.stringify(codePoints.map(function(x) {
		// 	return 'U+' + x.toString(16).toUpperCase();
		// })));

		var length = codePoints.length;
		var index = -1;
		var codePoint;
		var byteString = '';
		while (++index < length) {
			codePoint = codePoints[index];
			byteString += encodeCodePoint(codePoint);
		}
		return byteString;
	}

	/*--------------------------------------------------------------------------*/

	function readContinuationByte() {
		if (byteIndex >= byteCount) {
			throw Error('Invalid byte index');
		}

		var continuationByte = byteArray[byteIndex] & 0xFF;
		byteIndex++;

		if ((continuationByte & 0xC0) == 0x80) {
			return continuationByte & 0x3F;
		}

		// If we end up here, it’s not a continuation byte
		throw Error('Invalid continuation byte');
	}

	function decodeSymbol() {
		var byte1;
		var byte2;
		var byte3;
		var byte4;
		var codePoint;

		if (byteIndex > byteCount) {
			throw Error('Invalid byte index');
		}

		if (byteIndex == byteCount) {
			return false;
		}

		// Read first byte
		byte1 = byteArray[byteIndex] & 0xFF;
		byteIndex++;

		// 1-byte sequence (no continuation bytes)
		if ((byte1 & 0x80) == 0) {
			return byte1;
		}

		// 2-byte sequence
		if ((byte1 & 0xE0) == 0xC0) {
			var byte2 = readContinuationByte();
			codePoint = ((byte1 & 0x1F) << 6) | byte2;
			if (codePoint >= 0x80) {
				return codePoint;
			} else {
				throw Error('Invalid continuation byte');
			}
		}

		// 3-byte sequence (may include unpaired surrogates)
		if ((byte1 & 0xF0) == 0xE0) {
			byte2 = readContinuationByte();
			byte3 = readContinuationByte();
			codePoint = ((byte1 & 0x0F) << 12) | (byte2 << 6) | byte3;
			if (codePoint >= 0x0800) {
				return codePoint;
			} else {
				throw Error('Invalid continuation byte');
			}
		}

		// 4-byte sequence
		if ((byte1 & 0xF8) == 0xF0) {
			byte2 = readContinuationByte();
			byte3 = readContinuationByte();
			byte4 = readContinuationByte();
			codePoint = ((byte1 & 0x0F) << 0x12) | (byte2 << 0x0C) |
				(byte3 << 0x06) | byte4;
			if (codePoint >= 0x010000 && codePoint <= 0x10FFFF) {
				return codePoint;
			}
		}

		throw Error('Invalid UTF-8 detected');
	}

	var byteArray;
	var byteCount;
	var byteIndex;
	function utf8decode(byteString) {
		byteArray = ucs2decode(byteString);
		byteCount = byteArray.length;
		byteIndex = 0;
		var codePoints = [];
		var tmp;
		while ((tmp = decodeSymbol()) !== false) {
			codePoints.push(tmp);
		}
		return ucs2encode(codePoints);
	}

	/*--------------------------------------------------------------------------*/

	var utf8 = {
		'version': '2.0.0',
		'encode': utf8encode,
		'decode': utf8decode
	};

	// Some AMD build optimizers, like r.js, check for specific condition patterns
	// like the following:
	if (
		typeof define == 'function' &&
		typeof define.amd == 'object' &&
		define.amd
	) {
		define(function() {
			return utf8;
		});
	}	else if (freeExports && !freeExports.nodeType) {
		if (freeModule) { // in Node.js or RingoJS v0.8.0+
			freeModule.exports = utf8;
		} else { // in Narwhal or RingoJS v0.7.0-
			var object = {};
			var hasOwnProperty = object.hasOwnProperty;
			for (var key in utf8) {
				hasOwnProperty.call(utf8, key) && (freeExports[key] = utf8[key]);
			}
		}
	} else { // in Rhino or a web browser
		root.utf8 = utf8;
	}

}(this));

}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],31:[function(_dereq_,module,exports){
(function (global){
/**
 * JSON parse.
 *
 * @see Based on jQuery#parseJSON (MIT) and JSON2
 * @api private
 */

var rvalidchars = /^[\],:{}\s]*$/;
var rvalidescape = /\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g;
var rvalidtokens = /"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g;
var rvalidbraces = /(?:^|:|,)(?:\s*\[)+/g;
var rtrimLeft = /^\s+/;
var rtrimRight = /\s+$/;

module.exports = function parsejson(data) {
  if ('string' != typeof data || !data) {
    return null;
  }

  data = data.replace(rtrimLeft, '').replace(rtrimRight, '');

  // Attempt to parse using the native JSON parser first
  if (global.JSON && JSON.parse) {
    return JSON.parse(data);
  }

  if (rvalidchars.test(data.replace(rvalidescape, '@')
      .replace(rvalidtokens, ']')
      .replace(rvalidbraces, ''))) {
    return (new Function('return ' + data))();
  }
};
}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],32:[function(_dereq_,module,exports){
/**
 * Compiles a querystring
 * Returns string representation of the object
 *
 * @param {Object}
 * @api private
 */

exports.encode = function (obj) {
  var str = '';

  for (var i in obj) {
    if (obj.hasOwnProperty(i)) {
      if (str.length) str += '&';
      str += encodeURIComponent(i) + '=' + encodeURIComponent(obj[i]);
    }
  }

  return str;
};

/**
 * Parses a simple querystring into an object
 *
 * @param {String} qs
 * @api private
 */

exports.decode = function(qs){
  var qry = {};
  var pairs = qs.split('&');
  for (var i = 0, l = pairs.length; i < l; i++) {
    var pair = pairs[i].split('=');
    qry[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1]);
  }
  return qry;
};

},{}],33:[function(_dereq_,module,exports){
/**
 * Parses an URI
 *
 * @author Steven Levithan <stevenlevithan.com> (MIT license)
 * @api private
 */

var re = /^(?:(?![^:@]+:[^:@\/]*@)(http|https|ws|wss):\/\/)?((?:(([^:@]*)(?::([^:@]*))?)?@)?((?:[a-f0-9]{0,4}:){2,7}[a-f0-9]{0,4}|[^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/;

var parts = [
    'source', 'protocol', 'authority', 'userInfo', 'user', 'password', 'host', 'port', 'relative', 'path', 'directory', 'file', 'query', 'anchor'
];

module.exports = function parseuri(str) {
    var src = str,
        b = str.indexOf('['),
        e = str.indexOf(']');

    if (b != -1 && e != -1) {
        str = str.substring(0, b) + str.substring(b, e).replace(/:/g, ';') + str.substring(e, str.length);
    }

    var m = re.exec(str || ''),
        uri = {},
        i = 14;

    while (i--) {
        uri[parts[i]] = m[i] || '';
    }

    if (b != -1 && e != -1) {
        uri.source = src;
        uri.host = uri.host.substring(1, uri.host.length - 1).replace(/;/g, ':');
        uri.authority = uri.authority.replace('[', '').replace(']', '').replace(/;/g, ':');
        uri.ipv6uri = true;
    }

    return uri;
};

},{}],34:[function(_dereq_,module,exports){

/**
 * Module dependencies.
 */

var global = (function() { return this; })();

/**
 * WebSocket constructor.
 */

var WebSocket = global.WebSocket || global.MozWebSocket;

/**
 * Module exports.
 */

module.exports = WebSocket ? ws : null;

/**
 * WebSocket constructor.
 *
 * The third `opts` options object gets ignored in web browsers, since it's
 * non-standard, and throws a TypeError if passed to the constructor.
 * See: https://github.com/einaros/ws/issues/227
 *
 * @param {String} uri
 * @param {Array} protocols (optional)
 * @param {Object) opts (optional)
 * @api public
 */

function ws(uri, protocols, opts) {
  var instance;
  if (protocols) {
    instance = new WebSocket(uri, protocols);
  } else {
    instance = new WebSocket(uri);
  }
  return instance;
}

if (WebSocket) ws.prototype = WebSocket.prototype;

},{}],35:[function(_dereq_,module,exports){
(function (global){

/*
 * Module requirements.
 */

var isArray = _dereq_('isarray');

/**
 * Module exports.
 */

module.exports = hasBinary;

/**
 * Checks for binary data.
 *
 * Right now only Buffer and ArrayBuffer are supported..
 *
 * @param {Object} anything
 * @api public
 */

function hasBinary(data) {

  function _hasBinary(obj) {
    if (!obj) return false;

    if ( (global.Buffer && global.Buffer.isBuffer(obj)) ||
         (global.ArrayBuffer && obj instanceof ArrayBuffer) ||
         (global.Blob && obj instanceof Blob) ||
         (global.File && obj instanceof File)
        ) {
      return true;
    }

    if (isArray(obj)) {
      for (var i = 0; i < obj.length; i++) {
          if (_hasBinary(obj[i])) {
              return true;
          }
      }
    } else if (obj && 'object' == typeof obj) {
      if (obj.toJSON) {
        obj = obj.toJSON();
      }

      for (var key in obj) {
        if (obj.hasOwnProperty(key) && _hasBinary(obj[key])) {
          return true;
        }
      }
    }

    return false;
  }

  return _hasBinary(data);
}

}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"isarray":36}],36:[function(_dereq_,module,exports){
module.exports = Array.isArray || function (arr) {
  return Object.prototype.toString.call(arr) == '[object Array]';
};

},{}],37:[function(_dereq_,module,exports){

/**
 * Module dependencies.
 */

var global = _dereq_('global');

/**
 * Module exports.
 *
 * Logic borrowed from Modernizr:
 *
 *   - https://github.com/Modernizr/Modernizr/blob/master/feature-detects/cors.js
 */

try {
  module.exports = 'XMLHttpRequest' in global &&
    'withCredentials' in new global.XMLHttpRequest();
} catch (err) {
  // if XMLHttp support is disabled in IE then it will throw
  // when trying to create
  module.exports = false;
}

},{"global":38}],38:[function(_dereq_,module,exports){

/**
 * Returns `this`. Execute this without a "context" (i.e. without it being
 * attached to an object of the left-hand side), and `this` points to the
 * "global" scope of the current JS execution.
 */

module.exports = (function () { return this; })();

},{}],39:[function(_dereq_,module,exports){

var indexOf = [].indexOf;

module.exports = function(arr, obj){
  if (indexOf) return arr.indexOf(obj);
  for (var i = 0; i < arr.length; ++i) {
    if (arr[i] === obj) return i;
  }
  return -1;
};
},{}],40:[function(_dereq_,module,exports){

/**
 * HOP ref.
 */

var has = Object.prototype.hasOwnProperty;

/**
 * Return own keys in `obj`.
 *
 * @param {Object} obj
 * @return {Array}
 * @api public
 */

exports.keys = Object.keys || function(obj){
  var keys = [];
  for (var key in obj) {
    if (has.call(obj, key)) {
      keys.push(key);
    }
  }
  return keys;
};

/**
 * Return own values in `obj`.
 *
 * @param {Object} obj
 * @return {Array}
 * @api public
 */

exports.values = function(obj){
  var vals = [];
  for (var key in obj) {
    if (has.call(obj, key)) {
      vals.push(obj[key]);
    }
  }
  return vals;
};

/**
 * Merge `b` into `a`.
 *
 * @param {Object} a
 * @param {Object} b
 * @return {Object} a
 * @api public
 */

exports.merge = function(a, b){
  for (var key in b) {
    if (has.call(b, key)) {
      a[key] = b[key];
    }
  }
  return a;
};

/**
 * Return length of `obj`.
 *
 * @param {Object} obj
 * @return {Number}
 * @api public
 */

exports.length = function(obj){
  return exports.keys(obj).length;
};

/**
 * Check if `obj` is empty.
 *
 * @param {Object} obj
 * @return {Boolean}
 * @api public
 */

exports.isEmpty = function(obj){
  return 0 == exports.length(obj);
};
},{}],41:[function(_dereq_,module,exports){
/**
 * Parses an URI
 *
 * @author Steven Levithan <stevenlevithan.com> (MIT license)
 * @api private
 */

var re = /^(?:(?![^:@]+:[^:@\/]*@)(http|https|ws|wss):\/\/)?((?:(([^:@]*)(?::([^:@]*))?)?@)?((?:[a-f0-9]{0,4}:){2,7}[a-f0-9]{0,4}|[^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/;

var parts = [
    'source', 'protocol', 'authority', 'userInfo', 'user', 'password', 'host'
  , 'port', 'relative', 'path', 'directory', 'file', 'query', 'anchor'
];

module.exports = function parseuri(str) {
  var m = re.exec(str || '')
    , uri = {}
    , i = 14;

  while (i--) {
    uri[parts[i]] = m[i] || '';
  }

  return uri;
};

},{}],42:[function(_dereq_,module,exports){
(function (global){
/*global Blob,File*/

/**
 * Module requirements
 */

var isArray = _dereq_('isarray');
var isBuf = _dereq_('./is-buffer');

/**
 * Replaces every Buffer | ArrayBuffer in packet with a numbered placeholder.
 * Anything with blobs or files should be fed through removeBlobs before coming
 * here.
 *
 * @param {Object} packet - socket.io event packet
 * @return {Object} with deconstructed packet and list of buffers
 * @api public
 */

exports.deconstructPacket = function(packet){
  var buffers = [];
  var packetData = packet.data;

  function _deconstructPacket(data) {
    if (!data) return data;

    if (isBuf(data)) {
      var placeholder = { _placeholder: true, num: buffers.length };
      buffers.push(data);
      return placeholder;
    } else if (isArray(data)) {
      var newData = new Array(data.length);
      for (var i = 0; i < data.length; i++) {
        newData[i] = _deconstructPacket(data[i]);
      }
      return newData;
    } else if ('object' == typeof data && !(data instanceof Date)) {
      var newData = {};
      for (var key in data) {
        newData[key] = _deconstructPacket(data[key]);
      }
      return newData;
    }
    return data;
  }

  var pack = packet;
  pack.data = _deconstructPacket(packetData);
  pack.attachments = buffers.length; // number of binary 'attachments'
  return {packet: pack, buffers: buffers};
};

/**
 * Reconstructs a binary packet from its placeholder packet and buffers
 *
 * @param {Object} packet - event packet with placeholders
 * @param {Array} buffers - binary buffers to put in placeholder positions
 * @return {Object} reconstructed packet
 * @api public
 */

exports.reconstructPacket = function(packet, buffers) {
  var curPlaceHolder = 0;

  function _reconstructPacket(data) {
    if (data && data._placeholder) {
      var buf = buffers[data.num]; // appropriate buffer (should be natural order anyway)
      return buf;
    } else if (isArray(data)) {
      for (var i = 0; i < data.length; i++) {
        data[i] = _reconstructPacket(data[i]);
      }
      return data;
    } else if (data && 'object' == typeof data) {
      for (var key in data) {
        data[key] = _reconstructPacket(data[key]);
      }
      return data;
    }
    return data;
  }

  packet.data = _reconstructPacket(packet.data);
  packet.attachments = undefined; // no longer useful
  return packet;
};

/**
 * Asynchronously removes Blobs or Files from data via
 * FileReader's readAsArrayBuffer method. Used before encoding
 * data as msgpack. Calls callback with the blobless data.
 *
 * @param {Object} data
 * @param {Function} callback
 * @api private
 */

exports.removeBlobs = function(data, callback) {
  function _removeBlobs(obj, curKey, containingObject) {
    if (!obj) return obj;

    // convert any blob
    if ((global.Blob && obj instanceof Blob) ||
        (global.File && obj instanceof File)) {
      pendingBlobs++;

      // async filereader
      var fileReader = new FileReader();
      fileReader.onload = function() { // this.result == arraybuffer
        if (containingObject) {
          containingObject[curKey] = this.result;
        }
        else {
          bloblessData = this.result;
        }

        // if nothing pending its callback time
        if(! --pendingBlobs) {
          callback(bloblessData);
        }
      };

      fileReader.readAsArrayBuffer(obj); // blob -> arraybuffer
    } else if (isArray(obj)) { // handle array
      for (var i = 0; i < obj.length; i++) {
        _removeBlobs(obj[i], i, obj);
      }
    } else if (obj && 'object' == typeof obj && !isBuf(obj)) { // and object
      for (var key in obj) {
        _removeBlobs(obj[key], key, obj);
      }
    }
  }

  var pendingBlobs = 0;
  var bloblessData = data;
  _removeBlobs(bloblessData);
  if (!pendingBlobs) {
    callback(bloblessData);
  }
};

}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./is-buffer":44,"isarray":45}],43:[function(_dereq_,module,exports){

/**
 * Module dependencies.
 */

var debug = _dereq_('debug')('socket.io-parser');
var json = _dereq_('json3');
var isArray = _dereq_('isarray');
var Emitter = _dereq_('component-emitter');
var binary = _dereq_('./binary');
var isBuf = _dereq_('./is-buffer');

/**
 * Protocol version.
 *
 * @api public
 */

exports.protocol = 4;

/**
 * Packet types.
 *
 * @api public
 */

exports.types = [
  'CONNECT',
  'DISCONNECT',
  'EVENT',
  'BINARY_EVENT',
  'ACK',
  'BINARY_ACK',
  'ERROR'
];

/**
 * Packet type `connect`.
 *
 * @api public
 */

exports.CONNECT = 0;

/**
 * Packet type `disconnect`.
 *
 * @api public
 */

exports.DISCONNECT = 1;

/**
 * Packet type `event`.
 *
 * @api public
 */

exports.EVENT = 2;

/**
 * Packet type `ack`.
 *
 * @api public
 */

exports.ACK = 3;

/**
 * Packet type `error`.
 *
 * @api public
 */

exports.ERROR = 4;

/**
 * Packet type 'binary event'
 *
 * @api public
 */

exports.BINARY_EVENT = 5;

/**
 * Packet type `binary ack`. For acks with binary arguments.
 *
 * @api public
 */

exports.BINARY_ACK = 6;

/**
 * Encoder constructor.
 *
 * @api public
 */

exports.Encoder = Encoder;

/**
 * Decoder constructor.
 *
 * @api public
 */

exports.Decoder = Decoder;

/**
 * A socket.io Encoder instance
 *
 * @api public
 */

function Encoder() {}

/**
 * Encode a packet as a single string if non-binary, or as a
 * buffer sequence, depending on packet type.
 *
 * @param {Object} obj - packet object
 * @param {Function} callback - function to handle encodings (likely engine.write)
 * @return Calls callback with Array of encodings
 * @api public
 */

Encoder.prototype.encode = function(obj, callback){
  debug('encoding packet %j', obj);

  if (exports.BINARY_EVENT == obj.type || exports.BINARY_ACK == obj.type) {
    encodeAsBinary(obj, callback);
  }
  else {
    var encoding = encodeAsString(obj);
    callback([encoding]);
  }
};

/**
 * Encode packet as string.
 *
 * @param {Object} packet
 * @return {String} encoded
 * @api private
 */

function encodeAsString(obj) {
  var str = '';
  var nsp = false;

  // first is type
  str += obj.type;

  // attachments if we have them
  if (exports.BINARY_EVENT == obj.type || exports.BINARY_ACK == obj.type) {
    str += obj.attachments;
    str += '-';
  }

  // if we have a namespace other than `/`
  // we append it followed by a comma `,`
  if (obj.nsp && '/' != obj.nsp) {
    nsp = true;
    str += obj.nsp;
  }

  // immediately followed by the id
  if (null != obj.id) {
    if (nsp) {
      str += ',';
      nsp = false;
    }
    str += obj.id;
  }

  // json data
  if (null != obj.data) {
    if (nsp) str += ',';
    str += json.stringify(obj.data);
  }

  debug('encoded %j as %s', obj, str);
  return str;
}

/**
 * Encode packet as 'buffer sequence' by removing blobs, and
 * deconstructing packet into object with placeholders and
 * a list of buffers.
 *
 * @param {Object} packet
 * @return {Buffer} encoded
 * @api private
 */

function encodeAsBinary(obj, callback) {

  function writeEncoding(bloblessData) {
    var deconstruction = binary.deconstructPacket(bloblessData);
    var pack = encodeAsString(deconstruction.packet);
    var buffers = deconstruction.buffers;

    buffers.unshift(pack); // add packet info to beginning of data list
    callback(buffers); // write all the buffers
  }

  binary.removeBlobs(obj, writeEncoding);
}

/**
 * A socket.io Decoder instance
 *
 * @return {Object} decoder
 * @api public
 */

function Decoder() {
  this.reconstructor = null;
}

/**
 * Mix in `Emitter` with Decoder.
 */

Emitter(Decoder.prototype);

/**
 * Decodes an ecoded packet string into packet JSON.
 *
 * @param {String} obj - encoded packet
 * @return {Object} packet
 * @api public
 */

Decoder.prototype.add = function(obj) {
  var packet;
  if ('string' == typeof obj) {
    packet = decodeString(obj);
    if (exports.BINARY_EVENT == packet.type || exports.BINARY_ACK == packet.type) { // binary packet's json
      this.reconstructor = new BinaryReconstructor(packet);

      // no attachments, labeled binary but no binary data to follow
      if (this.reconstructor.reconPack.attachments == 0) {
        this.emit('decoded', packet);
      }
    } else { // non-binary full packet
      this.emit('decoded', packet);
    }
  }
  else if (isBuf(obj) || obj.base64) { // raw binary data
    if (!this.reconstructor) {
      throw new Error('got binary data when not reconstructing a packet');
    } else {
      packet = this.reconstructor.takeBinaryData(obj);
      if (packet) { // received final buffer
        this.reconstructor = null;
        this.emit('decoded', packet);
      }
    }
  }
  else {
    throw new Error('Unknown type: ' + obj);
  }
};

/**
 * Decode a packet String (JSON data)
 *
 * @param {String} str
 * @return {Object} packet
 * @api private
 */

function decodeString(str) {
  var p = {};
  var i = 0;

  // look up type
  p.type = Number(str.charAt(0));
  if (null == exports.types[p.type]) return error();

  // look up attachments if type binary
  if (exports.BINARY_EVENT == p.type || exports.BINARY_ACK == p.type) {
    p.attachments = '';
    while (str.charAt(++i) != '-') {
      p.attachments += str.charAt(i);
    }
    p.attachments = Number(p.attachments);
  }

  // look up namespace (if any)
  if ('/' == str.charAt(i + 1)) {
    p.nsp = '';
    while (++i) {
      var c = str.charAt(i);
      if (',' == c) break;
      p.nsp += c;
      if (i + 1 == str.length) break;
    }
  } else {
    p.nsp = '/';
  }

  // look up id
  var next = str.charAt(i + 1);
  if ('' != next && Number(next) == next) {
    p.id = '';
    while (++i) {
      var c = str.charAt(i);
      if (null == c || Number(c) != c) {
        --i;
        break;
      }
      p.id += str.charAt(i);
      if (i + 1 == str.length) break;
    }
    p.id = Number(p.id);
  }

  // look up json data
  if (str.charAt(++i)) {
    try {
      p.data = json.parse(str.substr(i));
    } catch(e){
      return error();
    }
  }

  debug('decoded %s as %j', str, p);
  return p;
}

/**
 * Deallocates a parser's resources
 *
 * @api public
 */

Decoder.prototype.destroy = function() {
  if (this.reconstructor) {
    this.reconstructor.finishedReconstruction();
  }
};

/**
 * A manager of a binary event's 'buffer sequence'. Should
 * be constructed whenever a packet of type BINARY_EVENT is
 * decoded.
 *
 * @param {Object} packet
 * @return {BinaryReconstructor} initialized reconstructor
 * @api private
 */

function BinaryReconstructor(packet) {
  this.reconPack = packet;
  this.buffers = [];
}

/**
 * Method to be called when binary data received from connection
 * after a BINARY_EVENT packet.
 *
 * @param {Buffer | ArrayBuffer} binData - the raw binary data received
 * @return {null | Object} returns null if more binary data is expected or
 *   a reconstructed packet object if all buffers have been received.
 * @api private
 */

BinaryReconstructor.prototype.takeBinaryData = function(binData) {
  this.buffers.push(binData);
  if (this.buffers.length == this.reconPack.attachments) { // done with buffer list
    var packet = binary.reconstructPacket(this.reconPack, this.buffers);
    this.finishedReconstruction();
    return packet;
  }
  return null;
};

/**
 * Cleans up binary packet reconstruction variables.
 *
 * @api private
 */

BinaryReconstructor.prototype.finishedReconstruction = function() {
  this.reconPack = null;
  this.buffers = [];
};

function error(data){
  return {
    type: exports.ERROR,
    data: 'parser error'
  };
}

},{"./binary":42,"./is-buffer":44,"component-emitter":8,"debug":9,"isarray":45,"json3":46}],44:[function(_dereq_,module,exports){
(function (global){

module.exports = isBuf;

/**
 * Returns true if obj is a buffer or an arraybuffer.
 *
 * @api private
 */

function isBuf(obj) {
  return (global.Buffer && global.Buffer.isBuffer(obj)) ||
         (global.ArrayBuffer && obj instanceof ArrayBuffer);
}

}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],45:[function(_dereq_,module,exports){
module.exports=_dereq_(36)
},{}],46:[function(_dereq_,module,exports){
/*! JSON v3.2.6 | http://bestiejs.github.io/json3 | Copyright 2012-2013, Kit Cambridge | http://kit.mit-license.org */
;(function (window) {
  // Convenience aliases.
  var getClass = {}.toString, isProperty, forEach, undef;

  // Detect the `define` function exposed by asynchronous module loaders. The
  // strict `define` check is necessary for compatibility with `r.js`.
  var isLoader = typeof define === "function" && define.amd;

  // Detect native implementations.
  var nativeJSON = typeof JSON == "object" && JSON;

  // Set up the JSON 3 namespace, preferring the CommonJS `exports` object if
  // available.
  var JSON3 = typeof exports == "object" && exports && !exports.nodeType && exports;

  if (JSON3 && nativeJSON) {
    // Explicitly delegate to the native `stringify` and `parse`
    // implementations in CommonJS environments.
    JSON3.stringify = nativeJSON.stringify;
    JSON3.parse = nativeJSON.parse;
  } else {
    // Export for web browsers, JavaScript engines, and asynchronous module
    // loaders, using the global `JSON` object if available.
    JSON3 = window.JSON = nativeJSON || {};
  }

  // Test the `Date#getUTC*` methods. Based on work by @Yaffle.
  var isExtended = new Date(-3509827334573292);
  try {
    // The `getUTCFullYear`, `Month`, and `Date` methods return nonsensical
    // results for certain dates in Opera >= 10.53.
    isExtended = isExtended.getUTCFullYear() == -109252 && isExtended.getUTCMonth() === 0 && isExtended.getUTCDate() === 1 &&
      // Safari < 2.0.2 stores the internal millisecond time value correctly,
      // but clips the values returned by the date methods to the range of
      // signed 32-bit integers ([-2 ** 31, 2 ** 31 - 1]).
      isExtended.getUTCHours() == 10 && isExtended.getUTCMinutes() == 37 && isExtended.getUTCSeconds() == 6 && isExtended.getUTCMilliseconds() == 708;
  } catch (exception) {}

  // Internal: Determines whether the native `JSON.stringify` and `parse`
  // implementations are spec-compliant. Based on work by Ken Snyder.
  function has(name) {
    if (has[name] !== undef) {
      // Return cached feature test result.
      return has[name];
    }

    var isSupported;
    if (name == "bug-string-char-index") {
      // IE <= 7 doesn't support accessing string characters using square
      // bracket notation. IE 8 only supports this for primitives.
      isSupported = "a"[0] != "a";
    } else if (name == "json") {
      // Indicates whether both `JSON.stringify` and `JSON.parse` are
      // supported.
      isSupported = has("json-stringify") && has("json-parse");
    } else {
      var value, serialized = '{"a":[1,true,false,null,"\\u0000\\b\\n\\f\\r\\t"]}';
      // Test `JSON.stringify`.
      if (name == "json-stringify") {
        var stringify = JSON3.stringify, stringifySupported = typeof stringify == "function" && isExtended;
        if (stringifySupported) {
          // A test function object with a custom `toJSON` method.
          (value = function () {
            return 1;
          }).toJSON = value;
          try {
            stringifySupported =
              // Firefox 3.1b1 and b2 serialize string, number, and boolean
              // primitives as object literals.
              stringify(0) === "0" &&
              // FF 3.1b1, b2, and JSON 2 serialize wrapped primitives as object
              // literals.
              stringify(new Number()) === "0" &&
              stringify(new String()) == '""' &&
              // FF 3.1b1, 2 throw an error if the value is `null`, `undefined`, or
              // does not define a canonical JSON representation (this applies to
              // objects with `toJSON` properties as well, *unless* they are nested
              // within an object or array).
              stringify(getClass) === undef &&
              // IE 8 serializes `undefined` as `"undefined"`. Safari <= 5.1.7 and
              // FF 3.1b3 pass this test.
              stringify(undef) === undef &&
              // Safari <= 5.1.7 and FF 3.1b3 throw `Error`s and `TypeError`s,
              // respectively, if the value is omitted entirely.
              stringify() === undef &&
              // FF 3.1b1, 2 throw an error if the given value is not a number,
              // string, array, object, Boolean, or `null` literal. This applies to
              // objects with custom `toJSON` methods as well, unless they are nested
              // inside object or array literals. YUI 3.0.0b1 ignores custom `toJSON`
              // methods entirely.
              stringify(value) === "1" &&
              stringify([value]) == "[1]" &&
              // Prototype <= 1.6.1 serializes `[undefined]` as `"[]"` instead of
              // `"[null]"`.
              stringify([undef]) == "[null]" &&
              // YUI 3.0.0b1 fails to serialize `null` literals.
              stringify(null) == "null" &&
              // FF 3.1b1, 2 halts serialization if an array contains a function:
              // `[1, true, getClass, 1]` serializes as "[1,true,],". FF 3.1b3
              // elides non-JSON values from objects and arrays, unless they
              // define custom `toJSON` methods.
              stringify([undef, getClass, null]) == "[null,null,null]" &&
              // Simple serialization test. FF 3.1b1 uses Unicode escape sequences
              // where character escape codes are expected (e.g., `\b` => `\u0008`).
              stringify({ "a": [value, true, false, null, "\x00\b\n\f\r\t"] }) == serialized &&
              // FF 3.1b1 and b2 ignore the `filter` and `width` arguments.
              stringify(null, value) === "1" &&
              stringify([1, 2], null, 1) == "[\n 1,\n 2\n]" &&
              // JSON 2, Prototype <= 1.7, and older WebKit builds incorrectly
              // serialize extended years.
              stringify(new Date(-8.64e15)) == '"-271821-04-20T00:00:00.000Z"' &&
              // The milliseconds are optional in ES 5, but required in 5.1.
              stringify(new Date(8.64e15)) == '"+275760-09-13T00:00:00.000Z"' &&
              // Firefox <= 11.0 incorrectly serializes years prior to 0 as negative
              // four-digit years instead of six-digit years. Credits: @Yaffle.
              stringify(new Date(-621987552e5)) == '"-000001-01-01T00:00:00.000Z"' &&
              // Safari <= 5.1.5 and Opera >= 10.53 incorrectly serialize millisecond
              // values less than 1000. Credits: @Yaffle.
              stringify(new Date(-1)) == '"1969-12-31T23:59:59.999Z"';
          } catch (exception) {
            stringifySupported = false;
          }
        }
        isSupported = stringifySupported;
      }
      // Test `JSON.parse`.
      if (name == "json-parse") {
        var parse = JSON3.parse;
        if (typeof parse == "function") {
          try {
            // FF 3.1b1, b2 will throw an exception if a bare literal is provided.
            // Conforming implementations should also coerce the initial argument to
            // a string prior to parsing.
            if (parse("0") === 0 && !parse(false)) {
              // Simple parsing test.
              value = parse(serialized);
              var parseSupported = value["a"].length == 5 && value["a"][0] === 1;
              if (parseSupported) {
                try {
                  // Safari <= 5.1.2 and FF 3.1b1 allow unescaped tabs in strings.
                  parseSupported = !parse('"\t"');
                } catch (exception) {}
                if (parseSupported) {
                  try {
                    // FF 4.0 and 4.0.1 allow leading `+` signs and leading
                    // decimal points. FF 4.0, 4.0.1, and IE 9-10 also allow
                    // certain octal literals.
                    parseSupported = parse("01") !== 1;
                  } catch (exception) {}
                }
                if (parseSupported) {
                  try {
                    // FF 4.0, 4.0.1, and Rhino 1.7R3-R4 allow trailing decimal
                    // points. These environments, along with FF 3.1b1 and 2,
                    // also allow trailing commas in JSON objects and arrays.
                    parseSupported = parse("1.") !== 1;
                  } catch (exception) {}
                }
              }
            }
          } catch (exception) {
            parseSupported = false;
          }
        }
        isSupported = parseSupported;
      }
    }
    return has[name] = !!isSupported;
  }

  if (!has("json")) {
    // Common `[[Class]]` name aliases.
    var functionClass = "[object Function]";
    var dateClass = "[object Date]";
    var numberClass = "[object Number]";
    var stringClass = "[object String]";
    var arrayClass = "[object Array]";
    var booleanClass = "[object Boolean]";

    // Detect incomplete support for accessing string characters by index.
    var charIndexBuggy = has("bug-string-char-index");

    // Define additional utility methods if the `Date` methods are buggy.
    if (!isExtended) {
      var floor = Math.floor;
      // A mapping between the months of the year and the number of days between
      // January 1st and the first of the respective month.
      var Months = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
      // Internal: Calculates the number of days between the Unix epoch and the
      // first day of the given month.
      var getDay = function (year, month) {
        return Months[month] + 365 * (year - 1970) + floor((year - 1969 + (month = +(month > 1))) / 4) - floor((year - 1901 + month) / 100) + floor((year - 1601 + month) / 400);
      };
    }

    // Internal: Determines if a property is a direct property of the given
    // object. Delegates to the native `Object#hasOwnProperty` method.
    if (!(isProperty = {}.hasOwnProperty)) {
      isProperty = function (property) {
        var members = {}, constructor;
        if ((members.__proto__ = null, members.__proto__ = {
          // The *proto* property cannot be set multiple times in recent
          // versions of Firefox and SeaMonkey.
          "toString": 1
        }, members).toString != getClass) {
          // Safari <= 2.0.3 doesn't implement `Object#hasOwnProperty`, but
          // supports the mutable *proto* property.
          isProperty = function (property) {
            // Capture and break the object's prototype chain (see section 8.6.2
            // of the ES 5.1 spec). The parenthesized expression prevents an
            // unsafe transformation by the Closure Compiler.
            var original = this.__proto__, result = property in (this.__proto__ = null, this);
            // Restore the original prototype chain.
            this.__proto__ = original;
            return result;
          };
        } else {
          // Capture a reference to the top-level `Object` constructor.
          constructor = members.constructor;
          // Use the `constructor` property to simulate `Object#hasOwnProperty` in
          // other environments.
          isProperty = function (property) {
            var parent = (this.constructor || constructor).prototype;
            return property in this && !(property in parent && this[property] === parent[property]);
          };
        }
        members = null;
        return isProperty.call(this, property);
      };
    }

    // Internal: A set of primitive types used by `isHostType`.
    var PrimitiveTypes = {
      'boolean': 1,
      'number': 1,
      'string': 1,
      'undefined': 1
    };

    // Internal: Determines if the given object `property` value is a
    // non-primitive.
    var isHostType = function (object, property) {
      var type = typeof object[property];
      return type == 'object' ? !!object[property] : !PrimitiveTypes[type];
    };

    // Internal: Normalizes the `for...in` iteration algorithm across
    // environments. Each enumerated key is yielded to a `callback` function.
    forEach = function (object, callback) {
      var size = 0, Properties, members, property;

      // Tests for bugs in the current environment's `for...in` algorithm. The
      // `valueOf` property inherits the non-enumerable flag from
      // `Object.prototype` in older versions of IE, Netscape, and Mozilla.
      (Properties = function () {
        this.valueOf = 0;
      }).prototype.valueOf = 0;

      // Iterate over a new instance of the `Properties` class.
      members = new Properties();
      for (property in members) {
        // Ignore all properties inherited from `Object.prototype`.
        if (isProperty.call(members, property)) {
          size++;
        }
      }
      Properties = members = null;

      // Normalize the iteration algorithm.
      if (!size) {
        // A list of non-enumerable properties inherited from `Object.prototype`.
        members = ["valueOf", "toString", "toLocaleString", "propertyIsEnumerable", "isPrototypeOf", "hasOwnProperty", "constructor"];
        // IE <= 8, Mozilla 1.0, and Netscape 6.2 ignore shadowed non-enumerable
        // properties.
        forEach = function (object, callback) {
          var isFunction = getClass.call(object) == functionClass, property, length;
          var hasProperty = !isFunction && typeof object.constructor != 'function' && isHostType(object, 'hasOwnProperty') ? object.hasOwnProperty : isProperty;
          for (property in object) {
            // Gecko <= 1.0 enumerates the `prototype` property of functions under
            // certain conditions; IE does not.
            if (!(isFunction && property == "prototype") && hasProperty.call(object, property)) {
              callback(property);
            }
          }
          // Manually invoke the callback for each non-enumerable property.
          for (length = members.length; property = members[--length]; hasProperty.call(object, property) && callback(property));
        };
      } else if (size == 2) {
        // Safari <= 2.0.4 enumerates shadowed properties twice.
        forEach = function (object, callback) {
          // Create a set of iterated properties.
          var members = {}, isFunction = getClass.call(object) == functionClass, property;
          for (property in object) {
            // Store each property name to prevent double enumeration. The
            // `prototype` property of functions is not enumerated due to cross-
            // environment inconsistencies.
            if (!(isFunction && property == "prototype") && !isProperty.call(members, property) && (members[property] = 1) && isProperty.call(object, property)) {
              callback(property);
            }
          }
        };
      } else {
        // No bugs detected; use the standard `for...in` algorithm.
        forEach = function (object, callback) {
          var isFunction = getClass.call(object) == functionClass, property, isConstructor;
          for (property in object) {
            if (!(isFunction && property == "prototype") && isProperty.call(object, property) && !(isConstructor = property === "constructor")) {
              callback(property);
            }
          }
          // Manually invoke the callback for the `constructor` property due to
          // cross-environment inconsistencies.
          if (isConstructor || isProperty.call(object, (property = "constructor"))) {
            callback(property);
          }
        };
      }
      return forEach(object, callback);
    };

    // Public: Serializes a JavaScript `value` as a JSON string. The optional
    // `filter` argument may specify either a function that alters how object and
    // array members are serialized, or an array of strings and numbers that
    // indicates which properties should be serialized. The optional `width`
    // argument may be either a string or number that specifies the indentation
    // level of the output.
    if (!has("json-stringify")) {
      // Internal: A map of control characters and their escaped equivalents.
      var Escapes = {
        92: "\\\\",
        34: '\\"',
        8: "\\b",
        12: "\\f",
        10: "\\n",
        13: "\\r",
        9: "\\t"
      };

      // Internal: Converts `value` into a zero-padded string such that its
      // length is at least equal to `width`. The `width` must be <= 6.
      var leadingZeroes = "000000";
      var toPaddedString = function (width, value) {
        // The `|| 0` expression is necessary to work around a bug in
        // Opera <= 7.54u2 where `0 == -0`, but `String(-0) !== "0"`.
        return (leadingZeroes + (value || 0)).slice(-width);
      };

      // Internal: Double-quotes a string `value`, replacing all ASCII control
      // characters (characters with code unit values between 0 and 31) with
      // their escaped equivalents. This is an implementation of the
      // `Quote(value)` operation defined in ES 5.1 section 15.12.3.
      var unicodePrefix = "\\u00";
      var quote = function (value) {
        var result = '"', index = 0, length = value.length, isLarge = length > 10 && charIndexBuggy, symbols;
        if (isLarge) {
          symbols = value.split("");
        }
        for (; index < length; index++) {
          var charCode = value.charCodeAt(index);
          // If the character is a control character, append its Unicode or
          // shorthand escape sequence; otherwise, append the character as-is.
          switch (charCode) {
            case 8: case 9: case 10: case 12: case 13: case 34: case 92:
              result += Escapes[charCode];
              break;
            default:
              if (charCode < 32) {
                result += unicodePrefix + toPaddedString(2, charCode.toString(16));
                break;
              }
              result += isLarge ? symbols[index] : charIndexBuggy ? value.charAt(index) : value[index];
          }
        }
        return result + '"';
      };

      // Internal: Recursively serializes an object. Implements the
      // `Str(key, holder)`, `JO(value)`, and `JA(value)` operations.
      var serialize = function (property, object, callback, properties, whitespace, indentation, stack) {
        var value, className, year, month, date, time, hours, minutes, seconds, milliseconds, results, element, index, length, prefix, result;
        try {
          // Necessary for host object support.
          value = object[property];
        } catch (exception) {}
        if (typeof value == "object" && value) {
          className = getClass.call(value);
          if (className == dateClass && !isProperty.call(value, "toJSON")) {
            if (value > -1 / 0 && value < 1 / 0) {
              // Dates are serialized according to the `Date#toJSON` method
              // specified in ES 5.1 section 15.9.5.44. See section 15.9.1.15
              // for the ISO 8601 date time string format.
              if (getDay) {
                // Manually compute the year, month, date, hours, minutes,
                // seconds, and milliseconds if the `getUTC*` methods are
                // buggy. Adapted from @Yaffle's `date-shim` project.
                date = floor(value / 864e5);
                for (year = floor(date / 365.2425) + 1970 - 1; getDay(year + 1, 0) <= date; year++);
                for (month = floor((date - getDay(year, 0)) / 30.42); getDay(year, month + 1) <= date; month++);
                date = 1 + date - getDay(year, month);
                // The `time` value specifies the time within the day (see ES
                // 5.1 section 15.9.1.2). The formula `(A % B + B) % B` is used
                // to compute `A modulo B`, as the `%` operator does not
                // correspond to the `modulo` operation for negative numbers.
                time = (value % 864e5 + 864e5) % 864e5;
                // The hours, minutes, seconds, and milliseconds are obtained by
                // decomposing the time within the day. See section 15.9.1.10.
                hours = floor(time / 36e5) % 24;
                minutes = floor(time / 6e4) % 60;
                seconds = floor(time / 1e3) % 60;
                milliseconds = time % 1e3;
              } else {
                year = value.getUTCFullYear();
                month = value.getUTCMonth();
                date = value.getUTCDate();
                hours = value.getUTCHours();
                minutes = value.getUTCMinutes();
                seconds = value.getUTCSeconds();
                milliseconds = value.getUTCMilliseconds();
              }
              // Serialize extended years correctly.
              value = (year <= 0 || year >= 1e4 ? (year < 0 ? "-" : "+") + toPaddedString(6, year < 0 ? -year : year) : toPaddedString(4, year)) +
                "-" + toPaddedString(2, month + 1) + "-" + toPaddedString(2, date) +
                // Months, dates, hours, minutes, and seconds should have two
                // digits; milliseconds should have three.
                "T" + toPaddedString(2, hours) + ":" + toPaddedString(2, minutes) + ":" + toPaddedString(2, seconds) +
                // Milliseconds are optional in ES 5.0, but required in 5.1.
                "." + toPaddedString(3, milliseconds) + "Z";
            } else {
              value = null;
            }
          } else if (typeof value.toJSON == "function" && ((className != numberClass && className != stringClass && className != arrayClass) || isProperty.call(value, "toJSON"))) {
            // Prototype <= 1.6.1 adds non-standard `toJSON` methods to the
            // `Number`, `String`, `Date`, and `Array` prototypes. JSON 3
            // ignores all `toJSON` methods on these objects unless they are
            // defined directly on an instance.
            value = value.toJSON(property);
          }
        }
        if (callback) {
          // If a replacement function was provided, call it to obtain the value
          // for serialization.
          value = callback.call(object, property, value);
        }
        if (value === null) {
          return "null";
        }
        className = getClass.call(value);
        if (className == booleanClass) {
          // Booleans are represented literally.
          return "" + value;
        } else if (className == numberClass) {
          // JSON numbers must be finite. `Infinity` and `NaN` are serialized as
          // `"null"`.
          return value > -1 / 0 && value < 1 / 0 ? "" + value : "null";
        } else if (className == stringClass) {
          // Strings are double-quoted and escaped.
          return quote("" + value);
        }
        // Recursively serialize objects and arrays.
        if (typeof value == "object") {
          // Check for cyclic structures. This is a linear search; performance
          // is inversely proportional to the number of unique nested objects.
          for (length = stack.length; length--;) {
            if (stack[length] === value) {
              // Cyclic structures cannot be serialized by `JSON.stringify`.
              throw TypeError();
            }
          }
          // Add the object to the stack of traversed objects.
          stack.push(value);
          results = [];
          // Save the current indentation level and indent one additional level.
          prefix = indentation;
          indentation += whitespace;
          if (className == arrayClass) {
            // Recursively serialize array elements.
            for (index = 0, length = value.length; index < length; index++) {
              element = serialize(index, value, callback, properties, whitespace, indentation, stack);
              results.push(element === undef ? "null" : element);
            }
            result = results.length ? (whitespace ? "[\n" + indentation + results.join(",\n" + indentation) + "\n" + prefix + "]" : ("[" + results.join(",") + "]")) : "[]";
          } else {
            // Recursively serialize object members. Members are selected from
            // either a user-specified list of property names, or the object
            // itself.
            forEach(properties || value, function (property) {
              var element = serialize(property, value, callback, properties, whitespace, indentation, stack);
              if (element !== undef) {
                // According to ES 5.1 section 15.12.3: "If `gap` {whitespace}
                // is not the empty string, let `member` {quote(property) + ":"}
                // be the concatenation of `member` and the `space` character."
                // The "`space` character" refers to the literal space
                // character, not the `space` {width} argument provided to
                // `JSON.stringify`.
                results.push(quote(property) + ":" + (whitespace ? " " : "") + element);
              }
            });
            result = results.length ? (whitespace ? "{\n" + indentation + results.join(",\n" + indentation) + "\n" + prefix + "}" : ("{" + results.join(",") + "}")) : "{}";
          }
          // Remove the object from the traversed object stack.
          stack.pop();
          return result;
        }
      };

      // Public: `JSON.stringify`. See ES 5.1 section 15.12.3.
      JSON3.stringify = function (source, filter, width) {
        var whitespace, callback, properties, className;
        if (typeof filter == "function" || typeof filter == "object" && filter) {
          if ((className = getClass.call(filter)) == functionClass) {
            callback = filter;
          } else if (className == arrayClass) {
            // Convert the property names array into a makeshift set.
            properties = {};
            for (var index = 0, length = filter.length, value; index < length; value = filter[index++], ((className = getClass.call(value)), className == stringClass || className == numberClass) && (properties[value] = 1));
          }
        }
        if (width) {
          if ((className = getClass.call(width)) == numberClass) {
            // Convert the `width` to an integer and create a string containing
            // `width` number of space characters.
            if ((width -= width % 1) > 0) {
              for (whitespace = "", width > 10 && (width = 10); whitespace.length < width; whitespace += " ");
            }
          } else if (className == stringClass) {
            whitespace = width.length <= 10 ? width : width.slice(0, 10);
          }
        }
        // Opera <= 7.54u2 discards the values associated with empty string keys
        // (`""`) only if they are used directly within an object member list
        // (e.g., `!("" in { "": 1})`).
        return serialize("", (value = {}, value[""] = source, value), callback, properties, whitespace, "", []);
      };
    }

    // Public: Parses a JSON source string.
    if (!has("json-parse")) {
      var fromCharCode = String.fromCharCode;

      // Internal: A map of escaped control characters and their unescaped
      // equivalents.
      var Unescapes = {
        92: "\\",
        34: '"',
        47: "/",
        98: "\b",
        116: "\t",
        110: "\n",
        102: "\f",
        114: "\r"
      };

      // Internal: Stores the parser state.
      var Index, Source;

      // Internal: Resets the parser state and throws a `SyntaxError`.
      var abort = function() {
        Index = Source = null;
        throw SyntaxError();
      };

      // Internal: Returns the next token, or `"$"` if the parser has reached
      // the end of the source string. A token may be a string, number, `null`
      // literal, or Boolean literal.
      var lex = function () {
        var source = Source, length = source.length, value, begin, position, isSigned, charCode;
        while (Index < length) {
          charCode = source.charCodeAt(Index);
          switch (charCode) {
            case 9: case 10: case 13: case 32:
              // Skip whitespace tokens, including tabs, carriage returns, line
              // feeds, and space characters.
              Index++;
              break;
            case 123: case 125: case 91: case 93: case 58: case 44:
              // Parse a punctuator token (`{`, `}`, `[`, `]`, `:`, or `,`) at
              // the current position.
              value = charIndexBuggy ? source.charAt(Index) : source[Index];
              Index++;
              return value;
            case 34:
              // `"` delimits a JSON string; advance to the next character and
              // begin parsing the string. String tokens are prefixed with the
              // sentinel `@` character to distinguish them from punctuators and
              // end-of-string tokens.
              for (value = "@", Index++; Index < length;) {
                charCode = source.charCodeAt(Index);
                if (charCode < 32) {
                  // Unescaped ASCII control characters (those with a code unit
                  // less than the space character) are not permitted.
                  abort();
                } else if (charCode == 92) {
                  // A reverse solidus (`\`) marks the beginning of an escaped
                  // control character (including `"`, `\`, and `/`) or Unicode
                  // escape sequence.
                  charCode = source.charCodeAt(++Index);
                  switch (charCode) {
                    case 92: case 34: case 47: case 98: case 116: case 110: case 102: case 114:
                      // Revive escaped control characters.
                      value += Unescapes[charCode];
                      Index++;
                      break;
                    case 117:
                      // `\u` marks the beginning of a Unicode escape sequence.
                      // Advance to the first character and validate the
                      // four-digit code point.
                      begin = ++Index;
                      for (position = Index + 4; Index < position; Index++) {
                        charCode = source.charCodeAt(Index);
                        // A valid sequence comprises four hexdigits (case-
                        // insensitive) that form a single hexadecimal value.
                        if (!(charCode >= 48 && charCode <= 57 || charCode >= 97 && charCode <= 102 || charCode >= 65 && charCode <= 70)) {
                          // Invalid Unicode escape sequence.
                          abort();
                        }
                      }
                      // Revive the escaped character.
                      value += fromCharCode("0x" + source.slice(begin, Index));
                      break;
                    default:
                      // Invalid escape sequence.
                      abort();
                  }
                } else {
                  if (charCode == 34) {
                    // An unescaped double-quote character marks the end of the
                    // string.
                    break;
                  }
                  charCode = source.charCodeAt(Index);
                  begin = Index;
                  // Optimize for the common case where a string is valid.
                  while (charCode >= 32 && charCode != 92 && charCode != 34) {
                    charCode = source.charCodeAt(++Index);
                  }
                  // Append the string as-is.
                  value += source.slice(begin, Index);
                }
              }
              if (source.charCodeAt(Index) == 34) {
                // Advance to the next character and return the revived string.
                Index++;
                return value;
              }
              // Unterminated string.
              abort();
            default:
              // Parse numbers and literals.
              begin = Index;
              // Advance past the negative sign, if one is specified.
              if (charCode == 45) {
                isSigned = true;
                charCode = source.charCodeAt(++Index);
              }
              // Parse an integer or floating-point value.
              if (charCode >= 48 && charCode <= 57) {
                // Leading zeroes are interpreted as octal literals.
                if (charCode == 48 && ((charCode = source.charCodeAt(Index + 1)), charCode >= 48 && charCode <= 57)) {
                  // Illegal octal literal.
                  abort();
                }
                isSigned = false;
                // Parse the integer component.
                for (; Index < length && ((charCode = source.charCodeAt(Index)), charCode >= 48 && charCode <= 57); Index++);
                // Floats cannot contain a leading decimal point; however, this
                // case is already accounted for by the parser.
                if (source.charCodeAt(Index) == 46) {
                  position = ++Index;
                  // Parse the decimal component.
                  for (; position < length && ((charCode = source.charCodeAt(position)), charCode >= 48 && charCode <= 57); position++);
                  if (position == Index) {
                    // Illegal trailing decimal.
                    abort();
                  }
                  Index = position;
                }
                // Parse exponents. The `e` denoting the exponent is
                // case-insensitive.
                charCode = source.charCodeAt(Index);
                if (charCode == 101 || charCode == 69) {
                  charCode = source.charCodeAt(++Index);
                  // Skip past the sign following the exponent, if one is
                  // specified.
                  if (charCode == 43 || charCode == 45) {
                    Index++;
                  }
                  // Parse the exponential component.
                  for (position = Index; position < length && ((charCode = source.charCodeAt(position)), charCode >= 48 && charCode <= 57); position++);
                  if (position == Index) {
                    // Illegal empty exponent.
                    abort();
                  }
                  Index = position;
                }
                // Coerce the parsed value to a JavaScript number.
                return +source.slice(begin, Index);
              }
              // A negative sign may only precede numbers.
              if (isSigned) {
                abort();
              }
              // `true`, `false`, and `null` literals.
              if (source.slice(Index, Index + 4) == "true") {
                Index += 4;
                return true;
              } else if (source.slice(Index, Index + 5) == "false") {
                Index += 5;
                return false;
              } else if (source.slice(Index, Index + 4) == "null") {
                Index += 4;
                return null;
              }
              // Unrecognized token.
              abort();
          }
        }
        // Return the sentinel `$` character if the parser has reached the end
        // of the source string.
        return "$";
      };

      // Internal: Parses a JSON `value` token.
      var get = function (value) {
        var results, hasMembers;
        if (value == "$") {
          // Unexpected end of input.
          abort();
        }
        if (typeof value == "string") {
          if ((charIndexBuggy ? value.charAt(0) : value[0]) == "@") {
            // Remove the sentinel `@` character.
            return value.slice(1);
          }
          // Parse object and array literals.
          if (value == "[") {
            // Parses a JSON array, returning a new JavaScript array.
            results = [];
            for (;; hasMembers || (hasMembers = true)) {
              value = lex();
              // A closing square bracket marks the end of the array literal.
              if (value == "]") {
                break;
              }
              // If the array literal contains elements, the current token
              // should be a comma separating the previous element from the
              // next.
              if (hasMembers) {
                if (value == ",") {
                  value = lex();
                  if (value == "]") {
                    // Unexpected trailing `,` in array literal.
                    abort();
                  }
                } else {
                  // A `,` must separate each array element.
                  abort();
                }
              }
              // Elisions and leading commas are not permitted.
              if (value == ",") {
                abort();
              }
              results.push(get(value));
            }
            return results;
          } else if (value == "{") {
            // Parses a JSON object, returning a new JavaScript object.
            results = {};
            for (;; hasMembers || (hasMembers = true)) {
              value = lex();
              // A closing curly brace marks the end of the object literal.
              if (value == "}") {
                break;
              }
              // If the object literal contains members, the current token
              // should be a comma separator.
              if (hasMembers) {
                if (value == ",") {
                  value = lex();
                  if (value == "}") {
                    // Unexpected trailing `,` in object literal.
                    abort();
                  }
                } else {
                  // A `,` must separate each object member.
                  abort();
                }
              }
              // Leading commas are not permitted, object property names must be
              // double-quoted strings, and a `:` must separate each property
              // name and value.
              if (value == "," || typeof value != "string" || (charIndexBuggy ? value.charAt(0) : value[0]) != "@" || lex() != ":") {
                abort();
              }
              results[value.slice(1)] = get(lex());
            }
            return results;
          }
          // Unexpected token encountered.
          abort();
        }
        return value;
      };

      // Internal: Updates a traversed object member.
      var update = function(source, property, callback) {
        var element = walk(source, property, callback);
        if (element === undef) {
          delete source[property];
        } else {
          source[property] = element;
        }
      };

      // Internal: Recursively traverses a parsed JSON object, invoking the
      // `callback` function for each value. This is an implementation of the
      // `Walk(holder, name)` operation defined in ES 5.1 section 15.12.2.
      var walk = function (source, property, callback) {
        var value = source[property], length;
        if (typeof value == "object" && value) {
          // `forEach` can't be used to traverse an array in Opera <= 8.54
          // because its `Object#hasOwnProperty` implementation returns `false`
          // for array indices (e.g., `![1, 2, 3].hasOwnProperty("0")`).
          if (getClass.call(value) == arrayClass) {
            for (length = value.length; length--;) {
              update(value, length, callback);
            }
          } else {
            forEach(value, function (property) {
              update(value, property, callback);
            });
          }
        }
        return callback.call(source, property, value);
      };

      // Public: `JSON.parse`. See ES 5.1 section 15.12.2.
      JSON3.parse = function (source, callback) {
        var result, value;
        Index = 0;
        Source = "" + source;
        result = get(lex());
        // If a JSON string contains multiple tokens, it is invalid.
        if (lex() != "$") {
          abort();
        }
        // Reset the parser state.
        Index = Source = null;
        return callback && getClass.call(callback) == functionClass ? walk((value = {}, value[""] = result, value), "", callback) : result;
      };
    }
  }

  // Export for asynchronous module loaders.
  if (isLoader) {
    define(function () {
      return JSON3;
    });
  }
}(this));

},{}],47:[function(_dereq_,module,exports){
module.exports = toArray

function toArray(list, index) {
    var array = []

    index = index || 0

    for (var i = index || 0; i < list.length; i++) {
        array[i - index] = list[i]
    }

    return array
}

},{}]},{},[1])
(1)
});

/*! adapterjs - v0.10.0 - 2014-12-19 */

// Adapter's interface.
AdapterJS = { options:{} };

// uncomment to get virtual webcams
// AdapterJS.options.getAllCams = true;

// uncomment to prevent the install prompt when the plugin in not yet installed
// AdapterJS.options.hidePluginInstallPrompt

// AdapterJS version
AdapterJS.VERSION = '0.10.0';

// Plugin namespace
AdapterJS.WebRTCPlugin = AdapterJS.WebRTCPlugin || {};

// The object to store plugin information
AdapterJS.WebRTCPlugin.pluginInfo = {
  prefix : 'Tem',
  plugName : 'TemWebRTCPlugin',
  pluginId : 'plugin0',
  type : 'application/x-temwebrtcplugin',
  onload : '__TemWebRTCReady0',
  portalLink : 'http://temasys.atlassian.net/wiki/display/TWPP/WebRTC+Plugins',
  downloadLink : null, //set below
  companyName: 'Temasys'
};
if(!!navigator.platform.match(/^Mac/i)) {
  AdapterJS.WebRTCPlugin.pluginInfo.downloadLink = 'http://bit.ly/1n77hco';
}
else if(!!navigator.platform.match(/^Win/i)) {
  AdapterJS.WebRTCPlugin.pluginInfo.downloadLink = 'http://bit.ly/1kkS4FN';
};

// Unique identifier of each opened page
AdapterJS.WebRTCPlugin.pageId = Math.random().toString(36).slice(2);

// Use this whenever you want to call the plugin.
AdapterJS.WebRTCPlugin.plugin = null;

// Defines webrtc's JS interface according to the plugin's implementation.
// Define plugin Browsers as WebRTC Interface.
AdapterJS.WebRTCPlugin.defineWebRTCInterface = null;

// This function detects whether or not a plugin is installed.
// Checks if Not IE (firefox, for example), else if it's IE,
// we're running IE and do something. If not it is not supported.
AdapterJS.WebRTCPlugin.isPluginInstalled = null;

 // Lets adapter.js wait until the the document is ready before injecting the plugin
AdapterJS.WebRTCPlugin.pluginInjectionInterval = null;

// Inject the HTML DOM object element into the page.
AdapterJS.WebRTCPlugin.injectPlugin = null;

AdapterJS.WebRTCPlugin.PLUGIN_STATES = {
  NONE : 0,           // no plugin use
  INITIALIZING : 1,   // Detected need for plugin
  INJECTING : 2,      // Injecting plugin
  INJECTED: 3,        // Plugin element injected but not usable yet
  READY: 4            // Plugin ready to be used
};

// Current state of the plugin. You cannot use the plugin before this is
// equal to AdapterJS.WebRTCPlugin.PLUGIN_STATES.READY
AdapterJS.WebRTCPlugin.pluginState = AdapterJS.WebRTCPlugin.PLUGIN_STATES.NONE;

// Does a waiting check before proceeding to load the plugin.
AdapterJS.WebRTCPlugin.WaitForPluginReady = null;

// This methid will use an interval to wait for the plugin to be ready.
AdapterJS.WebRTCPlugin.callWhenPluginReady = null;

// This function will be called if the plugin is needed (browser different
// from Chrome or Firefox), but the plugin is not installed.
// Override it according to your application logic.
AdapterJS.WebRTCPlugin.pluginNeededButNotInstalledCb = null;

// !!!! WARNING: DO NOT OVERRIDE THIS FUNCTION. !!!
// This function will be called when plugin is ready. It sends necessary
// details to the plugin.
// If you need to do something once the page/plugin is ready, override
// window.onwebrtcready instead.
// This function is not in the IE/Safari condition brackets so that
// TemPluginLoaded function might be called on Chrome/Firefox.
// This function is the only private function that is not encapsulated to
// allow the plugin method to be called.
__TemWebRTCReady0 = function () {
  arguments.callee.StaticWasInit = arguments.callee.StaticWasInit || 1;
  if (arguments.callee.StaticWasInit === 1) {
    AdapterJS.WebRTCPlugin.documentReadyInterval = setInterval(function () {
      if (document.readyState === 'complete') {
        // TODO: update comments, we wait for the document to be ready
        clearInterval(AdapterJS.WebRTCPlugin.documentReadyInterval);
        AdapterJS.WebRTCPlugin.pluginState = AdapterJS.WebRTCPlugin.PLUGIN_STATES.READY;
      }
    }, 100);
  }
  arguments.callee.StaticWasInit++;
};

// The result of ice connection states.
// - starting: Ice connection is starting.
// - checking: Ice connection is checking.
// - connected Ice connection is connected.
// - completed Ice connection is connected.
// - done Ice connection has been completed.
// - disconnected Ice connection has been disconnected.
// - failed Ice connection has failed.
// - closed Ice connection is closed.
AdapterJS._iceConnectionStates = {
  starting : 'starting',
  checking : 'checking',
  connected : 'connected',
  completed : 'connected',
  done : 'completed',
  disconnected : 'disconnected',
  failed : 'failed',
  closed : 'closed'
};

//The IceConnection states that has been fired for each peer.
AdapterJS._iceConnectionFiredStates = [];


// Check if WebRTC Interface is defined.
AdapterJS.isDefined = null;

// This function helps to retrieve the webrtc detected browser information.
// This sets:
// - webrtcDetectedBrowser: The browser agent name.
// - webrtcDetectedVersion: The browser version.
// - webrtcDetectedType: The types of webRTC support.
//   - 'moz': Mozilla implementation of webRTC.
//   - 'webkit': WebKit implementation of webRTC.
//   - 'plugin': Using the plugin implementation.
AdapterJS.parseWebrtcDetectedBrowser = function () {
  var hasMatch, checkMatch = navigator.userAgent.match(
    /(opera|chrome|safari|firefox|msie|trident(?=\/))\/?\s*(\d+)/i) || [];
  if (/trident/i.test(checkMatch[1])) {
    hasMatch = /\brv[ :]+(\d+)/g.exec(navigator.userAgent) || [];
    webrtcDetectedBrowser = 'IE';
    webrtcDetectedVersion = parseInt(hasMatch[1] || '0', 10);
  } else if (checkMatch[1] === 'Chrome') {
    hasMatch = navigator.userAgent.match(/\bOPR\/(\d+)/);
    if (hasMatch !== null) {
      webrtcDetectedBrowser = 'opera';
      webrtcDetectedVersion = parseInt(hasMatch[1], 10);
    }
  }
  if (navigator.userAgent.indexOf('Safari')) {
    if (typeof InstallTrigger !== 'undefined') {
      webrtcDetectedBrowser = 'firefox';
    } else if (/*@cc_on!@*/ false || !!document.documentMode) {
      webrtcDetectedBrowser = 'IE';
    } else if (
      Object.prototype.toString.call(window.HTMLElement).indexOf('Constructor') > 0) {
      webrtcDetectedBrowser = 'safari';
    } else if (!!window.opera || navigator.userAgent.indexOf(' OPR/') >= 0) {
      webrtcDetectedBrowser = 'opera';
    } else if (!!window.chrome) {
      webrtcDetectedBrowser = 'chrome';
    }
  }
  if (!webrtcDetectedBrowser) {
    webrtcDetectedVersion = checkMatch[1];
  }
  if (!webrtcDetectedVersion) {
    try {
      checkMatch = (checkMatch[2]) ? [checkMatch[1], checkMatch[2]] :
        [navigator.appName, navigator.appVersion, '-?'];
      if ((hasMatch = navigator.userAgent.match(/version\/(\d+)/i)) !== null) {
        checkMatch.splice(1, 1, hasMatch[1]);
      }
      webrtcDetectedVersion = parseInt(checkMatch[1], 10);
    } catch (error) { }
  }
};

// To fix configuration as some browsers does not support
// the 'urls' attribute.
AdapterJS.maybeFixConfiguration = function (pcConfig) {
  if (pcConfig === null) {
    return;
  }
  for (var i = 0; i < pcConfig.iceServers.length; i++) {
    if (pcConfig.iceServers[i].hasOwnProperty('urls')) {
      pcConfig.iceServers[i].url = pcConfig.iceServers[i].urls;
      delete pcConfig.iceServers[i].urls;
    }
  }
};

AdapterJS.addEvent = function(elem, evnt, func) {
   if (elem.addEventListener)  // W3C DOM
      elem.addEventListener(evnt, func, false);
   else if (elem.attachEvent) // OLD IE DOM 
      elem.attachEvent("on"+evnt, func);
   else // No much to do
      elem[evnt] = func;
}

// -----------------------------------------------------------
// Detected webrtc implementation. Types are:
// - 'moz': Mozilla implementation of webRTC.
// - 'webkit': WebKit implementation of webRTC.
// - 'plugin': Using the plugin implementation.
webrtcDetectedType = null;

// Detected webrtc datachannel support. Types are:
// - 'SCTP': SCTP datachannel support.
// - 'RTP': RTP datachannel support.
webrtcDetectedDCSupport = null;

// Set the settings for creating DataChannels, MediaStream for
// Cross-browser compability.
// - This is only for SCTP based support browsers.
// the 'urls' attribute.
checkMediaDataChannelSettings =
  function (peerBrowserAgent, peerBrowserVersion, callback, constraints) {
  if (typeof callback !== 'function') {
    return;
  }
  var beOfferer = true;
  var isLocalFirefox = webrtcDetectedBrowser === 'firefox';
  // Nightly version does not require MozDontOfferDataChannel for interop
  var isLocalFirefoxInterop = webrtcDetectedType === 'moz' && webrtcDetectedVersion > 30;
  var isPeerFirefox = peerBrowserAgent === 'firefox';
  var isPeerFirefoxInterop = peerBrowserAgent === 'firefox' &&
    ((peerBrowserVersion) ? (peerBrowserVersion > 30) : false);

  // Resends an updated version of constraints for MozDataChannel to work
  // If other userAgent is firefox and user is firefox, remove MozDataChannel
  if ((isLocalFirefox && isPeerFirefox) || (isLocalFirefoxInterop)) {
    try {
      delete constraints.mandatory.MozDontOfferDataChannel;
    } catch (error) {
      console.error('Failed deleting MozDontOfferDataChannel');
      console.error(error);
    }
  } else if ((isLocalFirefox && !isPeerFirefox)) {
    constraints.mandatory.MozDontOfferDataChannel = true;
  }
  if (!isLocalFirefox) {
    // temporary measure to remove Moz* constraints in non Firefox browsers
    for (var prop in constraints.mandatory) {
      if (constraints.mandatory.hasOwnProperty(prop)) {
        if (prop.indexOf('Moz') !== -1) {
          delete constraints.mandatory[prop];
        }
      }
    }
  }
  // Firefox (not interopable) cannot offer DataChannel as it will cause problems to the
  // interopability of the media stream
  if (isLocalFirefox && !isPeerFirefox && !isLocalFirefoxInterop) {
    beOfferer = false;
  }
  callback(beOfferer, constraints);
};

// Handles the differences for all browsers ice connection state output.
// - Tested outcomes are:
//   - Chrome (offerer)  : 'checking' > 'completed' > 'completed'
//   - Chrome (answerer) : 'checking' > 'connected'
//   - Firefox (offerer) : 'checking' > 'connected'
//   - Firefox (answerer): 'checking' > 'connected'
checkIceConnectionState = function (peerId, iceConnectionState, callback) {
  if (typeof callback !== 'function') {
    console.warn('No callback specified in checkIceConnectionState. Aborted.');
    return;
  }
  peerId = (peerId) ? peerId : 'peer';

  if (!AdapterJS._iceConnectionFiredStates[peerId] ||
    iceConnectionState === AdapterJS._iceConnectionStates.disconnected ||
    iceConnectionState === AdapterJS._iceConnectionStates.failed ||
    iceConnectionState === AdapterJS._iceConnectionStates.closed) {
    AdapterJS._iceConnectionFiredStates[peerId] = [];
  }
  iceConnectionState = AdapterJS._iceConnectionStates[iceConnectionState];
  if (AdapterJS._iceConnectionFiredStates[peerId].indexOf(iceConnectionState) < 0) {
    AdapterJS._iceConnectionFiredStates[peerId].push(iceConnectionState);
    if (iceConnectionState === AdapterJS._iceConnectionStates.connected) {
      setTimeout(function () {
        AdapterJS._iceConnectionFiredStates[peerId]
          .push(AdapterJS._iceConnectionStates.done);
        callback(AdapterJS._iceConnectionStates.done);
      }, 1000);
    }
    callback(iceConnectionState);
  }
  return;
};

// Firefox:
// - Creates iceServer from the url for Firefox.
// - Create iceServer with stun url.
// - Create iceServer with turn url.
//   - Ignore the transport parameter from TURN url for FF version <=27.
//   - Return null for createIceServer if transport=tcp.
// - FF 27 and above supports transport parameters in TURN url,
// - So passing in the full url to create iceServer.
// Chrome:
// - Creates iceServer from the url for Chrome M33 and earlier.
//   - Create iceServer with stun url.
//   - Chrome M28 & above uses below TURN format.
// Plugin:
// - Creates Ice Server for Plugin Browsers
//   - If Stun - Create iceServer with stun url.
//   - Else - Create iceServer with turn url
//   - This is a WebRTC Function
createIceServer = null;

// Firefox:
// - Creates IceServers for Firefox
//   - Use .url for FireFox.
//   - Multiple Urls support
// Chrome:
// - Creates iceServers from the urls for Chrome M34 and above.
//   - .urls is supported since Chrome M34.
//   - Multiple Urls support
// Plugin:
// - Creates Ice Servers for Plugin Browsers
//   - Multiple Urls support
//   - This is a WebRTC Function
createIceServers = null;
//------------------------------------------------------------

//The RTCPeerConnection object.
RTCPeerConnection = null;

// Creates RTCSessionDescription object for Plugin Browsers
RTCSessionDescription = (typeof RTCSessionDescription === 'function') ?
  RTCSessionDescription : null;

// Creates RTCIceCandidate object for Plugin Browsers
RTCIceCandidate = (typeof RTCIceCandidate === 'function') ?
  RTCIceCandidate : null;

// Get UserMedia (only difference is the prefix).
// Code from Adam Barth.
getUserMedia = null;

// Attach a media stream to an element.
attachMediaStream = null;

// Re-attach a media stream to an element.
reattachMediaStream = null;


// Detected browser agent name. Types are:
// - 'firefox': Firefox browser.
// - 'chrome': Chrome browser.
// - 'opera': Opera browser.
// - 'safari': Safari browser.
// - 'IE' - Internet Explorer browser.
webrtcDetectedBrowser = null;

// Detected browser version.
webrtcDetectedVersion = null;

// Check for browser types and react accordingly
if (navigator.mozGetUserMedia) {
  webrtcDetectedBrowser = 'firefox';
  webrtcDetectedVersion = parseInt(navigator
    .userAgent.match(/Firefox\/([0-9]+)\./)[1], 10);
  webrtcDetectedType = 'moz';
  webrtcDetectedDCSupport = 'SCTP';

  RTCPeerConnection = function (pcConfig, pcConstraints) {
    AdapterJS.maybeFixConfiguration(pcConfig);
    return new mozRTCPeerConnection(pcConfig, pcConstraints);
  };

 // The RTCSessionDescription object.
  RTCSessionDescription = mozRTCSessionDescription;
  window.RTCSessionDescription = RTCSessionDescription;

  // The RTCIceCandidate object.
  RTCIceCandidate = mozRTCIceCandidate;
  window.RTCIceCandidate = RTCIceCandidate;

  getUserMedia = navigator.mozGetUserMedia.bind(navigator);
  navigator.getUserMedia = getUserMedia;

  // Shim for MediaStreamTrack.getSources.
  MediaStreamTrack.getSources = function(successCb) {
    setTimeout(function() {
      var infos = [
        { kind: 'audio', id: 'default', label:'', facing:'' },
        { kind: 'video', id: 'default', label:'', facing:'' }
      ];
      successCb(infos);
    }, 0);
  };

  createIceServer = function (url, username, password) {
    var iceServer = null;
    var url_parts = url.split(':');
    if (url_parts[0].indexOf('stun') === 0) {
      iceServer = { url : url };
    } else if (url_parts[0].indexOf('turn') === 0) {
      if (webrtcDetectedVersion < 27) {
        var turn_url_parts = url.split('?');
        if (turn_url_parts.length === 1 ||
          turn_url_parts[1].indexOf('transport=udp') === 0) {
          iceServer = {
            url : turn_url_parts[0],
            credential : password,
            username : username
          };
        }
      } else {
        iceServer = {
          url : url,
          credential : password,
          username : username
        };
      }
    }
    return iceServer;
  };

  createIceServers = function (urls, username, password) {
    var iceServers = [];
    for (i = 0; i < urls.length; i++) {
      var iceServer = createIceServer(urls[i], username, password);
      if (iceServer !== null) {
        iceServers.push(iceServer);
      }
    }
    return iceServers;
  };

  attachMediaStream = function (element, stream) {
    element.mozSrcObject = stream;
    element.play();
    return element;
  };

  reattachMediaStream = function (to, from) {
    to.mozSrcObject = from.mozSrcObject;
    to.play();
    return to;
  };

  MediaStreamTrack.getSources = MediaStreamTrack.getSources || function (callback) {
    if (!callback) {
      throw new TypeError('Failed to execute \'getSources\' on \'MediaStreamTrack\'' +
        ': 1 argument required, but only 0 present.');
    }
    return callback([]);
  };

  // Fake get{Video,Audio}Tracks
  if (!MediaStream.prototype.getVideoTracks) {
    MediaStream.prototype.getVideoTracks = function () {
      return [];
    };
  }
  if (!MediaStream.prototype.getAudioTracks) {
    MediaStream.prototype.getAudioTracks = function () {
      return [];
    };
  }
} else if (navigator.webkitGetUserMedia) {
  webrtcDetectedBrowser = 'chrome';
  webrtcDetectedType = 'webkit';
  webrtcDetectedVersion = parseInt(navigator
    .userAgent.match(/Chrom(e|ium)\/([0-9]+)\./)[2], 10);
  // check if browser is opera 20+
  var checkIfOpera = navigator.userAgent.match(/\bOPR\/(\d+)/);
  if (checkIfOpera !== null) {
    webrtcDetectedBrowser = 'opera';
    webrtcDetectedVersion = parseInt(checkIfOpera[1], 10);
  }
  // check browser datachannel support
  if ((webrtcDetectedBrowser === 'chrome' && webrtcDetectedVersion >= 31) ||
    (webrtcDetectedBrowser === 'opera' && webrtcDetectedVersion >= 20)) {
    webrtcDetectedDCSupport = 'SCTP';
  } else if (webrtcDetectedBrowser === 'chrome' && webrtcDetectedVersion < 30 &&
    webrtcDetectedVersion > 24) {
    webrtcDetectedDCSupport = 'RTP';
  } else {
    webrtcDetectedDCSupport = '';
  }

  createIceServer = function (url, username, password) {
    var iceServer = null;
    var url_parts = url.split(':');
    if (url_parts[0].indexOf('stun') === 0) {
      iceServer = { 'url' : url };
    } else if (url_parts[0].indexOf('turn') === 0) {
      iceServer = {
        'url' : url,
        'credential' : password,
        'username' : username
      };
    }
    return iceServer;
  };

  createIceServers = function (urls, username, password) {
    var iceServers = [];
    if (webrtcDetectedVersion >= 34) {
      iceServers = {
        'urls' : urls,
        'credential' : password,
        'username' : username
      };
    } else {
      for (i = 0; i < urls.length; i++) {
        var iceServer = createIceServer(urls[i], username, password);
        if (iceServer !== null) {
          iceServers.push(iceServer);
        }
      }
    }
    return iceServers;
  };

  RTCPeerConnection = function (pcConfig, pcConstraints) {
    if (webrtcDetectedVersion < 34) {
      AdapterJS.maybeFixConfiguration(pcConfig);
    }
    return new webkitRTCPeerConnection(pcConfig, pcConstraints);
  };

  getUserMedia = navigator.webkitGetUserMedia.bind(navigator);
  navigator.getUserMedia = getUserMedia;

  attachMediaStream = function (element, stream) {
    if (typeof element.srcObject !== 'undefined') {
      element.srcObject = stream;
    } else if (typeof element.mozSrcObject !== 'undefined') {
      element.mozSrcObject = stream;
    } else if (typeof element.src !== 'undefined') {
      element.src = URL.createObjectURL(stream);
    } else {
      console.log('Error attaching stream to element.');
    }
    return element;
  };

  reattachMediaStream = function (to, from) {
    to.src = from.src;
    return to;
  };
} else { // TRY TO USE PLUGIN
  // IE 9 is not offering an implementation of console.log until you open a console
  if (typeof console !== 'object' || typeof console.log !== 'function') {
    /* jshint -W020 */
    console = {} || console;
    // Implemented based on console specs from MDN
    // You may override these functions
    console.log = function (arg) {};
    console.info = function (arg) {};
    console.error = function (arg) {};
    console.dir = function (arg) {};
    console.exception = function (arg) {};
    console.trace = function (arg) {};
    console.warn = function (arg) {};
    console.count = function (arg) {};
    console.debug = function (arg) {};
    console.count = function (arg) {};
    console.time = function (arg) {};
    console.timeEnd = function (arg) {};
    console.group = function (arg) {};
    console.groupCollapsed = function (arg) {};
    console.groupEnd = function (arg) {};
    /* jshint +W020 */
  }
  webrtcDetectedType = 'plugin';
  webrtcDetectedDCSupport = 'plugin';
  AdapterJS.parseWebrtcDetectedBrowser();
  isIE = webrtcDetectedBrowser === 'IE';

  /* jshint -W035 */
  AdapterJS.WebRTCPlugin.WaitForPluginReady = function() {
    while (AdapterJS.WebRTCPlugin.pluginState !== AdapterJS.WebRTCPlugin.PLUGIN_STATES.READY) {
      /* empty because it needs to prevent the function from running. */
    }
  };
  /* jshint +W035 */

  AdapterJS.WebRTCPlugin.callWhenPluginReady = function (callback) {
    var checkPluginReadyState = setInterval(function () {
      if (AdapterJS.WebRTCPlugin.pluginState === AdapterJS.WebRTCPlugin.PLUGIN_STATES.READY) {
        clearInterval(checkPluginReadyState);
        callback();
      }
    }, 100);
  };

  AdapterJS.WebRTCPlugin.injectPlugin = function () {
    // only inject once the page is ready
    if (document.readyState !== 'complete')
      return;

    // Prevent multiple injections
    if (AdapterJS.WebRTCPlugin.pluginState !== AdapterJS.WebRTCPlugin.PLUGIN_STATES.INITIALIZING)
      return;

    AdapterJS.WebRTCPlugin.pluginState = AdapterJS.WebRTCPlugin.PLUGIN_STATES.INJECTING;

    if (webrtcDetectedBrowser === 'IE' && webrtcDetectedVersion <= 10) {
      var frag = document.createDocumentFragment();
      AdapterJS.WebRTCPlugin.plugin = document.createElement('div');
      AdapterJS.WebRTCPlugin.plugin.innerHTML = '<object id="' +
        AdapterJS.WebRTCPlugin.pluginInfo.pluginId + '" type="' +
        AdapterJS.WebRTCPlugin.pluginInfo.type + '" ' + 'width="1" height="1">' +
        '<param name="pluginId" value="' +
        AdapterJS.WebRTCPlugin.pluginInfo.pluginId + '" /> ' +
        '<param name="windowless" value="false" /> ' +
        '<param name="pageId" value="' + AdapterJS.WebRTCPlugin.pageId + '" /> ' +
        '<param name="onload" value="' + AdapterJS.WebRTCPlugin.pluginInfo.onload +
        '" />' +
        // uncomment to be able to use virtual cams
        (AdapterJS.options.getAllCams ? '<param name="forceGetAllCams" value="True" />':'') +
	
        '</object>';
      while (AdapterJS.WebRTCPlugin.plugin.firstChild) {
        frag.appendChild(AdapterJS.WebRTCPlugin.plugin.firstChild);
      }
      document.body.appendChild(frag);

      // Need to re-fetch the plugin
      AdapterJS.WebRTCPlugin.plugin =
        document.getElementById(AdapterJS.WebRTCPlugin.pluginInfo.pluginId);
    } else {
      // Load Plugin
      AdapterJS.WebRTCPlugin.plugin = document.createElement('object');
      AdapterJS.WebRTCPlugin.plugin.id =
        AdapterJS.WebRTCPlugin.pluginInfo.pluginId;
      // IE will only start the plugin if it's ACTUALLY visible
      if (isIE) {
        AdapterJS.WebRTCPlugin.plugin.width = '1px';
        AdapterJS.WebRTCPlugin.plugin.height = '1px';
      }
      AdapterJS.WebRTCPlugin.plugin.width = '1px';
      AdapterJS.WebRTCPlugin.plugin.height = '1px';
      AdapterJS.WebRTCPlugin.plugin.type = AdapterJS.WebRTCPlugin.pluginInfo.type;
      AdapterJS.WebRTCPlugin.plugin.innerHTML = '<param name="onload" value="' +
        AdapterJS.WebRTCPlugin.pluginInfo.onload + '">' +
        '<param name="pluginId" value="' +
        AdapterJS.WebRTCPlugin.pluginInfo.pluginId + '">' +
        '<param name="windowless" value="false" /> ' +
        (AdapterJS.options.getAllCams ? '<param name="forceGetAllCams" value="True" />':'') +
        '<param name="pageId" value="' + AdapterJS.WebRTCPlugin.pageId + '">';
      document.body.appendChild(AdapterJS.WebRTCPlugin.plugin);
    }


    AdapterJS.WebRTCPlugin.pluginState = AdapterJS.WebRTCPlugin.PLUGIN_STATES.INJECTED;
  };

  AdapterJS.WebRTCPlugin.isPluginInstalled =
    function (comName, plugName, installedCb, notInstalledCb) {
    if (!isIE) {
      var pluginArray = navigator.plugins;
      for (var i = 0; i < pluginArray.length; i++) {
        if (pluginArray[i].name.indexOf(plugName) >= 0) {
          installedCb();
          return;
        }
      }
      notInstalledCb();
    } else {
      try {
        var axo = new ActiveXObject(comName + '.' + plugName);
      } catch (e) {
        notInstalledCb();
        return;
      }
      installedCb();
    }
  };

  AdapterJS.WebRTCPlugin.defineWebRTCInterface = function () {
    AdapterJS.WebRTCPlugin.pluginState = AdapterJS.WebRTCPlugin.PLUGIN_STATES.INITIALIZING;

    AdapterJS.isDefined = function (variable) {
      return variable !== null && variable !== undefined;
    };

    createIceServer = function (url, username, password) {
      var iceServer = null;
      var url_parts = url.split(':');
      if (url_parts[0].indexOf('stun') === 0) {
        iceServer = {
          'url' : url,
          'hasCredentials' : false
        };
      } else if (url_parts[0].indexOf('turn') === 0) {
        iceServer = {
          'url' : url,
          'hasCredentials' : true,
          'credential' : password,
          'username' : username
        };
      }
      return iceServer;
    };

    createIceServers = function (urls, username, password) {
      var iceServers = [];
      for (var i = 0; i < urls.length; ++i) {
        iceServers.push(createIceServer(urls[i], username, password));
      }
      return iceServers;
    };

    RTCSessionDescription = function (info) {
      AdapterJS.WebRTCPlugin.WaitForPluginReady();
      return AdapterJS.WebRTCPlugin.plugin.
        ConstructSessionDescription(info.type, info.sdp);
    };

    RTCPeerConnection = function (servers, constraints) {
      var iceServers = null;
      if (servers) {
        iceServers = servers.iceServers;
        for (var i = 0; i < iceServers.length; i++) {
          if (iceServers[i].urls && !iceServers[i].url) {
            iceServers[i].url = iceServers[i].urls;
          }
          iceServers[i].hasCredentials = AdapterJS.
            isDefined(iceServers[i].username) &&
            AdapterJS.isDefined(iceServers[i].credential);
        }
      }
      var mandatory = (constraints && constraints.mandatory) ?
        constraints.mandatory : null;
      var optional = (constraints && constraints.optional) ?
        constraints.optional : null;

      AdapterJS.WebRTCPlugin.WaitForPluginReady();
      return AdapterJS.WebRTCPlugin.plugin.
        PeerConnection(AdapterJS.WebRTCPlugin.pageId,
        iceServers, mandatory, optional);
    };

    MediaStreamTrack = {};
    MediaStreamTrack.getSources = function (callback) {
      AdapterJS.WebRTCPlugin.callWhenPluginReady(function() {
        AdapterJS.WebRTCPlugin.plugin.GetSources(callback);
      });
    };

    getUserMedia = function (constraints, successCallback, failureCallback) {
      if (!constraints.audio) {
        constraints.audio = false;
      }

      AdapterJS.WebRTCPlugin.callWhenPluginReady(function() {
        AdapterJS.WebRTCPlugin.plugin.
          getUserMedia(constraints, successCallback, failureCallback);
      });
    };
    navigator.getUserMedia = getUserMedia;

    attachMediaStream = function (element, stream) {
      stream.enableSoundTracks(true);
      if (element.nodeName.toLowerCase() !== 'audio') {
        var elementId = element.id.length === 0 ? Math.random().toString(36).slice(2) : element.id;
        if (!element.isWebRTCPlugin || !element.isWebRTCPlugin()) {
          var frag = document.createDocumentFragment();
          var temp = document.createElement('div');
          var classHTML = (element.className) ? 'class="' + element.className + '" ' : '';
          temp.innerHTML = '<object id="' + elementId + '" ' + classHTML +
            'type="' + AdapterJS.WebRTCPlugin.pluginInfo.type + '">' +
            '<param name="pluginId" value="' + elementId + '" /> ' +
            '<param name="pageId" value="' + AdapterJS.WebRTCPlugin.pageId + '" /> ' +
            '<param name="windowless" value="true" /> ' +
            '<param name="streamId" value="' + stream.id + '" /> ' +
            '</object>';
          while (temp.firstChild) {
            frag.appendChild(temp.firstChild);
          }
          var rectObject = element.getBoundingClientRect();
          element.parentNode.insertBefore(frag, element);
          frag = document.getElementById(elementId);
          frag.width = rectObject.width + 'px';
          frag.height = rectObject.height + 'px';
          element.parentNode.removeChild(element);
        } else {
          var children = element.children;
          for (var i = 0; i !== children.length; ++i) {
            if (children[i].name === 'streamId') {
              children[i].value = stream.id;
              break;
            }
          }
          element.setStreamId(stream.id);
        }
        var newElement = document.getElementById(elementId);
        newElement.onplaying = (element.onplaying) ? element.onplaying : function (arg) {};
        if (isIE) { // on IE the event needs to be plugged manually
          newElement.attachEvent('onplaying', newElement.onplaying);
          newElement.onclick = (element.onclick) ? element.onclick : function (arg) {};
          newElement._TemOnClick = function (id) {
            var arg = {
              srcElement : document.getElementById(id)
            };
            newElement.onclick(arg);
          };
        }
        return newElement;
      } else {
        return element;
      }
    };

    reattachMediaStream = function (to, from) {
      var stream = null;
      var children = from.children;
      for (var i = 0; i !== children.length; ++i) {
        if (children[i].name === 'streamId') {
          AdapterJS.WebRTCPlugin.WaitForPluginReady();
          stream = AdapterJS.WebRTCPlugin.plugin
            .getStreamWithId(AdapterJS.WebRTCPlugin.pageId, children[i].value);
          break;
        }
      }
      if (stream !== null) {
        return attachMediaStream(to, stream);
      } else {
        console.log('Could not find the stream associated with this element');
      }
    };

    RTCIceCandidate = function (candidate) {
      if (!candidate.sdpMid) {
        candidate.sdpMid = '';
      }

      AdapterJS.WebRTCPlugin.WaitForPluginReady();
      return AdapterJS.WebRTCPlugin.plugin.ConstructIceCandidate(
        candidate.sdpMid, candidate.sdpMLineIndex, candidate.candidate
      );
    };

    // inject plugin
    AdapterJS.addEvent(document, 'readystatechange', AdapterJS.WebRTCPlugin.injectPlugin);
    AdapterJS.WebRTCPlugin.injectPlugin();
  };

  AdapterJS.WebRTCPlugin.pluginNeededButNotInstalledCb = function() {
    AdapterJS.addEvent(document, 'readystatechange', AdapterJS.WebRTCPlugin.pluginNeededButNotInstalledCbPriv);
    AdapterJS.WebRTCPlugin.pluginNeededButNotInstalledCbPriv();
  }

  AdapterJS.WebRTCPlugin.pluginNeededButNotInstalledCbPriv = function () {
    if (AdapterJS.options.hidePluginInstallPrompt)
      return;

    var downloadLink = AdapterJS.WebRTCPlugin.pluginInfo.downloadLink;
    if(downloadLink) {
      var popupString;
      if (AdapterJS.WebRTCPlugin.pluginInfo.downloadLink) {
       popupString = 'This website requires you to install the ' +
        ' <a href="' + AdapterJS.WebRTCPlugin.pluginInfo.portalLink + 
        '" target="_blank">' + AdapterJS.WebRTCPlugin.pluginInfo.companyName +
        ' WebRTC Plugin</a>' +
        ' to work on this browser.';
      } else {
       popupString = 'This website requires you to install a WebRTC-enabling plugin ' +
        'to work on this browser.';
      }

      AdapterJS.WebRTCPlugin.renderNotificationBar(popupString, 'Install Now', downloadLink);
    }
    else {
      AdapterJS.WebRTCPlugin.renderNotificationBar('Your browser does not support WebRTC.');
    }
  };

  AdapterJS.WebRTCPlugin.renderNotificationBar = function (text, buttonText, buttonLink) {
    // only inject once the page is ready
    if (document.readyState !== 'complete')
      return;

    var w = window;
    var i = document.createElement('iframe');
    i.style.position = 'fixed';
    i.style.top = '-41px';
    i.style.left = 0;
    i.style.right = 0;
    i.style.width = '100%';
    i.style.height = '40px';
    i.style.backgroundColor = '#ffffe1';
    i.style.border = 'none';
    i.style.borderBottom = '1px solid #888888';
    i.style.zIndex = '9999999';
    if(typeof i.style.webkitTransition === 'string') {
      i.style.webkitTransition = 'all .5s ease-out';
    } else if(typeof i.style.transition === 'string') {
      i.style.transition = 'all .5s ease-out';
    }
    document.body.appendChild(i);
    c = (i.contentWindow) ? i.contentWindow :
      (i.contentDocument.document) ? i.contentDocument.document : i.contentDocument;
    c.document.open();
    c.document.write('<span style="font-family: Helvetica, Arial,' +
      'sans-serif; font-size: .9rem; padding: 7px; vertical-align: ' +
      'middle; cursor: default;">' + text + '</span>');
    if(buttonText && buttonLink) {
      c.document.write('<button id="okay">' + buttonText + '</button><button>Cancel</button>');
      c.document.close();
      AdapterJS.addEvent(c.document.getElementById('okay'), 'click', function(e) {
        window.open(buttonLink, '_top');
        e.preventDefault();
        try {
          event.cancelBubble = true;
        } catch(error) { }
      });
    }
    else {
      c.document.close();
    }
    AdapterJS.addEvent(c.document, 'click', function() {
      w.document.body.removeChild(i);
    });
    setTimeout(function() {
      if(typeof i.style.webkitTransform === 'string') {
        i.style.webkitTransform = 'translateY(40px)';
      } else if(typeof i.style.transform === 'string') {
        i.style.transform = 'translateY(40px)';
      } else {
        i.style.top = '0px';
      }
    }, 300);
  };
  // Try to detect the plugin and act accordingly
  AdapterJS.WebRTCPlugin.isPluginInstalled(AdapterJS.WebRTCPlugin.pluginInfo.prefix, AdapterJS.WebRTCPlugin.pluginInfo.plugName,
    AdapterJS.WebRTCPlugin.defineWebRTCInterface,
    AdapterJS.WebRTCPlugin.pluginNeededButNotInstalledCb);
}

/*! skylinkjs - v0.5.7 - 2015-02-21 */

var globals = {
  apiKey: null,

  region: 'us2',

  defaultRoom: null,

  roomServer: '//api.temasys.com.sg',

  enforceSSL: false,

  socketTimeout: 0,

  TURNServer: true,

  STUNServer: true,

  ICETrickle: true,

  TURNTransport: 'any',

  dataChannel: true,

  audioFallback: false,

  credentials: null
};

var fn = {
  isEmpty: function (data) {
    var isUnDefined = typeof data === 'undefined' || data === null;

    if (typeof data === 'object' && !isUnDefined) {
      if (data.constructor === Array) {
        return data.length === 0;

      } else {
        return Object.keys(data).length === 0;
      }
    }
    return isUnDefined;
  },

  isSafe: function (unsafeFn) {
    try {
      return unsafeFn();
    } catch (error){
      log.warn('Function', error);
      return false;
    }
  },

  runSync: function () {
    var args = Array.prototype.slice.call(arguments);
    var i;

    var run = function (fn) {
      setTimeout(fn, 1);

      args.splice(0, 1);

      if (args.length === 0) {
        return;
      }
      run(args[0]);
    };

    run(args[0]);
  },

  constant: function (main, property, value) {
    var obj = {};
    obj[property] = {
      value: value,
      enumerable: true
    };
    Object.defineProperties(main, obj);
  },

  generateUID: function() {
    return (new Date()).getTime().toString();
  },

  applyHandler: function (callee, params, args) {
    var item = callee;
    var i;

    for (i = 0; i < params.length; i += 1) {
      if (!fn.isEmpty(item[params[i]])) {
        item = item[params[i]];
      }
    }

    if (typeof item === 'function') {
      item.apply(this, args);
    }
  }

};

var log = {};

// Parse if debug is not defined
if (typeof window.console.debug !== 'function') {
  window.console.newDebug = window.console.log;

} else {
  window.console.newDebug = window.console.debug;
}

// Parse if trace is not defined
if (typeof window.console.trace !== 'function') {
  window.console.newTrace = window.console.log;

} else {
  window.console.newTrace = window.console.trace;
}

/**
 * The log key
 * @attribute LogKey
 * @type String
 * @readOnly
 * @for Debugger
 * @since 0.5.4
 */
var LogKey = 'Skylink - ';

var Debugger = {
  /**
   * The current log level of Skylink.
   * @property level
   * @type Integer
   * @for Debugger
   * @since 0.5.4
   */
  level: 2,

  trace: false,

  /**
   * The flag that indicates if Skylink should store the debug logs.
   * @property store
   * @type Boolean
   * @for Debugger
   * @since 0.5.4
   */
  store: false,

  logs: [],

  console: {
    log: window.console.log.bind(window.console, LogKey + '%s> %s'),

    error: window.console.error.bind(window.console, LogKey + '%s> %s'),

    info: window.console.info.bind(window.console,
      (window.webrtcDetectedBrowser === 'safari' ? 'INFO: ' : '') + LogKey + '%s> %s'),

    warn: window.console.warn.bind(window.console, LogKey + '%s> %s'),

    debug: window.console.newDebug.bind(window.console,
      (typeof window.console.debug !== 'function' ? 'DEBUG: ' : '') + LogKey + '%s> %s')
  },

  traceTemplate: {
    log: '==LOG== ' + LogKey + '%s',
    error: '==ERROR== ' + LogKey + '%s',
    info: '==INFO== ' + LogKey + '%s',
    warn: '==WARN== ' + LogKey + '%s',
    debug: '==DEBUG== ' + LogKey + '%s'
  },

  applyConsole: function (type) {
    var args = Array.prototype.slice.call(arguments);
    args.shift();

    if (this.store) {
      logs.push(type, args, (new Date()));
    }

    if (this.trace) {
      return window.console.newTrace.bind(window.console, this.traceTemplate[type]);
    }
    return this.console[type];
  },

  setLevel: function (inputLevel) {
    // Debug level
    if (inputLevel > 3) {
      log.debug = this.applyConsole('debug');

    } else {
      log.debug = function () { };
    }

    // Log level
    if (inputLevel > 2) {
      log.log = this.applyConsole('log');

    } else {
      log.log = function () { };
    }

    // Info level
    if (inputLevel > 1) {
      log.info = this.applyConsole('info');

    } else {
      log.info = function () { };
    }

    // Warn level
    if (inputLevel > 0) {
      log.warn = this.applyConsole('warn');

    } else {
      log.warn = function () { };
    }

    // Error level
    if (inputLevel > -1) {
      log.error = this.applyConsole('error');

    } else {
      log.error = function () { };
    }

    this.level = inputLevel;
  },

  configure: function (options) {
    options = options || {};

    // Set if should store logs
    Debugger.store = !!options.store;

    // Set if should trace
    Debugger.trace = !!options.trace;

    // Set log level
    Debugger.setLevel( typeof options.level === 'number' ? options.level : 2 );
  }
};

Debugger.setLevel(4);

var Skylink = {};

var rooms = [];

var Config = function (options) {
  globals.apiKey = options.apiKey;
  
};

Skylink.init = function (apiKey, name, listener) {
  rooms[name] = new Room(name, listener);
  
  return rooms[name];
};
Skylink.DATA_CHANNEL_STATE = {
  CONNECTING: 'connecting',
  OPEN: 'open',
  CLOSING: 'closing',
  CLOSED: 'closed',
  ERROR: 'error'
};

Skylink.DATA_TRANSFER_DATA_TYPE = {
  BINARY_STRING: 'binaryString',
  ARRAY_BUFFER: 'arrayBuffer',
  BLOB: 'blob'
};

Skylink.DATA_TRANSFER_TYPE = {
  UPLOAD: 'upload',
  DOWNLOAD: 'download'
};

Skylink.DATA_TRANSFER_STATE = {
  UPLOAD_REQUEST: 'request',
  UPLOAD_STARTED: 'uploadStarted',
  DOWNLOAD_STARTED: 'downloadStarted',
  REJECTED: 'rejected',
  CANCEL: 'cancel',
  ERROR: 'error',
  UPLOADING: 'uploading',
  DOWNLOADING: 'downloading',
  UPLOAD_COMPLETED: 'uploadCompleted',
  DOWNLOAD_COMPLETED: 'downloadCompleted'
};

Skylink.CANDIDATE_GENERATION_STATE = {
  NEW: 'new',
  GATHERING: 'gathering',
  COMPLETED: 'completed'
};

Skylink.ICE_CONNECTION_STATE = {
  STARTING: 'starting',
  CHECKING: 'checking',
  CONNECTED: 'connected',
  COMPLETED: 'completed',
  CLOSED: 'closed',
  FAILED: 'failed',
  DISCONNECTED: 'disconnected'
};

Skylink.TURN_TRANSPORT = {
  UDP: 'udp',
  TCP: 'tcp',
  ANY: 'any',
  NONE: 'none'
};

Skylink.PEER_CONNECTION_STATE = {
  STABLE: 'stable',
  HAVE_LOCAL_OFFER: 'have-local-offer',
  HAVE_REMOTE_OFFER: 'have-remote-offer',
  HAVE_LOCAL_PRANSWER: 'have-local-pranswer',
  HAVE_REMOTE_PRANSWER: 'have-remote-pranswer',
  CLOSED: 'closed'
};

Skylink.HANDSHAKE_PROGRESS = {
  ENTER: 'enter',
  WELCOME: 'welcome',
  OFFER: 'offer',
  ANSWER: 'answer',
  ERROR: 'error'
};

Skylink.SYSTEM_ACTION = {
  WARNING: 'warning',
  REJECT: 'reject'
};

Skylink.SYSTEM_ACTION_REASON = {
  FAST_MESSAGE: 'fastmsg',
  ROOM_LOCKED: 'locked',
  ROOM_FULL: 'roomfull',
  DUPLICATED_LOGIN: 'duplicatedLogin',
  SERVER_ERROR: 'serverError',
  VERIFICATION: 'verification',
  EXPIRED: 'expired',
  ROOM_CLOSED: 'roomclose',
  ROOM_CLOSING: 'toclose',
  OVER_SEAT_LIMIT: 'seatquota'
};

Skylink.READY_STATE_CHANGE = {
  INIT: 0,
  LOADING: 1,
  COMPLETED: 2,
  ERROR: -1
};

Skylink.READY_STATE_CHANGE_ERROR = {
  API_INVALID: 4001,
  API_DOMAIN_NOT_MATCH: 4002,
  API_CORS_DOMAIN_NOT_MATCH: 4003,
  API_CREDENTIALS_INVALID: 4004,
  API_CREDENTIALS_NOT_MATCH: 4005,
  API_INVALID_PARENT_KEY: 4006,
  API_NOT_ENOUGH_CREDIT: 4007,
  API_NOT_ENOUGH_PREPAID_CREDIT: 4008,
  API_FAILED_FINDING_PREPAID_CREDIT: 4009,
  API_NO_MEETING_RECORD_FOUND: 4010,
  ROOM_LOCKED: 5001,
  NO_SOCKET_IO: 1,
  NO_XMLHTTPREQUEST_SUPPORT: 2,
  NO_WEBRTC_SUPPORT: 3,
  NO_PATH: 4,
  INVALID_XMLHTTPREQUEST_STATUS: 5,
  SCRIPT_ERROR: 6
};

Skylink.REGIONAL_SERVER = {
  APAC1: 'sg',
  US1: 'us2'
};

Skylink.LOG_LEVEL = {
  DEBUG: 4,
  LOG: 3,
  INFO: 2,
  WARN: 1,
  ERROR: 0
};

Skylink.SOCKET_ERROR = {
  CONNECTION_FAILED: 0,
  RECONNECTION_FAILED: -1,
  CONNECTION_ABORTED: -2,
  RECONNECTION_ABORTED: -3,
  RECONNECTION_ATTEMPT: -4
};

Skylink.SOCKET_FALLBACK = {
  NON_FALLBACK: 'nonfallback',
  FALLBACK_PORT: 'fallbackPortNonSSL',
  FALLBACK_SSL_PORT: 'fallbackPortSSL',
  LONG_POLLING: 'fallbackLongPollingNonSSL',
  LONG_POLLING_SSL: 'fallbackLongPollingSSL'
};

Skylink.VIDEO_RESOLUTION = {
  QQVGA: { width: 160, height: 120, aspectRatio: '4:3' },
  HQVGA: { width: 240, height: 160, aspectRatio: '3:2' },
  QVGA: { width: 320, height: 180, aspectRatio: '4:3' },
  WQVGA: { width: 384, height: 240, aspectRatio: '16:10' },
  HVGA: { width: 480, height: 320, aspectRatio: '3:2' },
  VGA: { width: 640, height: 360, aspectRatio: '4:3' },
  WVGA: { width: 768, height: 480, aspectRatio: '16:10' },
  FWVGA: { width: 854, height: 480, aspectRatio: '16:9' },
  SVGA: { width: 800, height: 600, aspectRatio: '4:3' },
  DVGA: { width: 960, height: 640, aspectRatio: '3:2' },
  WSVGA: { width: 1024, height: 576, aspectRatio: '16:9' },
  HD: { width: 1280, height: 720, aspectRatio: '16:9' },
  HDPLUS: { width: 1600, height: 900, aspectRatio: '16:9' },
  FHD: { width: 1920, height: 1080, aspectRatio: '16:9' },
  QHD: { width: 2560, height: 1440, aspectRatio: '16:9' },
  WQXGAPLUS: { width: 3200, height: 1800, aspectRatio: '16:9' },
  UHD: { width: 3840, height: 2160, aspectRatio: '16:9' },
  UHDPLUS: { width: 5120, height: 2880, aspectRatio: '16:9' },
  FUHD: { width: 7680, height: 4320, aspectRatio: '16:9' },
  QUHD: { width: 15360, height: 8640, aspectRatio: '16:9' }
};
var DataProcess = {
  
  chunkSize: 49152,
  
  mozChunkSize: 16384,
  
  chunk: function (blob) {
    var chunksArray = [],
    startCount = 0,
    endCount = 0;
    
    if (blobByteSize > this.chunkSize) {
      // File Size greater than Chunk size
      while ((blobByteSize - 1) > endCount) {
        endCount = startCount + this.chunkSize;
        chunksArray.push(blob.slice(startCount, endCount));
        startCount += this.chunkSize;
      }
      if ((blobByteSize - (startCount + 1)) > 0) {
        chunksArray.push(blob.slice(startCount, blobByteSize - 1));
      }
    } else {
      // File Size below Chunk size
      chunksArray.push(blob);
    }
    
    return chunksArray;
  },

  unchunk: function (data) {
    var byteString = atob(dataURL.replace(/\s\r\n/g, ''));
    // write the bytes of the string to an ArrayBuffer
    var ab = new ArrayBuffer(byteString.length);
    var ia = new Uint8Array(ab);
    
    for (var j = 0; j < byteString.length; j++) {
      ia[j] = byteString.charCodeAt(j);
    }
    
    // write the ArrayBuffer to a blob, and you're done
    return new Blob([ab]);
  }
};
var _Event = {
  listeners: {
    on: {},
    once: {}
  },
  
  timestamp: {
    now: Date.now() || function() { return + new Date(); }
  },
  
  on: function (event, listener) {
    this.listeners.on[event] = this.listeners.on[event] || [];
    this.listeners.on[event].push(listener);
  },
  
  once: function (event, listener) {
    this.listeners.once[event] = this.listeners.once[event] || [];
    this.listeners.once[event].push(listener);
  },
  
  off: function (event, listener) {
    if (fn.isEmpty(event)) {
      // Remove all listeners
      this.listeners.on = {};
      this.listeners.once = {};
      return;
    }
    
    if (typeof listener === 'function') {
      // Get all the listeners from event
      // Remove individual listeners
      // If signature is the same as provided callback, remove.
      this.remove( this.listeners.on[event] || {}, listener );
      this.remove( this.listeners.once[event] || {}, listener );

    } else {
      // Remove listeners attached to event
      this.listeners.on[event] = [];
      this.listeners.once[event] = [];
    }
  },
  
  respond: function (event) {
    var args = Array.prototype.slice.call(arguments);
    args.shift();

    var on = this.listeners.on[event] || {};
    var once = this.listeners.once[event] || {};
    
    this.trigger(on, args);
    this.trigger(once, args);
    
    this.listeners.once[event] = [];
  },

  trigger: function (listeners, args) {
    var i;

    for (i = 0; i < listeners.length; i += 1) {
      try {
        listeners[i].apply(this, args);
        
      } catch(error) {
        throw error;
      }
    }
  },
  
  remove: function(listeners, listener) {
    var i = 0;
    
    for (i = 0; i < listeners.length; i += 1) {
      if (listeners[i] === listener) {
        listeners.splice(i, 1);
        break;
      }
    }
  },
  
  throttle: function(defer, wait){
    return function () {
      if (fn.isEmpty(this.timeStamp.func)){
        //First time run, need to force timestamp to skip condition
        this.timeStamp.func = this.timestamp.now - wait;
      }
      
      var now = Date.now();
      
      if (now - this.timestamp.func < wait) {
        return;
      }
      
      func.apply(this, arguments);
      this.timeStamp.func = now;
    };
  }
};

Skylink.Event = _Event;
var EventList = [
  /**
   * Event fired when the socket connection to the signaling
   * server is open.
   * @event channelOpen
   * @for Skylink
   * @since 0.1.0
   */
  'channelOpen',

  /**
   * Event fired when the socket connection to the signaling
   * server has closed.
   * @event channelClose
   * @for Skylink
   * @since 0.1.0
   */
  'channelClose',

  /**
   * Event fired when the socket connection received a message
   * from the signaling server.
   * @event channelMessage
   * @param {JSON} message
   * @for Skylink
   * @since 0.1.0
   */
  'channelMessage',

  /**
   * Event fired when the socket connection has occurred an error.
   * @event channelError
   * @param {Object|String} error Error message or object thrown.
   * @for Skylink
   * @since 0.1.0
   */
  'channelError',

  /**
   * Event fired when the socket re-tries to connection with fallback ports.
   * @event channelRetry
   * @param {String} fallbackType The type of fallback [Rel: Skylink.SOCKET_FALLBACK]
   * @param {Integer} currentAttempt The current attempt of the fallback re-try attempt.
   * @for Skylink
   * @since 0.5.6
   */
  'channelRetry',

  /**
   * Event fired when the socket connection failed connecting.
   * - The difference between this and <b>channelError</b> is that
   *   channelError triggers during the connection. This throws
   *   when connection failed to be established.
   * @event socketError
   * @param {String} errorCode The error code.
   *   [Rel: Skylink.SOCKET_ERROR]
   * @param {Integer|String|Object} error The reconnection attempt or error object.
   * @param {String} fallbackType The type of fallback [Rel: Skylink.SOCKET_FALLBACK]
   * @for Skylink
   * @since 0.5.5
   */
  'socketError',

  /**
   * Event fired whether the room is ready for use.
   * @event readyStateChange
   * @param {String} readyState [Rel: Skylink.READY_STATE_CHANGE]
   * @param {JSON} error Error object thrown.
   * @param {Integer} error.status Http status when retrieving information.
   *   May be empty for other errors.
   * @param {String} error.content Error message.
   * @param {Integer} error.errorCode Error code.
   *   [Rel: Skylink.READY_STATE_CHANGE_ERROR]
   * @for Skylink
   * @since 0.4.0
   */
  'readyStateChange',

  /**
   * Event fired when a peer's handshake progress has changed.
   * @event handshakeProgress
   * @param {String} step The handshake progress step.
   *   [Rel: Skylink.HANDSHAKE_PROGRESS]
   * @param {String} peerId PeerId of the peer's handshake progress.
   * @param {Object|String} error Error message or object thrown.
   * @for Skylink
   * @since 0.3.0
   */
  'handshakeProgress',

  /**
   * Event fired when an ICE gathering state has changed.
   * @event candidateGenerationState
   * @param {String} state The ice candidate generation state.
   *   [Rel: Skylink.CANDIDATE_GENERATION_STATE]
   * @param {String} peerId PeerId of the peer that had an ice candidate
   *    generation state change.
   * @for Skylink
   * @since 0.1.0
   */
  'candidateGenerationState',

  /**
   * Event fired when a peer Connection state has changed.
   * @event peerConnectionState
   * @param {String} state The peer connection state.
   *   [Rel: Skylink.PEER_CONNECTION_STATE]
   * @param {String} peerId PeerId of the peer that had a peer connection state
   *    change.
   * @for Skylink
   * @since 0.1.0
   */
  'peerConnectionState',

  /**
   * Event fired when a peer connection health has changed.
   * @event peerConnectionHealth
   * @param {String} health The peer connection health.
   *   [Rel: Skylink.PEER_CONNECTION_HEALTH]
   * @param {String} peerId PeerId of the peer that had a peer connection health
   *    change.
   * @since 0.5.5
   */
  'peerConnectionHealth',

  /**
   * Event fired when an ICE connection state has changed.
   * @iceConnectionState
   * @param {String} state The ice connection state.
   *   [Rel: Skylink.ICE_CONNECTION_STATE]
   * @param {String} peerId PeerId of the peer that had an ice connection state change.
   * @for Skylink
   * @since 0.1.0
   */
  'iceConnectionState',

  /**
   * Event fired when webcam or microphone media access fails.
   * @event mediaAccessError
   * @param {Object|String} error Error object thrown.
   * @for Skylink
   * @since 0.1.0
   */
  'mediaAccessError',

  /**
   * Event fired when webcam or microphone media acces passes.
   * @event mediaAccessSuccess
   * @param {Object} stream MediaStream object.
   * @for Skylink
   * @since 0.1.0
   */
  'mediaAccessSuccess',

  /**
   * Event fired when it's required to have audio or video access.
   * @event mediaAccessRequired
   * @for Skylink
   * @since 0.5.5
   */
  'mediaAccessRequired',

  /**
   * Event fired when media access to MediaStream has stopped.
   * @event mediaAccessStopped
   * @for Skylink
   * @since 0.5.6
   */
  'mediaAccessStopped',

  /**
   * Event fired when a peer joins the room.
   * @event peerJoined
   * @param {String} peerId PeerId of the peer that joined the room.
   * @param {JSON} peerInfo Peer's information.
   * @param {JSON} peerInfo.settings Peer's stream settings.
   * @param {Boolean|JSON} [peerInfo.settings.audio=false] Peer's audio stream
   *   settings.
   * @param {Boolean} [peerInfo.settings.audio.stereo=false] If peer has stereo
   *   enabled or not.
   * @param {Boolean|JSON} [peerInfo.settings.video=false] Peer's video stream
   *   settings.
   * @param {JSON} [peerInfo.settings.video.resolution]
   *   Peer's video stream resolution [Rel: Skylink.VIDEO_RESOLUTION]
   * @param {Integer} [peerInfo.settings.video.resolution.width]
   *   Peer's video stream resolution width.
   * @param {Integer} [peerInfo.settings.video.resolution.height]
   *   Peer's video stream resolution height.
   * @param {Integer} [peerInfo.settings.video.frameRate]
   *   Peer's video stream resolution minimum frame rate.
   * @param {JSON} peerInfo.mediaStatus Peer stream status.
   * @param {Boolean} [peerInfo.mediaStatus.audioMuted=true] If peer's audio
   *   stream is muted.
   * @param {Boolean} [peerInfo.mediaStatus.videoMuted=true] If peer's video
   *   stream is muted.
   * @param {JSON|String} peerInfo.userData Peer's custom user data.
   * @param {JSON} peerInfo.agent Peer's browser agent.
   * @param {String} peerInfo.agent.name Peer's browser agent name.
   * @param {Integer} peerInfo.agent.version Peer's browser agent version.
   * @param {Boolean} isSelf Is the peer self.
   * @for Skylink
   * @since 0.5.2
   */
  'peerJoined',

  /**
   * Event fired when a peer's connection is restarted.
   * @event peerRestart
   * @param {String} peerId PeerId of the peer that is being restarted.
   * @param {JSON} peerInfo Peer's information.
   * @param {JSON} peerInfo.settings Peer's stream settings.
   * @param {Boolean|JSON} peerInfo.settings.audio Peer's audio stream
   *   settings.
   * @param {Boolean} peerInfo.settings.audio.stereo If peer has stereo
   *   enabled or not.
   * @param {Boolean|JSON} peerInfo.settings.video Peer's video stream
   *   settings.
   * @param {JSON} peerInfo.settings.video.resolution
   *   Peer's video stream resolution [Rel: Skylink.VIDEO_RESOLUTION]
   * @param {Integer} peerInfo.settings.video.resolution.width
   *   Peer's video stream resolution width.
   * @param {Integer} peerInfo.settings.video.resolution.height
   *   Peer's video stream resolution height.
   * @param {Integer} peerInfo.settings.video.frameRate
   *   Peer's video stream resolution minimum frame rate.
   * @param {JSON} peerInfo.mediaStatus Peer stream status.
   * @param {Boolean} peerInfo.mediaStatus.audioMuted If peer's audio
   *   stream is muted.
   * @param {Boolean} peerInfo.mediaStatus.videoMuted If peer's video
   *   stream is muted.
   * @param {JSON|String} peerInfo.userData Peer's custom user data.
   * @param {JSON} peerInfo.agent Peer's browser agent.
   * @param {String} peerInfo.agent.name Peer's browser agent name.
   * @param {Integer} peerInfo.agent.version Peer's browser agent version.
   * @param {Boolean} isSelfInitiateRestart Is it us who initiated the restart.
   * @since 0.5.5
   */
  'peerRestart',

  /**
   * Event fired when a peer information is updated.
   * @event peerUpdated
   * @param {String} peerId PeerId of the peer that had information updaed.
   * @param {JSON} peerInfo Peer's information.
   * @param {JSON} peerInfo.settings Peer's stream settings.
   * @param {Boolean|JSON} [peerInfo.settings.audio=false] Peer's audio stream
   *   settings.
   * @param {Boolean} [peerInfo.settings.audio.stereo=false] If peer has stereo
   *   enabled or not.
   * @param {Boolean|JSON} [peerInfo.settings.video=false] Peer's video stream
   *   settings.
   * @param {JSON} [peerInfo.settings.video.resolution]
   *   Peer's video stream resolution [Rel: Skylink.VIDEO_RESOLUTION]
   * @param {Integer} [peerInfo.settings.video.resolution.width]
   *   Peer's video stream resolution width.
   * @param {Integer} [peerInfo.settings.video.resolution.height]
   *   Peer's video stream resolution height.
   * @param {Integer} [peerInfo.settings.video.frameRate]
   *   Peer's video stream resolution minimum frame rate.
   * @param {JSON} peerInfo.mediaStatus Peer stream status.
   * @param {Boolean} [peerInfo.mediaStatus.audioMuted=true] If peer's audio
   *   stream is muted.
   * @param {Boolean} [peerInfo.mediaStatus.videoMuted=true] If peer's video
   *   stream is muted.
   * @param {JSON|String} peerInfo.userData Peer's custom user data.
   * @param {JSON} peerInfo.agent Peer's browser agent.
   * @param {String} peerInfo.agent.name Peer's browser agent name.
   * @param {Integer} peerInfo.agent.version Peer's browser agent version.
   * @param {Boolean} isSelf Is the peer self.
   * @for Skylink
   * @since 0.5.2
   */
  'peerUpdated',

  /**
   * Event fired when a peer leaves the room
   * @event peerLeft
   * @param {String} peerId PeerId of the peer that left.
   * @param {JSON} peerInfo Peer's information.
   * @param {JSON} peerInfo.settings Peer's stream settings.
   * @param {Boolean|JSON} [peerInfo.settings.audio=false] Peer's audio stream
   *   settings.
   * @param {Boolean} [peerInfo.settings.audio.stereo=false] If peer has stereo
   *   enabled or not.
   * @param {Boolean|JSON} [peerInfo.settings.video=false] Peer's video stream
   *   settings.
   * @param {JSON} [peerInfo.settings.video.resolution]
   *   Peer's video stream resolution [Rel: Skylink.VIDEO_RESOLUTION]
   * @param {Integer} [peerInfo.settings.video.resolution.width]
   *   Peer's video stream resolution width.
   * @param {Integer} [peerInfo.settings.video.resolution.height]
   *   Peer's video stream resolution height.
   * @param {Integer} [peerInfo.settings.video.frameRate]
   *   Peer's video stream resolution minimum frame rate.
   * @param {JSON} peerInfo.mediaStatus Peer stream status.
   * @param {Boolean} [peerInfo.mediaStatus.audioMuted=true] If peer's audio
   *   stream is muted.
   * @param {Boolean} [peerInfo.mediaStatus.videoMuted=true] If peer's video
   *   stream is muted.
   * @param {JSON|String} peerInfo.userData Peer's custom user data.
   * @param {JSON} peerInfo.agent Peer's browser agent.
   * @param {String} peerInfo.agent.name Peer's browser agent name.
   * @param {Integer} peerInfo.agent.version Peer's browser agent version.
   * @param {Boolean} isSelf Is the peer self.
   * @for Skylink
   * @since 0.5.2
   */
  'peerLeft',

  /**
   * Event fired when a peer joins the room
   * @event presenceChanged
   * @param {JSON} users The list of users
   * @private
   * @unsupported true
   * @for Skylink
   * @since 0.1.0
   */
  'presenceChanged',

  /**
   * Event fired when a remote stream has become available.
   * - This occurs after the user joins the room.
   * - This is changed from <b>addPeerStream</b> event.
   * - Note that <b>addPeerStream</b> is removed from the specs.
   * - There has been a documentation error whereby the stream it is
   *   supposed to be (stream, peerId, isSelf), but instead is received
   *   as (peerId, stream, isSelf) in 0.5.0.
   * @event incomingStream
   * @param {String} peerId PeerId of the peer that is sending the stream.
   * @param {Object} stream MediaStream object.
   * @param {Boolean} isSelf Is the peer self.
   * @param {JSON} peerInfo Peer's information.
   * @for Skylink
   * @since 0.5.5
   */
  'incomingStream',

  /**
   * Event fired when a message being broadcasted is received.
   * - This is changed from <b>chatMessageReceived</b>,
   *   <b>privateMessage</b> and <b>publicMessage</b> event.
   * - Note that <b>chatMessageReceived</b>, <b>privateMessage</b>
   *   and <b>publicMessage</b> is removed from the specs.
   * @event incomingMessage
   * @param {JSON} message Message object that is received.
   * @param {JSON|String} message.content Data that is broadcasted.
   * @param {String} message.senderPeerId PeerId of the sender peer.
   * @param {String} message.targetPeerId PeerId that is specifically
   *   targeted to receive the message.
   * @param {Boolean} message.isPrivate Is data received a private message.
   * @param {Boolean} message.isDataChannel Is data received from a
   *   data channel.
   * @param {String} peerId PeerId of the sender peer.
   * @param {JSON} peerInfo Peer's information.
   * @param {JSON} peerInfo.settings Peer's stream settings.
   * @param {Boolean|JSON} [peerInfo.settings.audio=false] Peer's audio stream
   *   settings.
   * @param {Boolean} [peerInfo.settings.audio.stereo=false] If peer has stereo
   *   enabled or not.
   * @param {Boolean|JSON} [peerInfo.settings.video=false] Peer's video stream
   *   settings.
   * @param {JSON} [peerInfo.settings.video.resolution]
   *   Peer's video stream resolution [Rel: Skylink.VIDEO_RESOLUTION]
   * @param {Integer} [peerInfo.settings.video.resolution.width]
   *   Peer's video stream resolution width.
   * @param {Integer} [peerInfo.settings.video.resolution.height]
   *   Peer's video stream resolution height.
   * @param {Integer} [peerInfo.settings.video.frameRate]
   *   Peer's video stream resolution minimum frame rate.
   * @param {JSON} peerInfo.mediaStatus Peer stream status.
   * @param {Boolean} [peerInfo.mediaStatus.audioMuted=true] If peer's audio
   *   stream is muted.
   * @param {Boolean} [peerInfo.mediaStatus.videoMuted=true] If peer's video
   *   stream is muted.
   * @param {JSON|String} peerInfo.userData Peer's custom user data.
   * @param {JSON} peerInfo.agent Peer's browser agent.
   * @param {String} peerInfo.agent.name Peer's browser agent name.
   * @param {Integer} peerInfo.agent.version Peer's browser agent version.
   * @param {Boolean} isSelf Is the peer self.
   * @for Skylink
   * @since 0.5.2
   */
  'incomingMessage',

  /**
   * Event fired when connected to a room and the lock status has changed.
   * @event roomLock
   * @param {Boolean} isLocked Is the room locked.
   * @param {String} peerId PeerId of the peer that is locking/unlocking
   *   the room.
   * @param {JSON} peerInfo Peer's information.
   * @param {JSON} peerInfo.settings Peer's stream settings.
   * @param {Boolean|JSON} [peerInfo.settings.audio=false] Peer's audio stream
   *   settings.
   * @param {Boolean} [peerInfo.settings.audio.stereo=false] If peer has stereo
   *   enabled or not.
   * @param {Boolean|JSON} [peerInfo.settings.video=false] Peer's video stream
   *   settings.
   * @param {JSON} [peerInfo.settings.video.resolution]
   *   Peer's video stream resolution [Rel: Skylink.VIDEO_RESOLUTION]
   * @param {Integer} [peerInfo.settings.video.resolution.width]
   *   Peer's video stream resolution width.
   * @param {Integer} [peerInfo.settings.video.resolution.height]
   *   Peer's video stream resolution height.
   * @param {Integer} [peerInfo.settings.video.frameRate]
   *   Peer's video stream resolution minimum frame rate.
   * @param {JSON} peerInfo.mediaStatus Peer stream status.
   * @param {Boolean} [peerInfo.mediaStatus.audioMuted=true] If peer's audio
   *   stream is muted.
   * @param {Boolean} [peerInfo.mediaStatus.videoMuted=true] If peer's video
   *   stream is muted.
   * @param {JSON|String} peerInfo.userData Peer's custom user data.
   * @param {JSON} peerInfo.agent Peer's browser agent.
   * @param {String} peerInfo.agent.name Peer's browser agent name.
   * @param {Integer} peerInfo.agent.version Peer's browser agent version.
   * @param {Boolean} isSelf Is the peer self.
   * @for Skylink
   * @since 0.5.2
   */
  'roomLock',

  /**
   * Event fired when a peer's datachannel state has changed.
   * @event dataChannelState
   * @param {String} state The datachannel state.
   *   [Rel: Skylink.DATA_CHANNEL_STATE]
   * @param {String} peerId PeerId of peer that has a datachannel
   *   state change.
   * @for Skylink
   * @since 0.1.0
   */
  'dataChannelState',

  /**
   * Event fired when a data transfer state has changed.
   * - Note that <u>transferInfo.data</u> sends the blob data, and
   *   no longer a blob url.
   * @event dataTransferState
   * @param {String} state The data transfer state.
   *   [Rel: Skylink.DATA_TRANSFER_STATE]
   * @param {String} transferId TransferId of the data.
   * @param {String} peerId PeerId of the peer that has a data
   *   transfer state change.
   * @param {JSON} transferInfo Data transfer information.
   * @param {JSON} transferInfo.percentage The percetange of data being
   *   uploaded / downloaded.
   * @param {JSON} transferInfo.senderPeerId PeerId of the sender.
   * @param {JSON} transferInfo.data The blob data. See the
   *   [createObjectURL](https://developer.mozilla.org/en-US/docs/Web/API/URL.createObjectURL)
   *   method on how you can convert the blob to a download link.
   * @param {JSON} transferInfo.name Data name.
   * @param {JSON} transferInfo.size Data size.
   * @param {JSON} error The error object.
   * @param {String} error.message Error message thrown.
   * @param {String} error.transferType Is error from uploading or downloading.
   *   [Rel: Skylink.DATA_TRANSFER_TYPE]
   * @for Skylink
   * @since 0.4.1
   */
  'dataTransferState',

  /**
   * Event fired when the signaling server warns the user.
   * @event systemAction
   * @param {String} action The action that is required for
   *   the user to follow. [Rel: Skylink.SYSTEM_ACTION]
   * @param {String} message The reason for the action.
   * @param {String} reason The reason why the action is given.
   *   [Rel: Skylink.SYSTEM_ACTION_REASON]
   * @for Skylink
   * @since 0.5.1
   */
  'systemAction'
];
var Request = {
  /**
   * The api server.
   * @property server
   * @type String
   * @private
   * @since 0.6.0
   */
  server: globals.roomServer || '//api.temasys.this.sg',

  /**
   * The flag to check if request should use XDomainRequest.
   * @property isXDomainRequest
   * @type Boolean
   * @private
   * @since 0.6.0
   */
  isXDomainRequest: window.webrtcDetectedBrowser === 'IE' &&
    (window.webrtcDetectedVersion === 9 || window.webrtcDetectedVersion === 8) &&
    typeof window.XDomainRequest === 'function',

  /**
   * The protocol the request uses to connect to.
   * @property protocol
   * @type String
   * @private
   * @since 0.6.0
   */
  protocol: (globals.enforceSSL) ? 'https:' : window.location.protocol,

  /**
   * Starts the connection to the room.
   * @property load
   * @type Function
   * @param {Function} callback The callback triggered once request has been completed.
   * @trigger peerJoined, mediaAccessRequired
   * @for Request
   * @since 0.6.0
   */
  load: function (path, deferSuccess, deferError, deferLoad) {
    var xhr = null;

    if (this.isXDomainRequest) {
      xhr = new XDomainRequest();

      xhr.setContentType = function (contentType) {
        xhr.contentType = contentType;
      };

    } else {
      xhr = new window.XMLHttpRequest();

      xhr.setContentType = function (contentType) {
        xhr.setRequestHeader('Content-type', contentType);
      };
    }

    xhr.onload = function () {
      var response = xhr.responseText || xhr.response;
      var status = xhr.status || 200;
      
      log.info('Request', 'Received response from API server', response, status);
      
      try {
        response = JSON.parse( response || '{}' );
      } catch (error) {
        throw error;
      }
  
      if (status === 200) {
        deferSuccess(status, response);
      
      } else {
        deferError(status, response);
      }
    };

    xhr.onerror = function (error) {
      throw error;
    };

    xhr.onprogress = function () {
      log.log('Request', 'Request load in progress');
      
      deferLoad();
    };

    xhr.open('GET', this.protocol + this.server + path, true);

    // xhr.setContentType('application/json;charset=UTF-8');

    xhr.send();
  }
};
var SDP = {
  /**
   * Finds a line in the sdp based on the condition provided
   * @property SDP.find
   * @type Function
   * @param {Array} sdpLines The sdp in array.
   * @param {Array} condition The beginning part of the sdp line. E.g. a=fmtp
   * @return {Array} [index, line] The sdp line.
   * @private
   * @for Skylink
   * @since 0.6.0
   */
  find: function(sdpLines, condition) {
    var i, j;
    
    for (i = 0; i < sdpLines.length; i += 1) {
      for (j = 0; j < condition.length; j += 1) {
        sdpLines[i] = sdpLines[i] || '';

        if (sdpLines[i].indexOf(condition[j]) === 0) {
          return [i, sdpLines[i]];
        }
      }
    }
    
    return [];
  },
  
  /**
   * Enables the stereo feature if OPUS is enabled.
   * @property SDP.addStereo
   * @type Function
   * @param {Array} sdpLines Sdp received.
   * @return {Array} Updated version with Stereo feature
   * @private
   * @for Skylink
   * @since 0.6.0
   */
  addStereo: function(sdpLines) {
    var opusLineFound = false, opusPayload = 0;
    // Check if opus exists
    var rtpmapLine = this.find(sdpLines, ['a=rtpmap:']);
    if (rtpmapLine.length) {
      if (rtpmapLine[1].split(' ')[1].indexOf('opus/48000/') === 0) {
        opusLineFound = true;
        opusPayload = (rtpmapLine[1].split(' ')[0]).split(':')[1];
      }
    }
    // Find the A=FMTP line with the same payload
    if (opusLineFound) {
      var fmtpLine = this.find(sdpLines, ['a=fmtp:' + opusPayload]);
      if (fmtpLine.length) {
        sdpLines[fmtpLine[0]] = fmtpLine[1] + '; stereo=1';
      }
    }
    return sdpLines;
  },
  
  /**
   * Sets the audio, video and DataChannel data bitrate in the sdp.
   * - In low-environment cases, bandwidth is managed by the browsers
   *   and the quality of the resolution or audio may change to suit.
   * @property SDP.setBitrate
   * @type Function
   * @param {Array} sdpLines Sdp received.
   * @return {Array} Updated version with custom Bandwidth settings
   * @private
   * @for Skylink
   * @since 0.6.0
   */
  setBitrate: function (sdpLines, bandwidth) {
    // Find if user has audioStream
    var maLineFound = this.find(sdpLines, ['m=', 'a=']).length;
    var cLineFound = this.find(sdpLines, ['c=']).length;

    // Find the RTPMAP with Audio Codec
    if (maLineFound && cLineFound) {
      if (bandwidth.audio) {
        var audioLine = this.find(sdpLines, ['a=audio', 'm=audio']);
        
        if (!fn.isEmpty(audioLine)) {
          sdpLines.splice(audioLine[0], 1, audioLine[1], 'b=AS:' + bandwidth.audio);
        }
      }
      
      if (bandwidth.video) {
        var videoLine = this.find(sdpLines, ['a=video', 'm=video']);
        
        if (!fn.isEmpty(videoLine)) {
          sdpLines.splice(videoLine[0], 1, videoLine[1], 'b=AS:' + bandwidth.video);
        }
      }
      
      if (bandwidth.data && this._enableDataChannel) {
        var dataLine = this.find(sdpLines, ['a=application', 'm=application']);
        
        if (!fn.isEmpty(dataLine)) {
          sdpLines.splice(dataLine[0], 1, dataLine[1], 'b=AS:' + bandwidth.data);
        }
      }
    }
    return sdpLines;
  },
    
  /**
   * Set video stream resolution in the sdp.
   * - As noted, this is not working.
   * @property SDP.setResolution
   * @type Function
   * @param {Array} sdpLines Sdp received.
   * @return {Array} Updated version with custom Bandwidth settings
   * @private
   * @for Skylink
   * @since 0.6.0
   */
  setResolution: function (sdpLines) {
    var video = this._streamSettings.video;
    var frameRate = video.frameRate || 50;
    var resolution = video.resolution || {};
    var fmtpLine = this.find(sdpLines, ['a=fmtp:']);
    if (fmtpLine.length){
        sdpLines.splice(fmtpLine[0], 1,fmtpLine[1] + ';max-fr=' + frameRate +
        ';max-recv-width=' + (resolution.width ? resolution.width : 640) +
        ';max-recv-height=' + (resolution.height ? resolution.height : 480));
    }
    return sdpLines;
  },
    
  /**
   * Removes the H264 preference in sdp because other browsers does not support it yet.
   * @property SDP.removeH264Support
   * @type Function
   * @param {Array} sdpLines Sdp received.
   * @return {Array} Updated version removing Firefox h264 pref support.
   * @private
   * @for Skylink
   * @since 0.6.0
   */
  removeH264Support: function (sdpLines) {
    var invalidLineIndex = sdpLines.indexOf(
      'a=fmtp:0 profile-level-id=0x42e00c;packetization-mode=1');
    if (invalidLineIndex > -1) {
      log.debug('Firefox H264 invalid pref found:', invalidLineIndex);
      sdpLines.splice(invalidLineIndex, 1);
    }
    return sdpLines;
  },
  
  /**
   * Modifies a local session description with the configuration provided
   * @property SDP.configure
   * @type Function
   * @param {Array} sdpLines Sdp received.
   * @return {String} Updated local session description.
   * @private
   * @for Skylink
   * @since 0.6.0
   */
  configure: function (sdp, config) {
    var sdpLines = sdp.split('\r\n');
    
    sdpLines = this.removeH264Support(sdpLines);

    if (config.stereo) {
      sdpLines = this.addStereo(sdpLines);
    }

    if (config.bandwidth) {
      sdpLines = this.setBitrate(sdpLines, config.bandwidth);
    }

    return sdpLines.join('\r\n');
  }
  
};
function DataChannel(channel, listener) {
  'use strict';

  // Prevent undefined listener error
  listener = listener || function (event, data) {};

  // Reference of instance
  var com = this;

  com.id = channel.label || fn.generateUID();
  com.type = 'message';

  /**
   * The datachannel source origin.
   * There are two types of sources:
   * - <code>"local"</code> indicates that datachannel came from self user.
   * - <code>"remote</code> indicates that datachannel came from other users.
   * @attribute sourceType
   * @type String
   * @private
   * @for DataChannel
   * @since 0.6.0
   */
  com.sourceType = 'local';

  /**
   * The RTCDataChannel object.
   * @attribute RTCDataChannel
   * @type Object
   * @private
   * @for DataChannel
   * @since 0.6.0
   */
  com.RTCDataChannel = null;


  /**
   * Function to subscribe to when datachannel has opened.
   * @method onconnect
   * @eventhandler true
   * @for DataChannel
   * @since 0.6.0
   */
  com.onconnect = function () {};

  /**
   * Function to subscribe to when datachannel has closed.
   * @method ondisconnect
   * @eventhandler true
   * @for DataChannel
   * @since 0.6.0
   */
  com.ondisconnect = function () {};

  /**
   * Function to subscribe to when datachannel has an error.
   * @method onerror
   * @eventhandler true
   * @for DataChannel
   * @since 0.6.0
   */
  com.onerror = function () {};

  com._handler = function (event, data) {
    DataChannelHandler(com, event, data, listener);
  };

  /**
   * Binds events to RTCDataChannel object.
   * @method bind
   * @param {Object} bindChannel The RTCDataChannel object to bind events to.
   * @private
   * @for DataChannel
   * @since 0.6.0
   */
  com.bind = function (bindChannel) {
    // Prevent re-trigger
    var onOpenFn = function () {
      com.handler('datachannel:connect', {});
    };

    if (bindChannel.readyState !== 'open') {
      bindChannel.onopen = onOpenFn;

    } else {
      onOpenFn();
    }

    bindChannel.onerror = function (error) {
      com.handler('datachannel:error', {
        error: error
      });
    };

    // NOTE: Older firefox might close the DataChannel earlier
    bindChannel.onclose = function () {
      com.handler('datachannel:disconnect', {});
    };

    bindChannel.onmessage = function (event) {
      com.handler('datachannel:message', {
        data: event.data
      });
    };

    com.RTCDataChannel = bindChannel;

    fn.runSync(function () {
      com.handler('datachannel:start', {});
    });
  };

  /**
   * Sends data over the datachannel.
   * @method send
   * @param {JSON|String} data The data to send.
   * @private
   * @for DataChannel
   * @since 0.6.0
   */
  com.send = function (data) {
    var sendingData = data;

    if (typeof data === 'object') {
      sendingData = JSON.stringify(data);
    }

    fn.isSafe(function () {
      com.RTCDataChannel.send(sendingData);
    });
  };

  if (fn.isEmpty(channel)) {
    throw new Error('Provided parameter channel is invalid.');
  }

  // Bind datachannel object
  com.bind(channel);
}

var DataChannelEventResponseHandler = {
  /**
   * Event fired when the datachannel object is ready to use.
   * @event datachannel:start
   * @for DataChannel
   * @since 0.6.0
   */
  start: function (com, data, listener) {
    if (typeof com.onstart === 'function') {
      com.onstart();
    }
  },
  
  /**
   * Event fired when the datachannel has opened.
   * @event datachannel:connect
   * @for DataChannel
   * @since 0.6.0
   */
  connect: function (com, data, listener) {
    if (typeof com.onconnect === 'function') {
      com.onconnect();
    }
  },
  
  /**
   * Event fired when the datachannel has an exception occurred.
   * @event datachannel:error
   * @param {Object} error The RTCDataChannel error.
   * @for DataChannel
   * @since 0.6.0
   */
  error: function (com, data, listener) {
    if (typeof com.onerror === 'function') {
      com.onerror(error);
    }
  },
  
  /**
   * Event fired when the datachannel receives data.
   * @event datachannel:message
   * @param {JSON|String} data The data received.
   * @for DataChannel
   * @since 0.6.0
   */
  message: function (com, data, listener) {
    
  },

  /**
   * Event fired when the datachannel has closed.
   * @event datachannel:disconnect
   * @for DataChannel
   * @since 0.6.0
   */
  disconnect: function (com, data, listener) {
    if (typeof com.ondisconnect === 'function') {
      com.ondisconnect();
    }
  }
};
var DataChannelHandler = function (com, event, data, listener) {
  var params = event.split(':');

  // Class events
  data.id = com.id;

  fn.applyHandler(DataChannelEventResponseHandler, params, [com, data, listener]);

  listener(event, data);
};




function Peer(config, listener) {
  'use strict';

  // Prevent undefined listener error
  listener = listener || function (event, data) {};

  // Reference of instance
  var com = this;

  /* Attributes */
  /**
   * The shared peer connection id.
   * @attribute id
   * @type String
   * @for Peer
   * @since 0.6.0
   */
  com.id = config.id || fn.generateUID();

  /**
   * The peer connection type.
   * - <code>"user"</code> denotes that this connection is used for the
   *   main peer connection.
   * - <code>"stream"</code> denotes that this connection is used for
   *   sending an extra stream connection.
   * @attribute type
   * @type String
   * @for Peer
   * @since 0.6.0
   */
  com.type = config.id === 'main' ? 'user' : 'stream';

  /**
   * The RTCSessionDescription type that the peer connection would send.
   * Types are <code>"offer"</code> or <code>"answer"</code>.
   * This is used for superclasses to check and send the relevant
   *   information.
   * @attribute _sdpType
   * @type String
   * @private
   * @for Peer
   * @since 0.6.0
   */
  com._sdpType = config.sdpType || 'answer';

  /**
   * The list of ICE servers (TURN/STUN) that the peer connection would connect to.
   * @attribute _iceServers
   * @param {JSON} (#index) The ICE server.
   * @param {String} (#index).credential The ICE server credential (password).
   *    Only used in TURN servers.
   * @param {String} (#index).url The ICE server url. For TURN server,
   *   the format may vary depending on the support of the TURN url format.
   * @param {String} (#index).username The ICE server username.
   *    Only used in TURN servers for Firefox browsers.
   * @type String
   * @private
   * @for Peer
   * @since 0.6.0
   */
  com._iceServers = null;


  com._optionalConfig = {
    optional: [{
      DtlsSrtpKeyAgreement: true
    }]
  };
  com._localDescription = null;
  com._remoteDescription = null;
  com._dataChannels = {};
  com._iceTrickle = true;
  com._healthTimer = null;
  com._stream = null;
  com._streamingConfig = config.streamingConfig || {
    audio: false,
    video: false,
    status: {
      audioMuted: true,
      videoMuted: true
    }
  };
  com._sdpConstraints = {
    mandatory: {
      OfferToReceiveAudio: true,
      OfferToReceiveVideo: true
    }
  };
  com._sdpConfig = {
    stereo: false,
    bandwidth: config.bandwidth
  };
  com._RTCPeerConnection = null;
  com._weight = parseInt(fn.generateUID(), 10);


  /* Methods */
  com._handler = function (event, data) {
    PeerHandler(com, event, data, listener);
  };

  com.connect = function (stream) {
    var peer = new window.RTCPeerConnection(com.ICEConfig, com.optionalConfig);

    // Send stream
    if ((!fn.isEmpty(stream)) ? stream instanceof Stream : false) {

      // Set the data
      com.stereo = fn.isSafe(function () { return stream.audio.stereo; });

      // Check class type
      peer.addStream(stream.MediaStream);

      com.respond('peer:stream', {
        sourceType: 'local',
        stream: stream
      });
    }

    com.bind(peer);
  };

  com.reconnect = function (stream) {
    var hasStream = !!stream;

    stream = stream || fn.isSafe(function () {
      return com.RTCPeerConnection.getLocalStreams()[0]; });

    com.RTCPeerConnection.close();
    com.RTCPeerConnection = null;

    var peer = new window.RTCPeerConnection(com.ICEConfig, com.config);

    // Send stream
    if ((!fn.isEmpty(stream)) ? stream instanceof Stream : false) {

      // Adds the RTCMediaStream object to RTCPeerConnection
      peer.addStream(stream.MediaStream);

      if (hasStream) {
        com.respond('peer:stream', {
          stream: stream
        });
      }

      com.respond('peer:reconnect', {});
    }
    com.bind(peer);
  };

  com.disconnect = function () {
    if (com.RTCPeerConnection.newSignalingState !== 'closed') {
      com.RTCPeerConnection.close();
    }

    com.respond('peer:disconnect', {});
  };

  com.bind = function (bindPeer) {
    bindPeer.iceConnectionFiredStates = [];
    bindPeer.queueCandidate = [];
    bindPeer.newSignalingState = 'new';
    bindPeer.newIceConnectionState = 'new';

    bindPeer.ondatachannel = function (event) {
      var eventChannel = event.channel || event;

      // Send the channel only when channel has started
      var channel = new DataChannel(eventChannel, function (event, data) {

        com.respond(event, data);

        if (event === 'datachannel:start') {
          com.respond('peer:datachannel', {
            channel: channel,
            sourceType: 'remote'
          });
        }
      });
    };

    bindPeer.onaddstream = function (event) {
      var eventStream = event.stream || event;

      // Send the stream only when stream has started
      var stream = new Stream(eventStream, config.streamingConfig, function (event, data) {

        com.routeEvent(event, data);

        if (event === 'stream:start') {
          com.respond('peer:stream', {
            sourceType: 'remote',
            stream: stream
          });
        }
      });
    };

    bindPeer.onicecandidate = function (event) {
      var eventCandidate = event.candidate || event;

      if (fn.isEmpty(eventCandidate.candidate)) {
        com.respond('candidate:gathered', {
          candidate: eventCandidate
        });
        return;
      }

      // Implement ice trickle disabling here

      com.respond('peer:icecandidate', {
        sourceType: 'local',
        candidate: eventCandidate
      });
    };

    // Use helper function
    PeerHelper.ICE.state(bind);

    bindPeer.oniceconnectionnewstatechange = function (event) {
      // Connection is successful
      if (com.RTCPeerConnection.newIceConnectionState === 'connected') {
        // Stop timer
        if (!fn.isEmpty(com.healthTimer)) {
          log.debug('Peer', com.id, 'Stopping health timer as connection is established.');

          clearInterval(com.healthTimer);
        }
      }

      com.respond('peer:iceconnectionstate', {
        state: com.RTCPeerConnection.newIceConnectionState
      });
    };

    bindPeer.onsignalingstatechange = function (event) {
      com.respond('peer:signalingstate', {
        state: com.RTCPeerConnection.newSignalingState
      });
    };

    bindPeer.onicegatheringstatechange = function () {
      com.respond('peer:icegatheringstate', {
        state: com.RTCPeerConnection.iceGatheringState
      });
    };

    com.RTCPeerConnection = bindPeer;

    fn.runSync(function () {
      com.respond('peer:connect', {
        weight: com.weight,
        SDPType: com.SDPType,
        streamingConfig: com.streamingConfig
      });
    });
  };

  com.createOffer = function () {
    // Create datachannel
    if (globals.dataChannel && com.type === 'user') {
      var eventChannel = com.RTCPeerConnection.createDataChannel('main');

      // Send the channel only when channel has started
      var channel = new DataChannel(eventChannel, function (event, data) {

        com.respond(event, data);

        com.respond('peer:datachannel', {
          sourceType: 'local',
          channel: channel
        });
      });
    }

    com.RTCPeerConnection.createOffer(function (offer) {
      offer.sdp = SDP.configure(offer.sdp, com.sdpConfig);

      com.localDescription = offer;

      com.respond('peer:offer', {
        offer: offer
      });

    }, function (error) {
      throw error;

    }, com.sdpConstraints);
  };

  com.createAnswer = function () {
    com.RTCPeerConnection.createAnswer(function (answer) {
      answer.sdp = SDP.configure(answer.sdp, com.sdpConfig);

      com.localDescription = answer;

      com.respond('peer:answer', {
        answer: answer
      });

      com.setLocalDescription();

    }, function (error) {
      throw error;

    }, com.sdpConstraints);
  };

  com.setLocalDescription = function () {
    var localDescription = com.localDescription;

    com.RTCPeerConnection.setLocalDescription(localDescription, function () {
      com.respond('peer:localdescription', {
        localDescription: localDescription.sdp,
        type: localDescription.type,
      });

      if (localDescription.type === 'answer') {
        com.RTCPeerConnection.newSignalingState = 'have-local-answer';

        com.respond('peer:signalingstate', {
          state: com.RTCPeerConnection.newSignalingState
        });

      } else {
        com.setRemoteDescription();
      }

    }, function (error) {
      throw error;
    });
  };

  com.setRemoteDescription = function () {
    var remoteDescription = com.remoteDescription;

    com.RTCPeerConnection.setRemoteDescription(remoteDescription, function () {
      com.respond('peer:remotedescription', {
        remoteDescription: remoteDescription.sdp,
        type: remoteDescription.type
      });

      if (remoteDescription.type === 'answer') {
        com.RTCPeerConnection.newSignalingState = 'have-remote-answer';

        com.respond('peer:signalingstate', {
          state: com.RTCPeerConnection.newSignalingState
        });

      } else {
        com.createAnswer();
      }

      // Add all ICE Candidate generated before remote description of answer and offer
      ICE.popCandidate(com.RTCPeerConnection, com.handler);

    }, function (error) {
      throw error;
    });
  };
  
  /* Event Handlers */
  com.onconnect = function () {};
  com.onconnected = function () {};
  com.oniceconnectionstatechange = function () {};
  com.onicegatheringstatechange = function () {};
  com.onaddstream = function () {};
  com.onsignalingstatechange = function () {};
  com.onreconnect = function () {};
  com.ondisconnect = function () {};

  // Throw an error if adapterjs is not loaded
  if (!window.RTCPeerConnection) {
    throw new Error('Required dependency adapterjs not found');
  }

  // Parse bandwidth
  com.streamingConfig.bandwidth = StreamParser.parseBandwidthConfig(com.streamingConfig.bandwidth);

  // Parse constraints ICE servers
  var iceServers = ICE.parseICEServers(config.iceServers);

  com.ICEConfig = {
    iceServers: iceServers
  };

  // Start timer
  /*com.healthTimer = setTimeout(function () {
    if (!fn.isEmpty(com.healthTimer)) {
      log.debug('Peer', com.id, 'Restarting negotiation as timer has expired');

      clearInterval(com.healthTimer);

      com.reconnect();
    }

  }, com.iceTrickle ? 10000 : 50000);*/

  fn.runSync(function () {
    // When peer connection is ready to use, the connection connect() can start
    com.respond('peer:start', {
      weight: com.weight,
      SDPType: com.SDPType,
      streamingConfig: com.streamingConfig
    });
  });
}
var PeerEventMessageHandler = {

  offer: function (com, data, listener) {
    com.remoteDescription = new window.RTCSessionDescription(data);

    com.handler('peer:offer', {
      sourceType: 'remote',
      offer: com.remoteDescription
    });
        
    com.setRemoteDescription();
  },
  
  answer: function (com, data, listener) {
    com.remoteDescription = new window.RTCSessionDescription(data);

    com.handler('peer:answer', {
      sourceType: 'remote',
      answer: com.remoteDescription
    });

    com.setLocalDescription();
  },

  candidate: function (com, data, listener) {
    var candidate = new window.RTCIceCandidate({
      sdpMLineIndex: data.label,
      candidate: data.candidate,
      sdpMid: data.id,
      label: data.label,
      id: data.id
    });

    ICE.addCandidate(com.RTCPeerConnection, candidate, com.handler);

    com.handler('peer:icecandidate', {
      sourceType: 'remote',
      candidate: candidate
    });
  },
  
  restart: function (com, data, listener) {
    
  },
  
  muteAudioEvent: function (com, data, listener) {
    if (data.muted) {
      com.stream.muteAudio();
    } else {
      com.stream.muteVideo();
    }
  },
    
  muteVideoEvent: function (com, data, listener) {
    if (data.muted) {
      com.stream.unmuteAudio();
    } else {
      com.stream.unmuteVideo();
    }
  }
};
var PeerEventReceivedHandler = {
  
  // Handles the stream events */
  stream: {
    // Handles the stream stop event */
    stop: function (com, data, listener) {
      // When receiving stream stops and it is not the main peer connection, it means
      // that connection has stopped
      // If stream is not the main, disconnect the peer connection.
      if (com.id !== 'main') {
        com.disconnect();
      }
    }
  }
  
};
var PeerEventResponseHandler = {
  
  /**
   * Event fired when peer connection has started.
   * This happens when RTCPeerConnection object has just
   *   been initialized and local MediaStream has been added.
   * @event peer:connect
   * @private
   * @for Peer
   * @since 0.6.0
   */
  connect: function (com, data, listener) {
    if (typeof com.onconnect === 'function') {
      com.onconnect(com.id);
    }
  },
  
  /**
   * Event fired when peer connection is reconnecting.
   * This happens when RTCPeerConnection object is
   *   re-initialized and the ICE connection restarts again.
   * It adds the re-updated local MediaStream.
   * @event peer:reconnect
   * @private
   * @for Peer
   * @since 0.6.0
   */
  reconnect: function (com, data, listener) {
    if (typeof com.onreconnect === 'function') {
      com.onreconnect();
    }
  },
  
  /**
   * Event fired when peer connection is established and connected.
   * This happens when RTCPeerConnection ICE connection state is
   *  connected and completed.
   * @event peer:connected
   * @private
   * @for Peer
   * @since 0.6.0
   */
  connected: function (com, data, listener) {
    if (typeof com.onconnect === 'function') {
      com.onconnect(com.id);
    }
  },
  
  /**
   * Event fired when peer connection has been disconnected.
   * This happens when RTCPeerConnection close is invoked and 
   *  connection stops.
   * @event peer:disconnect
   * @private
   * @for Peer
   * @since 0.6.0
   */
  disconnect: function (com, data, listener) {
    if (typeof com.ondisconnect === 'function') {
      com.ondisconnect();
    }
  },
  
  /**
   * Event fired when peer connection adds or receives a stream object.
   * This happens when user sends a local MediaStream to peer or receives
   *   a remote MediaStream from onaddstream event.
   * @event peer:disconnect
   * @private
   * @for Peer
   * @since 0.6.0
   */
  stream: function (com, data, listener) {
    data.stream.sourceType = data.sourceType;

    if (data.sourceType === 'remote') {
      com.stream = data.stream;
    }
    
    if (typeof com.onaddstream === 'function') {
      com.onaddstream(data.stream);
    }
  },

  /**
   * Event fired when peer connection ICE connection state has changed.
   * @property iceconnectionstate
   * @type Function
   * @private
   * @since 0.6.0
   */
  iceconnectionstate: function (com, data, listener) {
    if (typeof com.oniceconnectionstatechange === 'function') {
      com.oniceconnectionstatechange(data.state);
    }  
  },

  /**
   * Event fired when peer connection ICE gathering state has changed.
   * @property icegatheringstate
   * @type Function
   * @private
   * @since 0.6.0
   */
  icegatheringstate: function (com, data, listener) {
    if (typeof com.onicegatheringstatechange === 'function') {
      com.onicegatheringstatechange(data.state);
    }
  },

  /**
   * Event fired when peer connection ICE candidate is received.
   * @property icecandidate
   * @type Function
   * @private
   * @since 0.6.0
   */
  icecandidate: function (com, data, listener) {},

  /**
   * Event fired when peer connection signaling state changes.
   * This happens when RTCPeerConnection receives local or remote offer.
   * @property signalingstate
   * @type Function
   * @private
   * @since 0.6.0
   */
  signalingstate: function (com, data, listener) {
    if (typeof com.onsignalingstatechange === 'function') {
      com.onsignalingstatechange(data.state);
    }
  },

  /**
   * Event fired when peer connection datachannel is received.
   * This happens when RTCPeerConnection receives a local or remote RTCDataChannel.
   * @property datachannel
   * @type Function
   * @private
   * @since 0.6.0
   */
  datachannel: function (com, data, listener) {
    data.channel.sourceType = data.sourceType;

    com.datachannels[data.channel.id] = data.channel;
    
    if (typeof com.ondatachannel === 'function') {
      com.ondatachannel(data.channel);
    }
  }
};
var PeerHandler = function (com, event, data, listener) {
  var params = event.split(':');

  // Messaging events
  if (event.indexOf('message:') === 0) {

    fn.applyHandler(PeerEventMessageHandler, params, [com, data, listener]);

  } else {
    // Class events
    if (event.indexOf('peer:') === 0) {
      data.id = com.id;

      fn.applyHandler(PeerEventResponseHandler, params, [com, data, listener]);

    } else {
      data.peerId = com.id;

      fn.applyHandler(PeerEventReceivedHandler, params, [com, data, listener]);
    }

    listener(event, data);
  }

  //log.debug('PeerHandler', event, data);
};
var PeerHelper = {
  /* RTCPeerConnection polyfills */
  /**
   * Handles the configuration settings for cross-browser interopability and
   *   getConfiguration, getStreamById and canTrickleIceCandidates polyfill.
   * @method PeerHelper.create
   * @param {JSON} config The RTCConfiguration for the new RTCPeerConnection object.
   * @param {JSON} [optional] The optional RTCConfiguration for the new RTCPeerConnection object.
   * @private
   * @for Peer
   * @since 0.6.0
   */
  create: function (config, optional) {
    // Peer configuration
    var peerConfig = null;
    // Required parameters for Firefox interopability
    var peerOptional = {
      optional: [{
        DtlsSrtpKeyAgreement: true
      }]
    };

    if (config !== null && typeof config === 'object') {
      peerConfig = config;

      if (typeof config.iceServers === 'object' ? config.iceServers instanceof Array : false) {
        peerConfig.iceServers = this.ICE.configureTURN(peerConfig.iceServers);
      }
    }

    if (config !== null && typeof config === 'object') {
      peerOptional = optional;
    }

    var peer = new window.RTCPeerConnection(peerConfig, peerOptional);

    // Polyfill getConfiguration function
    // Override firefox unsupported feature
    if (typeof peer.getConfiguration !== 'function' || window.webrtcDetectedBrowser === 'firefox') {
      peer.getConfiguration = function () {
        peerConfig.optional = typeof peerOptional === 'object' ? peerOptional.optional || null : null;
        return peerConfig;
      };
    }

    // Polyfill getStreamById function
    // Override firefox unsupported feature
    if (typeof peer.getStreamById !== 'function' || window.webrtcDetectedBrowser === 'firefox') {
      peer.getStreamById = function (streamId) {
        var localStreams = peer.getLocalStreams();
        var remoteStreams = peer.getRemoteStreams();

        var i, j;

        for (i = 0; i < localStreams.length; i += 1) {
          if (streamId === localStreams[i].id) {
            return localStreams[i];
          }
        }

        for (j = 0; j < remoteStreams.length; j += 1) {
          if (streamId === remoteStreams[i].id) {
            return remoteStreams[j];
          }
        }

        return null;
      };
    }

    // Polyfill canTrickleIceCandidates property
    if (typeof peer.canTrickleIceCandidates !== 'boolean') {
      peer.canTrickleIceCandidates = window.webrtcDetectedBrowser === 'firefox' ?
        window.webrtcDetectedVersion > 27 : true;
    }

    return peer;
  },

  /**
   * Handles the addStream polyfill for RTCPeerConnection object.
   * If onnegotiationneeded event is not supported, fire if a stream has been added.
   * This polyfills the missing onnegotiationneeded event handler.
   * Support are for multi-stream sending only.
   * @method PeerHelper.addStream
   * @param {Object} peer The RTCPeerConnection object.
   * @param {Object} stream The MediaStream object.
   * @private
   * @support Chrome, Opera
   * @for Peer
   * @since 0.6.0
   */
  addStream: function (peer, stream) {
    if (window.webrtcDetectedBrowser === 'chrome' && window.webrtcDetectedBrowser === 'opera') {
      peer.addStream(stream);

    // Firefox and Safari / IE (plugin-enabled) browsers don't enable multi-stream
    // Firefox and Safari / IE (plugin-enabled) browsers does not support onnegotiationneeded
    } else {
      if (peer.getLocalStream().length > 0) {
        log.warn('StreamPolyfill', 'You cannot add more than 1 stream. Multi-stream sending is ' +
          'not supported in ' + window.webrtcDetectedBrowser.toUpperCase() +
          (window.webrtcDetectedType === 'plugin' ? ' (plugin-enabled)' : '') + ' browser');
        return;
      }

      // Add stream once
      peer.addStream(stream);

      if (typeof peer.onnegotiationneeded === 'function') {
        peer.onnegotiationneeded(peer);
      }
    }
  },

  /**
   * Handles the removeStream polyfill for RTCPeerConnection object.
   * For non-supported browsers, the peer connection will be re-initialized
   *   without adding any stream.
   * @method PeerHelper.removeStream
   * @param {Object} peer The RTCPeerConnection object.
   * @param {Object} stream The MediaStream object.
   * @private
   * @support Chrome, Opera
   * @for Peer
   * @since 0.6.0
   */
  removeStream: function (peer, stream) {
    if (window.webrtcDetectedBrowser === 'chrome' && window.webrtcDetectedBrowser === 'opera') {
      peer.removeStream(stream);

    // Firefox and Safari / IE (plugin-enabled) browsers don't enable multi-stream
    // Firefox and Safari / IE (plugin-enabled) browsers does not support onnegotiationneeded
    } else {
      if (peer.getLocalStream().length > 0) {
        var constraints = null;
        var optional;

        // Restart the negotiation
        if (typeof peer.constraints === 'object') {
          constraints = peer.constraints;
          optional = peer.optional;
        }

        var peer2 = this.create(constraints, optional);

        // Recopy all the functions again.
        var key;

        var unwantedKeys = [
          'signalingState',
          'iceConnectionState',
          'iceGatheringState',
          'localDescription',
          'remoteDescription',
          'createDataChannel',
          'updateIce',
          'addIceCandidate',
          'addStream',
          'removeStream',
          'getStats',
          'getStreamById',
          'createDataChannel',
          'createDTMFSender',
          'createOffer',
          'createAnswer',
          'setLocalDescription',
          'setRemoteDescription',
          'getSenders',
          'getReceivers',
          'addTrack',
          'removeTrack'
        ];

        for (key in peer) {
          if (peer.hasOwnProperty(key)) {
            if (unwantedKeys.indexof(key) === -1) {
              try {
                peer2[key] = peer[key];

              } catch (error) {
                log.warn('Not supported to replace "' + key + '" key');
              }
            }
          }
        }

        // If subscribed to our event
        if (!!peer2.newiceConnectionState) {
          this.ICE.state(peer2);
        }

        // Check if remoteDescription is set before firing onremovestream
        var checkForRemoteDesc = setInterval(function () {
          if (!!peer2.remoteDescription) {
            clearInterval(checkForRemoteDesc);

            if (typeof peer2.onremovestream === 'function') {
              peer2.onremovestream(peer);
            }
          }
        }, 10);


        // Re-invoke negotiation needed
        if (typeof peer2.onnegotiationneeded === 'function') {
          peer2.onnegotiationneeded(peer2);
        }

        peer = peer2;
      }
    }
  },

  /* ICE helper functions */
  ICE: {

    /**
     * Parses the received ICE connection state and updates to a new version
     *   to handle the differences received from cross-browsers.
     * Use <code>pc.onnewiceconnectionstatechange</code> instead of
     *   <code>pc.oniceconnectionstatechange</code>.
     * Use <code>pc.newiceConnectionState</code> for the updated ICE connection state.
     * State should go from <code>checking > connected > completed</code>.
     * @method PeerHelper.ICE.state
     * @param {Object} peer The RTCPeerConnection object.
     * @private
     * @example
     *   PeerHelper.ICE.state(pc);
     *   pc.onnewiceconnectionstatechange = function () {
     *     // here's my new state.
     *     var state = pc.newiceConnectionState;
     *   };
     * @for Peer
     * @since 0.6.0
     */
    state: function (peer) {
      var updatedStateList = {
        starting : 'starting',
        checking : 'checking',
        connected : 'connected',
        completed : 'connected',
        done : 'completed',
        disconnected : 'disconnected',
        failed : 'failed',
        closed : 'closed'
      };

      peer.newiceConnectionState = peer.iceConnectionState || 'new';

      peer.oniceconnectionstatechange = function () {
        var state = peer.iceConnectionState;
        var checkState = updatedStateList[state];

        // Check if state is new or has been disconnected / failed / closed
        if (!peer.iceConnectionFiredStates || checkState === 'disconnected' ||
            checkState === 'failed' || checkState === 'closed') {
          peer.iceConnectionFiredStates = [];
        }

        // Display updated state
        var newState = updatedStateList[state];

        if (peer.iceConnectionFiredStates.indexOf(newState) < 0) {
          peer.iceConnectionFiredStates.push(newState);

          if (newState === 'connected') {
            setTimeout(function () {
              peer.iceConnectionFiredStates.push('done');

              peer.newiceConnectionState = 'completed';

              // Set using a new attached function instead to prevent
              // overriding the original one
              peer.oniceconnectionnewstatechange(peer);
            }, 1000);
          }
          peer.newiceConnectionState = newState;
          peer.onnewiceconnectionstatechange(peer);
        }
      };
    },

    /**
     * Adds ICE candidate to the RTCPeerConnection object and buffers
     *   candidates if remote description has not yet be set.
     * Use a common success and failure defer.
     * Once remote description is set, the buffered ICE candidates will be
     *   added to the RTCPeerConnection object.
     * @method PeerHelper.ICE.addCandidate
     * @param {Object} peer The RTCPeerConnection object.
     * @param {Object} candidate The RTCIceCandidate object.
     * @param {Function} successDefer The defer fired once ICE candidate is
     *   added successfully.
     * @param {Function} failureDefer The defer fired once ICE candidate has
     *   an exception adding it.
     * @private
     * @example
     *   PeerHelper.ICE.addCandidate(peer, candidate, function () {
     *     console.log('Successfully added candidate');
     *   }, function (error) {
     *     console.error('Failed adding candidate. Exception occurred:', error)
     *   });
     * @for Peer
     * @since 0.6.0
     */
    addCandidate: function (peer, candidate, successDefer, failureDefer) {
      if (!!peer.remoteDescription) {
        // Add the candidates
        peer.addIceCandidate(candidate, successDefer, failureDefer);

      } else {
        // Buffer the candidates
        peer.bufferCandidates = peer.bufferCandidates || [];
        peer.bufferCandidates.push(candidate);

        // If peer has a steady connection, do not add. If peer does not has an interval
        //   create
        if (!!peer.waitForBuffer && (peer.newiceConnectionState !== 'connected' ||
          peer.newiceConnectionState !== 'completed')) {
          // Do a buffer to check
          var waitForBuffer = setInterval(function () {
            if (!!peer.remoteDescription) {
              console.log('Adding buffered candidates');

              // Clear interval
              clearInterval(waitForBuffer);

              var i;

              // Loop and add all bufferred candidates
              for (i = 0; i < peer.bufferCandidates.length; i += 1) {
                peer.addIceCandidate(peer.bufferCandidates[i], successDefer, failureDefer);
              }

              // Remove reference
              delete peer.waitForBuffer;
            }
          }, 10);
        }
      }
    },

    /**
     * Parses TURN url format for cross-browser interopability.
     * For an example, Firefox does not support <code>username@turnserver.com</code>,
     *   whereas Chrome supports it.
     * @method PeerHelper.ICE.configureTURN
     * @param {Array} iceServers The list of ICE servers.
     * @param {JSON} iceServers.(#index) The ICE server.
     * @param {String} iceServers.(#index).credential The ICE server credential (password).
     * @param {String} iceServers.(#index).url The ICE server url. For TURN server,
     *   the format may vary depending on the support of the TURN url format.
     * @returns {Array} The updated ICE servers list.
     * - <code>(#index)</code> <var>: <b>type</b> JSON</var><br>
     *   The ICE server.
     * - <code>(#index).credential</code> <var>: <b>type</b> String</var><br>
     *   The ICE server credential (password). Only used in TURN servers.
     * - <code>(#index).url</code> <var>: <b>type</b> String</var><br>
     *   The ICE server url. For TURN server, the format may vary depending on the support of
     *   the TURN url format.
     * - <code>(#index).username</code> <var>: <b>type</b> String</var><br>
     *   The ICE server username. Only used in TURN servers for Firefox browsers.
     * @private
     * @example
     *   var updateIceServers = PeerHelper.ICE.configureTURN(iceServers);
     * @for Peer
     * @since 0.6.0
     */
    configureTURN: function (iceServers) {
      var newConfig = [];
      var i;

      for (i = 0; i < iceServers.length; i += 1) {
        // The new ice server object
        var iceServer = {
          url: iceServers[i].url
        };

        // If there is credential, add it.
        if (!!iceServers[i].credential) {
          iceServer.credential = iceServers[i].credential;
        }

        // If there is username, add it.
        if (!!iceServers[i].username) {
          iceServer.username = iceServers[i].username;
        }

        // For Firefox only
        if (window.webrtcDetectedBrowser === 'firefox') {
          // If it's a TURN server
          if (iceServer.url.indexOf('turn') === 0) {
            // Check if the url is username@turn.com
            if (iceServer.url.indexOf('@') > 0) {
              var iceParts = iceServer.url.split(':');
              var subIceParts = iceParts[1].split('@'); // user '@' url

              iceParts[1] = subIceParts[1];
              iceServer.url = iceParts.join(':');
              iceServer.username = subIceParts[0];
            }
          }
        }
        newConfig.push(iceServer);
      }
      // Return the new data
      return newConfig;
    }

  }
};
function Room(name, listener) {
  'use strict';

  // Prevent undefined listener error
  listener = listener || function (event, data) {};

  // Reference of instance
  var com = this;

  /**
   * The room name.
   * @attribute name
   * @type String
   * @private
   * @for Room
   * @since 0.6.0
   */
  com.name = name;

  /**
   * The room id.
   * @attribute id
   * @type String
   * @private
   * @for Room
   * @since 0.6.0
   */
  com.id = null;

  /**
   * The room token.
   * @attribute token
   * @type String
   * @private
   * @for Room
   * @since 0.6.0
   */
  com.token = null;

  /**
   * The room key.
   * @attribute key
   * @type String
   * @private
   * @for Room
   * @since 0.6.0
   */
  com.key = null;

  /**
   * The room start date timestamp (ISO format) for persistent mode.
   * @attribute startDateTime
   * @type String
   * @private
   * @for Room
   * @since 0.6.0
   */
  com.startDateTime = null;

  /**
   * The room duration for persistent mode.
   * @attribute duration
   * @type Integer
   * @private
   * @for Room
   * @since 0.6.0
   */
  com.duration = null;

  /**
   * The request path to the api server.
   * @attribute apiPath
   * @type String
   * @private
   * @for Room
   * @since 0.6.0
   */
  com.apiPath = null;

  /**
   * The room api owner.
   * @attribute owner
   * @type String
   * @private
   * @for Room
   * @since 0.6.0
   */
  com.owner = null;

  /**
   * The user set settings for the room.
   * @attribute credentials
   * @param {Integer} duration The room duration set by user.
   * @param {String} hash The hashed secret generated by user.
   * @param {String} startDateTime The room start date timestamp (ISO format) set by user.
   * @type JSON
   * @private
   * @for Room
   * @since 0.6.0
   */
  com.credentials = globals.credentials;

  /**
   * The self user connection.
   * @attribute self
   * @type Self
   * @private
   * @for Room
   * @since 0.6.0
   */
  com.self = null;

  /**
   * The list of users connected to room.
   * @attribute users
   * @param {User} (#userId) The user connected to room.
   * @type JSON
   * @private
   * @for Room
   * @since 0.6.0
   */
  com.users = {};

  /**
   * The list of components connected to room.
   * This could be <var>MCU</var> or <var>Recording</var> peers.
   * @attribute components
   * @param {Component} (#index) The component connected to room.
   * @type JSON
   * @private
   * @for Room
   * @since 0.6.0
   */
  com.components = {};

  /**
   * The room duration.
   * @attribute startDateTime
   * @type Socket
   * @required
   * @private
   * @for Room
   * @since 0.6.0
   */
  com.socket = null;

  /**
   * The room TURN/STUN servers connection.
   * @attribute iceServers
   * @param {JSON} (#index) The ICE server.
   * @param {String} (#index).credential The ICE server credential (password).
   * @param {String} (#index).url The ICE server url. The current format
   *    for TURN servers is <code>turn:username@urlhost</code>. It may be
   *    required to parse it differently in
   *    <code>{ username: 'username', credential: 'xxx', url: 'turn:urlhost' }</code>
   *    format for unsupported browsers like firefox.
   * @type Array
   * @required
   * @private
   * @for Room
   * @since 0.6.0
   */
  com.iceServers = [];

  /**
   * The flag that indicates if the self user has joined the room.
   * @attribute connected
   * @type Boolean
   * @required
   * @private
   * @for Room
   * @since 0.6.0
   */
  com.connected = false;

  /**
   * The flag that indicates if the room is locked.
   * @attribute locked
   * @type Boolean
   * @required
   * @private
   * @for Room
   * @since 0.6.0
   */
  com.locked = false;


  /**
   * Function to subscribe to when room is initializating the configuration.
   * @method oninit
   * @eventhandler true
   * @for Room
   * @since 0.6.0
   */
  com.oninit = function () {};

  /**
   * Function to subscribe to when room object has loaded and is ready to use.
   * @method onready
   * @eventhandler true
   * @for Room
   * @since 0.6.0
   */
  com.onready = function () {};

  /**
   * Function to subscribe to when self has joined the room.
   * @method onjoin
   * @eventhandler true
   * @for Room
   * @since 0.6.0
   */
  com.onjoin = function () {};

  /**
   * Function to subscribe to when a user has joined the room.
   * @method onuserjoin
   * @eventhandler true
   * @for Room
   * @since 0.6.0
   */
  com.onuserjoin = function () {};

  /**
   * Function to subscribe to when self has been kicked out of room.
   * @method onkick
   * @eventhandler true
   * @for Room
   * @since 0.6.0
   */
  com.onkick = function () {};

  /**
   * Function to subscribe to when self is warned by server before kicking self user.
   * @method onwarn
   * @eventhandler true
   * @for Room
   * @since 0.6.0
   */
  com.onwarn = function () {};

  /**
   * Function to subscribe to when room has been locked.
   * @method onlock
   * @for Room
   * @since 0.6.0
   */
  com.onlock = function () {};

  /**
   * Function to subscribe to when room has been unlocked.
   * @method onunlock
   * @eventhandler true
   * @for Room
   * @since 0.6.0
   */
  com.onunlock = function () {};

  /**
   * Function to subscribe to when self has leave the room.
   * @method onleave
   * @eventhandler true
   * @for Room
   * @since 0.6.0
   */
  com.onleave = function () {};


  /**
   * The handler handles events.
   * @method handler
   * @param {String} event The event name.
   * @param {JSON} data The response data.
   * @private
   * @for Room
   * @since 0.6.0
   */
  com.handler = function (event, data) {
    RoomHandler(com, event, data, listener);
  };

  /**
   * Loads the connection information of the room.
   * @method init
   * @private
   * @for Room
   * @since 0.6.0
   */
  com.init = function () {
    // Start loading the room information
    var path = '/api/' + globals.apiKey + '/' + com.name;

    // Set credentials if there is
    if (com.credentials !== null) {
      path += com.credentials.startDateTime + '/' +
        com.credentials.duration + '?&cred=' + com.credentials.hash;
    }

    // Check if there is a other query parameters or not
    if (globals.region) {
      path += (path.indexOf('?&') > -1 ? '&' : '?&') + 'rg=' + globals.region;
    }

    // Start connection
    Request.load(path, function (status, content) {
      // Store the path information
      com.apiPath = path;

      // Room configuration settings from server
      com.key = content.cid;
      com.id = content.room_key;
      com.token = content.roomCred;
      com.startDateTime = content.start;
      com.duration = content.len;
      com.owner = content.apiOwner;

      // User configuration settings from server
      var userConfig = {
        id: null,
        username: content.username,
        token: content.userCred,
        timeStamp: content.timeStamp,
        data: null
      };

      com.self = new Self(userConfig, com.routeEvent);

      //com.constraints = JSON.parse(content.pc_constraints);

      // Signalling information
      var socketConfig = {
        server: content.ipSigserver,
        httpPortList: content.httpPortList,
        httpsPortList: content.httpsPortList
      };
      com.socket = new Socket(socketConfig, com.routeEvent);

      com.respond('room:ready');

    }, function (status, error) {
      com.respond('room:error', {
        error: error
      });

    }, function () {
      com.respond('room:init');
    });
  };

  /**
   * Starts the connection to the room.
   * @method join
   * @param {Stream} stream The stream object to send. <mark>Stream</mark> object must
   *   be ready before sending. Look at <var>stream:start</var> event.
   *   Set as <code>null</code> for non-stream connection.
   * @param {JSON} [config] The configuration settings.
   * @param {JSON} [config.bandwidth] The bandwidth configuration for the connection.
   *    This does fixes the bandwidth but doesn't prevent alterations done by browser for smoother streaming.
   * @param {Integer} [config.bandwidth.audio] The audio banwidth configuration.
   * @param {Integer} [config.bandwidth.video] The video banwidth configuration.
   * @param {Integer} [config.bandwidth.data] The data banwidth configuration.
   * @param {JSON|String} [config.userData] The self user's custom data.
   * @for Room
   * @since 0.6.0
   */
  com.join = function (stream, config) {
    if (com.connected) {
      throw new Error('You are already connected to this "' + com.name +'" room');
    }

    config = config || {};

    // Parse self configuration first
    com.self.bandwidth = StreamParser.parseBandwidthConfig(config.bandwidth);
    com.self.data = config.userData;

    // Add stream if stream is not empty
    if (typeof stream === 'object' ? stream instanceof Stream : false) {
      com.self.addStreamConnection(stream, 'main');
    }

    // Start socket connection
    com.socket.connect();
  };

  /**
   * Stops the connection to the room.
   * @method leave
   * @for Room
   * @since 0.6.0
   */
  com.leave = function () {
    // Disconnect socket connection
    com.socket.disconnect();
  };

  /**
   * Locks the room.
   * @method lock
   * @for Room
   * @since 0.6.0
   */
  com.lock = function () {
    var message = {
      type: 'roomLockEvent',
      mid: com.self.id,
      rid: com.id,
      lock: true
    };

    com.socket.send(message);

    com.respond('room:lock', {
      selfId: com.self.id
    });
  };

  /**
   * Unlocks the room.
   * @method unlock
   * @for Room
   * @since 0.6.0
   */
  com.unlock = function () {
    var message = {
      type: 'roomLockEvent',
      mid: com.self.id,
      rid: com.id,
      lock: false
    };

    com.socket.send(message);

    com.respond('room:unlock', {
      userId: com.self.id
    });
  };

  /**
   * Sends a stream to users.
   * @method sendStream
   * @param {Stream} stream The stream object. <mark>Stream</mark> object must
   *   be ready before sending. Look at <var>stream:start</var> event.
   * @for Room
   * @since 0.6.0
   */
  com.sendStream = function (stream, targetUsers) {
    var peerId = fn.generateUID();
    var key;

    // Do a check of targetUsers to send
    com.self.addStreamConnection(stream, peerId);

    for (key in com.users) {
      if (com.users.hasOwnProperty(key)) {
        var message = {
          type: 'enter',
          mid: com.self.id,
          rid: com.id,
          prid: peerId,
          stream: com.self.getStreamingInfo('main')
        };

        com.users[key].routeMessage('message:enter', message);
      }
    }
  };

  // Start the room connection information
  com.init();
}
/**
 * Handles all the message events received from socket.
 * @attribute RoomEventMessageHandler
 * @private
 * @for Room
 * @since 0.6.0
 */
var RoomEventMessageHandler = {

  /**
   * The message that indicates that self user is in the room.
   * @event inRoom
   * @param {JSON} message The message received.
   * @param {String} message.type The type of message.
   * @param {String} message.sid The self user id.
   * @param {JSON} message.pc_config The RTCPeerConnection configuration.
   * @param {Array} message.pc_config.iceServers The list of ICE servers.
   * @private
   * @for Messaging
   * @since 0.6.0
   */
  inRoom: function (com, data, listener) {
    // Respond to self user that self user is in the room
    // and set the relevant data to self user.
    com.self.routeMessage(data);

    // The ICE servers received when "inRoom"
    com.iceServers = fn.isSafe(function () {
      return data.pc_config.iceServers;
    }) || [];

    // Notify to trigger onjoin event
    com.respond('room:join', {
      user: com.self
    });
  },

  /**
   * The message that indicates that a user has joined the room.
   * This is sent when user has just started a connection to the room.
   * @event enter
   * @param {JSON} message The message received.
   * @param {String} message.type The type of message.
   * @param {String} message.mid The user id.
   * @param {String} message.prid The shared peer connection id.
   * @param {JSON} message.stream The peer connection streaming configuration.
   * @param {JSON|Boolean} [message.stream.audio=false] The audio stream configuration.
   *    If parsed as a boolean, other configuration settings under the audio
   *    configuration would be set as the default setting in the connection.
   * @param {Boolean} [message.stream.audio.stereo=false] The flag that indiciates
   *    if stereo is enabled for this connection.
   * @param {String} [message.stream.audio.sourceId] The source id of the audio MediaStreamTrack
   *    used for this connection.
   * @param {String|Boolean} [message.stream.video=false] The video stream configuration.
   *    If parsed as a boolean, other configuration settings under the video
   *    configuration would be set as the default setting in the connection.
   * @param {JSON} [message.stream.video.resolution] The video streaming resolution.
   * @param {Integer} message.stream.video.resolution.width The video resolution width.
   * @param {Integer} message.stream.video.resolution.height The video resolution height.
   * @param {Integer} message.stream.video.frameRate The video stream framerate.
   * @param {String} [message.stream.video.sourceId] The source id of the video MediaStreamTrack
   *    used for this connection.
   * @param {JSON} message.stream.status The stream MediaStreamTrack status.
   * @param {Boolean} [message.stream.status.audioMuted=false] The flag that indicates if audio is muted.
   *    If audio is set to false, this would be set as true.
   * @param {Boolean} [message.stream.status.videoMuted=false] The flag that indicates if video is muted.
   *    If video is set to false, this would be set as true.
   * @param {Integer} message.userData The user custom data. Only given for "main" peer connections.
   * @param {JSON} message.agent The user's browser agent information. Only given for "main" peer connections.
   * @param {String} message.agent.name The user's browser agent name. For other SDKs, it's indicated
   *    by their type of device <code>E.g. ios, android</code>. For components, it's indicated
   *    by their type <code>E.g. MCU, Recording</code>.
   * @param {Integer} message.agent.version The user's browser agent version. For other SDKs, it's indicated
   *    by their version of device OS <code>ios8 = 8. android kitkat = 4.4</code>. For components, it's indicated
   *    by their version <code>E.g. 0.1.0, 0.2.0</code>.
   * @param {String} message.agent.webRTCType The user's browser agent webrtc implementation type. For other SDKs or
   *    components, use <code>other</code>.
   * @param {JSON} message.bandwidth The peer connection bandwidth configuration.
   *    This does fixes the bandwidth but doesn't prevent alterations done by browser for smoother streaming.
   * @param {Integer} [message.bandwidth.audio] The bandwidth configuration for the audio stream.
   * @param {Boolean} [message.bandwidth.video] The bandwidth configuration for the video stream.
   * @param {Boolean} [message.bandwidth.data] The bandwidth configuration for the data stream.
   * @param {String} message.rid The room id.
   * @private
   * @for Messaging
   * @since 0.6.0
   */
  enter: function (com, data, listener) {
    // A user has just joined the room
    var user = com.users[data.mid];

    // If the user is empty (which is supposed to be that case),
    // create a user which will create a peer connection when
    // the user object is ready
    if (fn.isEmpty(user)) {
      var config = {
        id: data.mid,
        stream: data.stream,
        agent: data.agent,
        bandwidth: data.bandwidth,
        data: data.userData,
        SDPType: 'answer'
      };

      user = new User(config, com.routeEvent);

      com.users[data.mid] = user;

      // Invoke function that user has joined
      if (typeof com.onuserjoin === 'function') {
        com.onuserjoin(user);
      }
    }
  },

  /**
   * The message that indicates that a user has joined the room.
   * This is sent as a response to user's "enter" message.
   * @event welcome
   * @param {JSON} message The message received.
   * @param {String} message.type The type of message.
   * @param {String} message.mid The user id.
   * @param {String} message.prid The shared peer connection id.
   * @param {JSON} message.stream The peer connection streaming configuration.
   * @param {JSON|Boolean} [message.stream.audio=false] The audio stream configuration.
   *    If parsed as a boolean, other configuration settings under the audio
   *    configuration would be set as the default setting in the connection.
   * @param {Boolean} [message.stream.audio.stereo=false] The flag that indiciates
   *    if stereo is enabled for this connection.
   * @param {String} [message.stream.audio.sourceId] The source id of the audio MediaStreamTrack
   *    used for this connection.
   * @param {String|Boolean} [message.stream.video=false] The video stream configuration.
   *    If parsed as a boolean, other configuration settings under the video
   *    configuration would be set as the default setting in the connection.
   * @param {JSON} [message.stream.video.resolution] The video streaming resolution.
   * @param {Integer} message.stream.video.resolution.width The video resolution width.
   * @param {Integer} message.stream.video.resolution.height The video resolution height.
   * @param {Integer} message.stream.video.frameRate The video stream framerate.
   * @param {String} [message.stream.video.sourceId] The source id of the video MediaStreamTrack
   *    used for this connection.
   * @param {JSON} message.stream.status The stream MediaStreamTrack status.
   * @param {Boolean} [message.stream.status.audioMuted=false] The flag that indicates if audio is muted.
   *    If audio is set to false, this would be set as true.
   * @param {Boolean} [message.stream.status.videoMuted=false] The flag that indicates if video is muted.
   *    If video is set to false, this would be set as true.
   * @param {Integer} message.userData The user custom data. Only given for "main" peer connections.
   * @param {JSON} message.agent The user's browser agent information. Only given for "main" peer connections.
   * @param {String} message.agent.name The user's browser agent name. For other SDKs, it's indicated
   *    by their type of device <code>E.g. ios, android</code>. For components, it's indicated
   *    by their type <code>E.g. MCU, Recording</code>.
   * @param {Integer} message.agent.version The user's browser agent version. For other SDKs, it's indicated
   *    by their version of device OS <code>ios8 = 8. android kitkat = 4.4</code>. For components, it's indicated
   *    by their version <code>E.g. 0.1.0, 0.2.0</code>.
   * @param {String} message.agent.webRTCType The user's browser agent webrtc implementation type. For other SDKs or
   *    components, use <code>other</code>.
   * @param {Integer} message.weight The priority weight of the message. In use-cases where both users receives each
   *    others "enter" message during the first handshake, the priority would indicate which user gets to do
   *    the offer.
   * @param {JSON} message.bandwidth The peer connection bandwidth configuration.
   *    This does fixes the bandwidth but doesn't prevent alterations done by browser for smoother streaming.
   * @param {Integer} [message.bandwidth.audio] The bandwidth configuration for the audio stream.
   * @param {Boolean} [message.bandwidth.video] The bandwidth configuration for the video stream.
   * @param {Boolean} [message.bandwidth.data] The bandwidth configuration for the data stream.
   * @param {String} message.rid The room id.
   * @param {String} message.target The targeted user id to receive welcome.
   * @private
   * @for Messaging
   * @since 0.6.0
   */
  welcome: function (com, data, listener) {
    var user = com.users[data.mid];

    if (fn.isEmpty(user)) {
      var config = {
        id: data.mid,
        stream: data.stream,
        agent: data.agent,
        bandwidth: data.bandwidth,
        data: data.userData,
        SDPType: 'offer'
      };

      user = new User(config, com.routeEvent);

      com.users[data.mid] = user;

      // Invoke function when user has joined
      if (typeof com.onuserjoin === 'function') {
        com.onuserjoin(user);
      }
    }
  },

  /**
   * The message that starts a user's peer connection offer and answer handshake.
   * @event offer
   * @param {JSON} message The message received.
   * @param {String} message.type The type of message.
   * @param {String} message.sdp The offer session description.
   * @param {String} message.prid The peer connection id.
   * @param {String} message.mid The user id.
   * @param {String} message.rid The room id.
   * @param {String} message.target The targeted user id to receive offer.
   * @private
   * @for Messaging
   * @since 0.6.0
   */
  offer: function (com, data, listener) {
    var user = com.users[data.mid];

    if (!fn.isEmpty(user)) {
      user.routeMessage(data);
    }
  },

  /**
   * The message that responses to a user's peer connection offer.
   * @event answer
   * @param {JSON} message The message received.
   * @param {String} message.type The type of message.
   * @param {String} message.sdp The answer session description.
   * @param {String} message.prid The peer connection id.
   * @param {String} message.mid The user id.
   * @param {String} message.rid The room id.
   * @param {String} message.target The targeted user id to receive answer.
   * @private
   * @for Messaging
   * @since 0.6.0
   */
  answer: function (com, data, listener) {
    var user = com.users[data.mid];

    if (!fn.isEmpty(user)) {
      user.routeMessage(data);
    }
  },

  /**
   * The message that is received when candidate is generated from the user's peer connection.
   * It's recommend to add all the relevant information when instianting a new <var>RTCIceCandidate</var>
   *   object.
   * @event candidate
   * @param {JSON} message The message received.
   * @param {String} message.type The type of message.
   * @param {String} message.candidate The candidate's candidate session description.
   * @param {String} message.id The candidate's sdpMid.
   * @param {Integer} message.label The candidate's sdpMLineIndex.
   * @param {String} message.prid The peer connection id.
   * @param {String} message.mid The user id.
   * @param {String} message.rid The room id.
   * @param {String} message.target The targeted user id to receive generated candidate.
   * @private
   * @for Messaging
   * @since 0.6.0
   */
  candidate: function (com, data, listener) {
    var user = com.users[data.mid];

    if (!fn.isEmpty(user)) {
      user.routeMessage(data);
    }
  },

  /**
   * The message that is received when user's custom data is updated.
   * @event updateUserEvent
   * @param {JSON} message The message received.
   * @param {String} message.type The type of message.
   * @param {JSON|String} message.userData The updated custom user data.
   * @param {String} message.mid The user id.
   * @param {String} message.rid The room id.
   * @private
   * @for Messaging
   * @since 0.6.0
   */
  updateUserEvent: function (com, data, listener) {
    var user = com.users[data.mid];

    if (!fn.isEmpty(user)) {
      user.routeMessage(data.userData);
    }
  },

  /**
   * The message that is received when user's peer connection audio stream mute status
   *   have changed. This is inline with <var>MediaStreamTrack</var> API's <code>enabled = true/false</code>.
   * @event muteAudioEvent
   * @param {JSON} message The message received.
   * @param {String} message.type The type of message.
   * @param {Boolean} message.muted The updated audio stream mute status.
   * @param {String} message.mid The user id.
   * @param {String} message.rid The room id.
   * @param {String} message.prid The shared peer connection id.
   * @private
   * @for Messaging
   * @since 0.6.0
   */
  muteAudioEvent: function (com, data, listener) {
    var user = com.users[data.mid];

    if (!fn.isEmpty(user)) {
      user.routeMessage(data);
    }
  },

  /**
   * The message that is received when user's peer connection video stream mute status
   *   have changed. This is inline with <var>MediaStreamTrack</var> API's <code>enabled = true/false</code>.
   * @event muteVideoEvent
   * @param {JSON} message The message received.
   * @param {String} message.type The type of message.
   * @param {Boolean} message.muted The updated video stream mute status.
   * @param {String} message.mid The user id.
   * @param {String} message.rid The room id.
   * @param {String} message.prid The shared peer connection id.
   * @private
   * @for Messaging
   * @since 0.6.0
   */
  muteVideoEvent: function (com, data, listener) {
    var user = com.users[data.mid];

    if (!fn.isEmpty(user)) {
      user.routeMessage(data);
    }
  },

  /**
   * The message that is received when the current room lock status have changed.
   * @event roomLockEvent
   * @param {JSON} message The message received.
   * @param {String} message.type The type of message.
   * @param {Boolean} message.locked The updated room lock status.
   * @param {String} message.mid The user id.
   * @param {String} message.rid The room id.
   * @private
   * @for Messaging
   * @since 0.6.0
   */
  roomLockEvent: function (com, data, listener) {
    com.locked = data.lock;

    if (com.locked) {
      if (typeof com.onlock === 'function') {
        com.onlock(data.mid);
      }

    } else {
      if (typeof com.onunlock === 'function') {
        com.onunlock(data.mid);
      }
    }
  },

  /**
   * The message that is received when user's peer connection is going through a refresh.
   * @event restart
   * @param {JSON} message The message received.
   * @param {String} message.type The type of message.
   * @param {String} message.mid The user id.
   * @param {String} message.rid The room id.
   * @param {String} message.prid The shared peer connection id.
   * @param {String} message.SDPType The handshake SDP type. <code>"offer"</code> is for the peer
   *   connection that initiated the restart. <code>"answer"</code> is for the peer
   *   connection that is responding to the restart.
   * @param {JSON} message.sdp The session description message for restart.
   * @param {String} message.sdp.type The <var>RTCSessionDescription</var> type.
   * @param {String} message.sdp.sdp The <var>RTCSessionDescription</var> session description.
   * @private
   * @for Messaging
   * @since 0.6.0
   */
  restart: function (com, data, listener) {
    var user = com.users[data.mid];

    if (!fn.isEmpty(user)) {
      user.respondMessage(data);

    } else {
      throw new Error('User "' + data.mid + '" does not exists');
    }
  },

  /**
   * The message that is received when user is receiving a rejection or warning from signaling server.
   * @event redirect
   * @param {JSON} message The message received.
   * @param {String} message.type The type of message.
   * @param {String} message.mid The user id.
   * @param {String} message.rid The room id.
   * @param {String} message.action The action received that indicates if user is warned or rejected.
   *    <code>"warning"</code> is when signaling is warning user of the action and comply accordingly.
   *    <code>"reject"</code> is when signaling has kicked user out of the room.
   * @param {JSON} message.info The signaling message for the redirect message.
   * @param {String} message.reason The reason for the action taken by signaling.
   * @private
   * @for Messaging
   * @since 0.6.0
   */
  redirect: function (com, data, listener) {
    if (data.action === 'reject') {
      // User is kicked out of the room
      com.respond('room:kick', {});
    }

    if (data.action === 'warning') {
      // User is warned
      com.respond('room:warn', {});
    }
  },

  /**
   * The message that is received when user has left the room.
   * @event bye
   * @param {JSON} message The message received.
   * @param {String} message.type The type of message.
   * @param {String} message.mid The user id.
   * @param {String} message.rid The room id.
   * @private
   * @for Messaging
   * @since 0.6.0
   */
  bye: function (com, data, listener) {
    var user = com.users[data.mid];

    // Disconnect user
    if (!fn.isEmpty(user)) {
      user.disconnect();

    } else {
      throw new Error('User "' + data.mid + '" does not exists');
    }
  }

};
var RoomEventReceivedHandler = {

  // Handles the stream events
  socket: {

    // When socket is connected, join the room
    connect: function (com, data, listener) {
      var message = {
        type: 'joinRoom',
        uid: com.self.username,
        cid: com.key,
        rid: com.id,
        userCred: com.self.token,
        timeStamp: com.self.timeStamp,
        apiOwner: com.owner,
        roomCred: com.token,
        start: com.startDateTime,
        len: com.duration
      };

      com.socket.send(message);
    },

    // When socket is disconnected, trigger that leave
    disconnect: function (com, data, listener) {
      com.respond('room:leave', {});
    },

    // When socket sends or receives a message
    message: function (com, data, listener) {
      // If it's a remote source
      if (data.sourceType === 'remote') {
        listener('message:' + com.data, data);
      }
    },

    // When socket has exception, room has exception
    error: function (com, data, listener) {
      com.respond('room:error', {
        error: data,
        state: -2
      });
    }

  },

  // Handles the user events */
  user: {

    // When user object is initialized, start the "main" peer connection
    ready: function (com, data, listener) {
      // Get user object
      var user = com.users[data.id];

      // Get self local MediaStream
      var stream = com.self.streamConnections.main;

      // If stream exists, append it as streamObject
      if (!fn.isEmpty(stream)) {
        data.streamObject = stream;
      }

      // Set the ICE servers
      data.iceServers = com.iceServers;

      // Relay it to the userhandler
      user.routeMessage(data);
    }

  },

  // Handles the self user events */
  self: {

    // When self user custom data is updated, send to socket to update other users
    update: function (com, data, listener) {
      var message = {
        type: 'updateUserEvent',
        mid: data.id,
        rid: com.id,
        userData: data.userData
      };

      com.socket.send(message);
    },

    // When self user is connected to the room (after setting the self user id and
    // relevant information) start to send the enter
    connect: function (com, data, listener) {
      // Send and start the "main" peer connection
      var message = com.self.getInfo('main');

      message.type = 'enter';
      message.mid = com.self.id;
      message.rid = com.id;
      message.prid = 'main';

      com.socket.send(message);
    }

  },

  // Handles the peer events */
  peer: {

    // When peer connection object is initialized, we can start sending the welcome
    // to start the O/A handshake
    connect: function (com, data, listener) {
      // Retrieve the user
      var user = com.users[data.userId];

      // Check if user exists
      if (!fn.isEmpty(user)) {
        // Retrieve the user for this peer only
        var userInfo = user.getInfo(data.id);

        // Send welcome after creating object for answerer
        if (data.SDPType === 'answer') {
          var message = {
            type: 'welcome',
            mid: com.self.id,
            rid: com.id,
            prid: data.id,
            agent: window.webrtcDetectedBrowser,
            version: window.webrtcDetectedVersion,
            webRTCType: window.webrtcDetectedType,
            userInfo: com.self.getInfo(data.id),
            target: data.userId,
            weight: data.weight
          };
          com.socket.send(message);
        }

      } else {
        throw new Error('User "' + data.userId + '" does not exists');
      }
    },

    // When peer connection starts creating an offer, send to the user
    offer: function (com, data, listener) {
      var message = {
        type: 'offer',
        sdp: data.offer.sdp,
        prid: data.id,
        mid: com.self.id,
        target: data.userId,
        rid: com.id
      };

      com.socket.send(message);
    },

    // When peer connection starts creating an answer to offer, send to the user
    answer: function (com, data, listener) {
      var message = {
        type: 'answer',
        sdp: data.answer.sdp,
        prid: data.id,
        mid: com.self.id,
        target: data.userId,
        rid: com.id
      };

      com.socket.send(message);
    },

    // When peer connection generates an ice candidate send to user
    icecandidate: function (com, data, listener) {
      // For generated candidate not received candidate
      if (data.sourceType === 'local') {
        var message = {
          type: 'candidate',
          label: data.candidate.sdpMLineIndex,
          id: data.candidate.sdpMid,
          candidate: data.candidate.candidate,
          mid: com.self.id,
          prid: data.id,
          target: data.userId,
          rid: com.id
        };

        com.socket.send(message);
      }
    }

  }

};
var RoomEventResponseHandler = {

  /**
   * Event fired when room is initializing configuration information
   * from API server.
   * @event room:init
   * @for Room
   * @since 0.6.0
   */
  init: function (com, data, listener) {
    if (typeof com.oninit === 'function') {
      com.oninit();
    }
  },

  /**
   * Event fired when room object to ready to use.
   * @event room:ready
   * @for Room
   * @since 0.6.0
   */
  ready: function (com, data, listener) {
    if (typeof com.onready === 'function') {
      com.onready();
    }
  },

  /**
   * Event fired when there is room connection problems.
   * @event room:error
   * @for Room
   * @since 0.6.0
   */
  error: function (com, data, listener) {
    com.respond('room:error', {
      error: data.error,
      state: data.state
    });

    if (typeof com.onerror === 'function') {
      com.onerror(data);
    }
  },

  /**
   * Event fired when room object to ready to use.
   * @event room:join
   * @for Room
   * @since 0.6.0
   */
  join: function (com, data, listener) {
    if (typeof com.onjoin === 'function') {
      com.onjoin(com.self);
    }
  },

  /**
   * Event fired when self user is disconnect from the room.
   * @event room:leave
   * @for Room
   * @since 0.6.0
   */
  leave: function (com, data, listener) {
    if (typeof com.onleave === 'function') {
      com.onleave();
    }
  },

  /**
   * Event fired when self user is kicked out from the room.
   * @event room:kick
   * @for Room
   * @since 0.6.0
   */
  kick: function (com, data, listener) {
    if (typeof com.onkick === 'function') {
      com.onkick({
        message: data.info,
        reason: data.reason
      });

      com.leave();
    }
  },

  /**
   * Event fired when self user is warned regarding an action.
   * @event room:warn
   * @for Room
   * @since 0.6.0
   */
  warn: function (com, data, listener) {
    if (typeof com.onwarn === 'function') {
      com.onwarn({
        message: data.info,
        reason: data.reason
      });
    }
  }
};
var RoomHandler = function (com, event, data, listener) {
  var params = event.split(':');

  // Messaging events
  if (event.indexOf('message:') === 0) {
    
    fn.applyHandler(RoomEventMessageHandler, params, [com, data, listener]);
  
    log.debug('Room', 'Received message event =>', event, data);
  
  } else {
    // Class events
    if (event.indexOf('room:') === 0) {
      data.name = com.name;

      fn.applyHandler(RoomEventResponseHandler, params, [com, data, listener]);
      
      log.debug('Room', 'Responding with event =>', event, data);

    } else {
      data.roomName = com.name;

      fn.applyHandler(RoomEventReceivedHandler, params, [com, data, listener]);
    
      log.debug('Room', 'Received sub-class event =>', event, data);
    }
  
    listener(event, data);
  }
};
function Self (config, listener) {
  // Reference of instance
  var com = this;

  /**
   * The self user id.
   * @attribute id
   * @type String
   * @private
   * @required
   * @for Self
   * @since 0.6.0
   */
  com.id = null;

  /**
   * The self user data.
   * @attribute data
   * @type String | JSON
   * @private
   * @for Self
   * @since 0.6.0
   */
  com.data = config.data;

  /**
   * The self user username.
   * @attribute username
   * @type String
   * @private
   * @required
   * @for Self
   * @since 0.6.0
   */
  com.username = config.username;

  /**
   * The self user timestamp (ISO format).
   * @attribute timeStamp
   * @type String
   * @private
   * @required
   * @for Self
   * @since 0.6.0
   */
  com.timeStamp = config.timeStamp;

  /**
   * The self user credential.
   * @attribute token
   * @type String
   * @private
   * @required
   * @for Self
   * @since 0.6.0
   */
  com.token = config.token;

  /**
   * The self user local stream connection.
   * @attribute streamConnections
   * @param {Stream} (#peerId) The stream to send for this shared peer connection id.
   * @type JSON
   * @private
   * @for Self
   * @since 0.6.0
   */
  com.streamConnections = {};

  /**
   * The self user browser agent information.
   * @attribute agent
   * @param {String} name The user's browser agent name. For other SDKs, it's indicated
   *    by their type of device <code>E.g. ios, android</code>. For components, it's indicated
   *    by their type <code>E.g. MCU, Recording</code>.
   * @param {Integer} version The user's browser agent version. For other SDKs, it's indicated
   *    by their version of device OS <code>ios8 = 8. android kitkat = 4.4</code>. For components, it's indicated
   *    by their version <code>E.g. 0.1.0, 0.2.0</code>.
   * @param {String} webRTCType The user's browser agent webrtc implementation type. For other SDKs or
   *    components, use <code>other</code>.
   * @type JSON
   * @private
   * @for Self
   * @since 0.6.0
   */
  com.agent = {
    name: window.webrtcDetectedBrowser,
    version: window.webrtcDetectedVersion,
    webRTCType: window.webrtcDetectedType
  };

  /**
   * The self user bandwidth configuration. This does fixes
   *   the bandwidth but doesn't prevent alterations done by browser for smoother streaming.
   * @attribute bandwidth
   * @param {Integer} [audio] The audio bandwidth configuration.
   * @param {Integer} [video] The video bandwidth configuration.
   * @param {Integer} [data] The data bandwidth configuration.
   * @type JSON
   * @private
   * @for Self
   * @since 0.6.0
   */
  com.bandwidth = {};

  /**
   * The handler handles received events.
   * @method routeEvent
   * @param {String} event The event name.
   * @param {JSON} data The response data.
   * @private
   * @for Self
   * @since 0.6.0
   */
  com.routeEvent = function (event, data) {
    var params = event.split(':');

    data = data || {};
    data.roomName = com.name;

    fn.applyHandler(SelfEventReceivedHandler, params, [com, data, listener]);

    listener(event, data);

    log.debug('Self: Received event = ', event, data);
  };

  /**
   * The handler handles received socket message events.
   * @method routeMessage
   * @param {String} event The event name.
   * @param {JSON} data The response data.
   * @private
   * @for Self
   * @since 0.6.0
   */
  com.routeMessage = function (message) {
    // Messaging events
    var fn = SelfEventMessageHandler[message.type];

    if (typeof fn === 'function') {
      fn(com, message, listener);
    }

    log.debug('Self: Received message = ', event, message);
  };

  /**
   * The handler handles response events.
   * @method respond
   * @param {String} event The event name.
   * @param {JSON} data The response data.
   * @private
   * @for Self
   * @since 0.6.0
   */
  com.respond = function (event, data) {
    var params = event.split(':');

    data = data || {};
    data.name = com.name;

    fn.applyHandler(SelfEventResponseHandler, params, [com, data, listener]);

    listener(event, data);

    log.debug('Self: Responding with event = ', event, data);
  };

  /**
   * Function to subscribe to when self user object is ready to use.
   * @method onready
   * @eventhandler true
   * @for Self
   * @since 0.6.0
   */
  com.onready = function () {};

  /**
   * Function to subscribe to when self user custom user is connected to room.
   * @method onconnect
   * @eventhandler true
   * @for Self
   * @since 0.6.0
   */
  com.onconnect = function () {};

  /**
   * Function to subscribe to when self user custom user data is updated.
   * @method onupdate
   * @eventhandler true
   * @for Self
   * @since 0.6.0
   */
  com.onupdate = function () {};

  /**
   * Function to subscribe to when self has added a stream connection.
   * @method onaddstreamconnection
   * @eventhandler true
   * @for Self
   * @since 0.6.0
   */
  com.onaddstreamconnection = function () {};

  /**
   * Function to subscribe to when self has stopped a stream connection.
   * @method onremovestreamconnection
   * @eventhandler true
   * @for Self
   * @since 0.6.0
   */
  com.onremovestreamconnection = function () {};

  /**
   * Function to subscribe to when self has been disconnected from the room.
   * @method ondisconnect
   * @eventhandler true
   * @for Self
   * @since 0.6.0
   */
  com.ondisconnect = function () {};


  /**
   * Updates the self user data.
   * @method update
   * @for Self
   * @since 0.6.0
   */
  com.update = function (data) {
    com.data = data;

    com.respond('self:update', {
      userData: com.data
    });
  };

  /**
   * Starts a new stream connection.
   * @method addStreamConnection
   * @param {Stream} stream The stream object.
   * @param {String} peerId The shared peer connection id.
   * @private
   * @for Self
   * @since 0.6.0
   */
  com.addStreamConnection = function (stream, peerId) {
    stream.sourceType = 'local';

    stream.routeEventToParent = com.routeEvent;

    com.streamConnections[peerId] = stream;

    com.respond('self:addstreamconnection', {
      peerId: peerId,
      stream: stream
    });
  };

  /**
   * Finds the shared peer connection id from the stream id provided.
   * @method addStreamConnection
   * @param {Stream} stream The stream object.
   * @param {String} peerId The shared peer connection id.
   * @private
   * @for Self
   * @since 0.6.0
   */
  com.findStreamConnectionId = function (streamId) {
    var key;

    for (key in com.streamConnections) {
      if (com.streamConnections.hasOwnProperty(key)) {
        // If matches
        if (com.streamConnections[key].id === streamId) {
          return key;
        }
      }
    }
  };

  /**
   * Stops a stream connection.
   * @method removeStreamConnection
   * @param {String} [peerId] The shared peer connection id. If no
   *    shared peer connection id is provided, it will destroy all streams.
   *    Providing the <code>"main"</code> peer connection id will also result in
   *    destroying all streams.
   * @private
   * @for Self
   * @since 0.6.0
   */
  com.removeStreamConnection = function (peerId) {
    if (fn.isEmpty(peerId) || peerId === 'main') {
      var key;

      for (key in com.streamConnections) {
        if (com.streamConnections.hasOwnProperty(key)) {
          com.streamConnections[key].stop();
        }
      }

    } else {
      var stream = com.streamConnections[peerId];

      if (typeof stream === 'object' ? stream instanceof Stream : false) {
        stream.stop();

      } else {
        log.error('Unable to remove stream connection as there is not existing ' +
          'stream connection to the peer connection', peerId);
      }
    }
  };

  /**
   * Gets the self user info.
   * @method getInfo
   * @param {String} [peerId] The shared peer connection id.
   *   If no shared peer connection id is provided, it will return as
   *   <code>"stream"</code> instead of <code>"streams".(#peerId)</code>.
   * @returns {JSON} The self user streaming configuration and custom data.
   * - <code>userData</code> <var>: <b>type</b> String | JSON</var><br>
   *   The custom data.
   * - <code>agent</code> <var>: <b>type</b> JSON</var><br>
   *   The user's browser agent information.
   * - <code>agent.name</code> <var>: <b>type</b> String</var><br>
   *   The user's browser agent name.
   * - <code>agent.version</code> <var>: <b>type</b> Integer</var><br>
   *   The user's browser agent version.
   * - <code>agent.webRTCType</code> <var>: <b>type</b> String</var><br>
   *   The user's browser webrtc implementation type.
   * - <code>streams</code> <var>: <b>type</b> JSON</var><br>
   *   The list of peer connections streaming.
   * - <code>streams.(#peerId)</code> <var>: <b>type</b> JSON</var><br>
   *   The peer connection streaming information.
   * - <code>streams.(#peerId).audio</code> <var>: <b>type</b> JSON|Boolean</var><br>
   *   The audio streaming information. If there is no stream connection with the peer,
   *   it's <code>false</code>.
   * - <code>streams.(#peerId).audio.stereo</code> <var>: <b>type</b> Boolean</var><br>
   *   The flag that indicates if stereo is enabled for this connection. By default,
   *   it's <code>false</code>.
   * - <code>streams.(#peerId).audio.sourceId</code> <var>: <b>type</b> String</var><br>
   *   The audio MediaStreamTrack source used for this connection.
   * - <code>streams.(#peerId).video</code> <var>: <b>type</b> JSON|Boolean</var><br>
   *   The video streaming information. If there is no stream connection with the peer,
   *   it's <code>false</code>.
   * - <code>streams.(#peerId).video.resolution</code> <var>: <b>type</b> JSON</var><br>
   *   The video stream resolution.
   * - <code>streams.(#peerId).video.resolution.width</code> <var>: <b>type</b> Integer</var><br>
   *   The video stream resolution height.
   * - <code>streams.(#peerId).video.resolution.height</code> <var>: <b>type</b> Integer</var><br>
   *   The video stream resolution width.
   * - <code>streams.(#peerId).video.frameRate</code> <var>: <b>type</b> Integer</var><br>
   *   The video stream resolution framerate.
   * - <code>streams.(#peerId).video.sourceId</code> <var>: <b>type</b> String</var><br>
   *   The video MediaStreamTrack source used for this connection.
   * - <code>streams.(#peerId).status</code> <var>: <b>type</b> JSON</var><br>
   *   The MediaStreamTracks enabled status (muted/unmuted).
   * - <code>streams.(#peerId).status.audioMuted</code> <var>: <b>type</b> Boolean</var><br>
   *   The audio MediaStreamTrack enabled status (muted/unmuted).
   * - <code>streams.(#peerId).status.audioMuted</code> <var>: <b>type</b> Boolean</var><br>
   *   The video MediaStreamTrack enabled status (muted/unmuted).
   * - <code>bandwidth</code> <var>: <b>type</b> JSON</var><br>
   *   The bandwidth configuration for the peer connections.
   *   This does fixes the bandwidth but doesn't prevent alterations done by browser for smoother streaming.
   * - <code>bandwidth.data</code> <var>: <b>type</b> Integer</var><br>
   *   The bandwidth configuration for data stream.
   * - <code>bandwidth.video</code> <var>: <b>type</b> Integer</var><br>
   *   The bandwidth configuration for video stream.
   * - <code>bandwidth.audio</code> <var>: <b>type</b> Integer</var><br>
   *   The bandwidth configuration for audio stream.
   * @for Self
   * @since 0.6.0
   */
  com.getInfo = function (peerId) {
    var data = {};

    // Pass jshint error
    var getStreamSettingsFn = function (stream) {
      stream = stream || {};

      return stream.config || {
        audio: false,
        video: false,
        status: {
          audioMuted: true,
          videoMuted: true
        }
      };
    };

    data.userData = com.data;
    data.agent = com.agent;
    data.bandwidth = com.bandwidth;

    // Get all stream connections
    if (!fn.isEmpty(peerId)) {
      data.stream = getStreamSettingsFn(com.streamConnections[peerId]);

    // Get that stream connection only
    } else {
      data.streams = {};

      var key;

      for (key in com.streamConnections) {
        if (com.streamConnections.hasOwnProperty(key)) {
          data.streams[key] = getStreamSettingsFn(com.streamConnections[key]);
        }
      }
    }

    return data;
  };

  com.respond('self:ready', config);
}

var SelfEventReceivedHandler = {

  stream: {
    stop: function (com, data, listener) {
      // Trigger the event
      var peerId = com.findStreamConnectionId(data.id);

      com.respond('self:removestreamconnection', {
        streamId: data.id,
        peerId: key
      });
    }
  }
};
var SelfEventResponseHandler = {
  /**
   * Event fired when self object to ready to use.
   *   At this stage, the self user id is empty as user has not joined the room.
   * @event self:ready
   * @for Self
   * @since 0.6.0
   */
  ready: function (com, data, listener) {
    if (typeof com.onready === 'function') {
      com.onready();
    }
  },

  /**
   * Event fired when self has updated data.
   * @event self:update
   * @param {JSON|String} userData The updated self custom data.
   * @for Self
   * @since 0.6.0
   */
  update: function (com, data, listener) {
    if (typeof com.onupdate === 'function') {
      com.onupdate(data);
    }
  },

  /**
   * Event fired when self has added a new stream for connection.
   * @event self:addstreamconnection
   * @for Self
   * @since 0.6.0
   */
  addstreamconnection: function (com, data, listener) {
    if (typeof com.onaddstreamconnection === 'function') {
      com.onaddstreamconnection(data);
    }
  },

  /**
   * Event fired when self has removed a stream connection.
   * @event self:removestreamconnection
   * @for Self
   * @since 0.6.0
   */
  removestreamconnection: function (com, data, listener) {
    delete com.streamConnections[data.peerId];

    if (typeof com.onremovestreamconnection === 'function') {
      com.onremovestreamconnection(data);
    }
  },

  /**
   * Event fired when self user is connected to room.
   * @event self:connect
   * @for Self
   * @since 0.6.0
   */
  connect: function (com, data, listener) {
    if (typeof com.onconnect === 'function') {
      com.onconnect();
    }
  },

  /**
   * Event fired when self user is disconnected from room.
   * @event self:disconnect
   * @for Self
   * @since 0.6.0
   */
  disconnect: function (com, data, listener) {
    if (typeof com.ondisconnect === 'function') {
      com.ondisconnect(data);
    }
  }
};
var SelfHandler = function (com, event, data, listener) {
  var params = event.split(':');
  data = data || {};

  // Messaging events
  if (event.indexOf('message:') === 0) {

    fn.applyHandler(SelfEventMessageHandler, params, [com, data, listener]);

  } else {
    // Class events
    if (event.indexOf('self:') === 0) {
      data.id = com.id;

      fn.applyHandler(SelfEventResponseHandler, params, [com, data, listener]);

    } else {
      data.selfId = com.selfId;

      fn.applyHandler(SelfEventReceivedHandler, params, [com, data, listener]);
    }

    listener(event, data);
  }
};

function Socket(config, listener) {
  'use strict';

  // Prevent undefined listener error
  listener = listener || function (event, data) {};

  // Reference of instance
  var com = this;

  /**
   * The signalling server.
   * @attribute server
   * @type String
   * @private
   * @for Socket
   * @since 0.6.0
   */
  com.server = config.server;

  /**
   * The signalling server protocol to connect with.
   * @attribute protocol
   * @type String
   * @private
   * @for Socket
   * @since 0.6.0
   */
  com.protocol = globals.enforceSSL ? 'https:' : window.location.protocol;

  /**
   * The signalling server port that is connecting with.
   * @attribute server
   * @type Integer
   * @private
   * @for Socket
   * @since 0.6.0
   */
  com.port = null;

  /**
   * The timeout the Socket should wait for before throwing an error.
   * @attribute timeout
   * @type Integer
   * @private
   * @for Socket
   * @since 0.6.0
   */
  com.timeout = globals.socketTimeout || 0;

  /**
   * The interval to wait before sending the next message.
   * @attribute messageInterval
   * @type Integer
   * @private
   * @for Socket
   * @since 0.6.0
   */
  com.messageInterval = 1000;

   /**
   * The queue of messages (throttle) before sending the next
   * @attribute messageQueue
   * @type Array
   * @private
   * @for Socket
   * @since 0.6.0
   */
  com.messageQueue = [];

  /**
   * The list of available signalling server ports.
   * @attribute ports
   * @param {Array} http: The list of HTTP ports.
   * @param {Integer} http:.(#index) The port number.
   * @param {Array} https: The list of HTTPS ports.
   * @param {Integer} https:.(#index) The port number.
   * @type JSON
   * @private
   * @for Socket
   * @since 0.6.0
   */
  com.ports = {
    'https:': config.httpsPortList,
    'http:': config.httpPortList
  };

  /**
   * The socket configuration passed into the <code>io.socket</code>.
   * @attribute config
   * @param {Boolean} forceNew The flag to indicate if socket.io should
   *   force a new connection everytime.
   * @param {Boolean} [reconnection=false] The flag to indicate if socket.io
   *   should reconnect if connection attempt fails. Reconnection is set to
   *   <code>true</code> only when it's reconnecting the last port of the fallback
   *   XHRPolling connection.
   * @param {Array} transports The transports that are used for the socket.io connection.
   * - <code>['websocket']</code> is used for WebSocket connection.
   * - <code>['xhr-polling', 'jsonp-polling', 'polling']</code> is used for XHRPoling connection.
   * @param {Integer} [timeout] The socket.io timeout to wait for an established connection before
   *   throwing an exception.
   * @type JSON
   * @private
   * @for Socket
   * @since 0.6.0
   */
  com.config = {};

  /**
   * The type of socket connection. There are two types:
   * - <code>"WebSocket"</code> indicates a WebSocket connection.
   * - <code>"XHRPolling"</code> indicates a LongPolling connection.
   * @attribute type
   * @type String
   * @default "WebSocket"
   * @private
   * @for Socket
   * @since 0.6.0
   */
  com.type = config.type || 'WebSocket';

  /**
   * The socket.io object.
   * @attribute Socket
   * @type Object
   * @private
   * @for Socket
   * @since 0.6.0
   */
  com.Socket = null;


  /**
   * Function to subscribe to when socket object is ready to use.
   * @method onready
   * @eventhandler true
   * @for Socket
   * @since 0.6.0
   */
  com.onready = function () {};

  /**
   * Function to subscribe to when socket has been connected.
   * @method onconnect
   * @eventhandler true
   * @for Socket
   * @since 0.6.0
   */
  com.onconnect = function () {};

  /**
   * Function to subscribe to when socket has been disconnected.
   * @method ondisconnect
   * @eventhandler true
   * @for Socket
   * @since 0.6.0
   */
  com.ondisconnect = function () {};

  /**
   * Function to subscribe to when socket has connection error.
   * @method onconnecterror
   * @eventhandler true
   * @for Socket
   * @since 0.6.0
   */
  com.onconnecterror = function () {};

  /**
   * Function to subscribe to when socket attempts to reconnect.
   * @method onreconnect
   * @eventhandler true
   * @for Socket
   * @since 0.6.0
   */
  com.onreconnect = function () {};

  /**
   * Function to subscribe to when socket has an exception.
   * @method onerror
   * @eventhandler true
   * @for Socket
   * @since 0.6.0
   */
  com.onerror = function () {};


  com._handler = function (event, data) {
    SocketHandler(com, event, data, listener);
  };

  /**
   * Starts the connection to the signalling server.
   * @method connect
   * @private
   * @for Socket
   * @since 0.6.0
   */
  com.connect = function () {
    com.port = com.ports[window.location.protocol][0];

    if (com.type === 'XHRPolling') {
      com.Socket = new com.XHRPolling();
    } else {
      com.Socket = new com.WebSocket();
    }
  };

  /**
   * Stops the connection to the signalling server.
   * @method disconnect
   * @private
   * @for Socket
   * @since 0.6.0
   */
  com.disconnect = function () {
    com.Socket.disconnect();
  };

  /**
   * Sends data to the signaling server for relaying.
   * NOTE to Thanh: Please implement the throttle for messaging here.
   * @method send
   * @param {JSON} data The data to send.
   * @private
   * @for Socket
   * @since 0.6.0
   */
  com.send = function (data) {
    /*var interval = com.messageInterval;

    if (data.type === 'enter') {
      interval = 0;
    }
    setTimeout(function () {*/
      com.Socket.send(JSON.stringify(data));
      com.respond('socket:message', {
        message: data,
        sourceType: 'local'
      });
    //}, interval);
  };

  /**
   * Handles the event when socket is connected to signaling.
   * @method bindOnConnect
   * @private
   * @for Socket
   * @since 0.6.0
   */
  com.bindOnConnect = function () {
    com.respond('socket:connect');

    com.Socket.removeAllListeners();

    com.Socket.on('disconnect', function () {
      com.respond('socket:disconnect');

      if (typeof com.onerror === 'function') {
        com.ondisconnect();
      }
    });

    com.Socket.on('message', function (result) {
      var data = JSON.parse(result);

      // Check if bulk message
      if (data.type === 'group') {
        log.info('Received a group message. Breaking down messages into individual messages', data);

        var i;

        for (i = 0; i < data.list.length; i++) {
          var message = data.list[i];
          com.respond('socket:message', {
            message: message,
            sourceType: 'remote'
          });
        }

      } else {
        com.respond('socket:message', {
          message: data,
          sourceType: 'remote'
        });
      }
    });

    com.Socket.on('error', function (error) {
      com.respond('socket:error', {
        error: error
      });

      if (typeof com.onerror === 'function') {
        com.onerror(error);
      }
    });

    if (typeof com.onconnect === 'function') {
      com.onconnect();
    }
  };

  /**
   * Handles the event when socket have a connection error.
   * @method bindOnConnectError
   * @param {Object} error The socket.io connection error.
   * @private
   * @for Socket
   * @since 0.6.0
   */
  com.bindOnConnectError = function (error) {
    com.respond('socket:connecterror', {
      error: error
    });

    var ports = com.ports[window.location.protocol];
    var i;

    for (i = 0; i < ports.length; i += 1) {
      // Get current port
      if (ports[i] === com.port) {
        // Check if reach the end
        if ((i + 1) < ports.length) {
          // Set if there is still the next port
          com.port = ports[i + 1];
          com.reconnect();

        } else {
          if (com.type === 'WebSocket') {
            com.type = 'XHRLongPolling';
            com.port = ports[0];
            com.reconnect();
          }
        }
        break;
      }
    }

    if (typeof com.onconnecterror === 'function') {
      com.onconnecterror(error);
    }
  };

  /**
   * Restarts the connection to the signaling server when attempt to
   *   establish socket connection failed.
   * @method reconnect
   * @private
   * @for Socket
   * @since 0.6.0
   */
  com.reconnect = function () {
    com.Socket.removeAllListeners();

    switch (com.type) {
    case 'WebSocket':
      com.Socket = com.WebSocket();
      break;
    //case 'XHRPolling':
    default:
      com.Socket = com.XHRPolling();
    }

    com.respond('socket:reconnect');
  };

  /**
   * Creates a WebSocket connection in socket.io.
   * @method WebSocket
   * @private
   * @for Socket
   * @since 0.6.0
   */
  com.WebSocket = function () {
    var options = {
      forceNew: true,
      reconnection: false,
      transports: ['websocket']
    };

    if (com.timeout !== 0) {
      options.timeout = com.timeout;
    }

    var server = com.protocol + '//' + com.server + ':' + com.port;

    var socket = io.connect(server, options);

    com.config = options;

    socket.on('connect', com.bindOnConnect);
    socket.on('connect_error', com.bindOnConnectError);

    return socket;
  };

  /**
   * Creates a XHR Long-polling connection in socket.io.
   * @method XHRPolling
   * @private
   * @for Socket
   * @since 0.6.0
   */
  com.XHRPolling = function () {
    var ports = com.ports[window.location.protocol];

    var options = {
      forceNew: true,
      reconnection: com.port === ports[ports.length - 1],
      transports: ['xhr-polling', 'jsonp-polling', 'polling']
    };

    if (com.timeout !== 0) {
      options.timeout = com.timeout;
    }

    var server = com.protocol + '//' + com.server + ':' + com.port;

    var socket = io.connect(server, options);

    com.config = options;

    socket.on('connect', com.bindOnConnect);
    socket.on('reconnect', com.bindOnConnect);
    socket.on('connect_error', com.bindOnConnectError);
    socket.on('reconnect_failed', com.bindOnConnectError);

    return socket;
  };

  // Throw an error if socket.io is not loaded
  if (!window.io) {
    throw new Error('Required dependency socket.io not found');
  }

  fn.runSync(function () {
    com.respond('socket:ready', config);
  });
}

var SocketEventResponseHandler = {

  /**
   * Event fired when the socket object is ready to use.
   * @event socket:ready
   * @for Socket
   * @since 0.6.0
   */
  ready: function (com, data, listener) {
    if (typeof com.onstart === 'function') {
      com.onstart(data);
    }
  },

  /**
   * Event fired when socket occurs an exception during connection.
   * @event socket:error
   * @param {Object} error The getUserMedia or event error.
   * @for Socket
   * @since 0.6.0
   */
  error: function (com, data, listener) {
    if (typeof com.onerror === 'function') {
      com.onerror(data);
    }
  },

  /**
   * Event fired when socket connection has been established to the signaling server.
   * @event socket:connect
   * @param {Object} error The getUserMedia or event error.
   * @for Socket
   * @since 0.6.0
   */
  connect: function (com, data, listener) {
    if (typeof com.onconnect === 'function') {
      com.onconnect(data);
    }
  },

  /**
   * Event fired when socket connection fails to connect to the signaling server.
   * @event socket:connecterror
   * @param {Object} error The getUserMedia or event error.
   * @for Socket
   * @since 0.6.0
   */
  connecterror: function (com, data, listener) {
    if (typeof com.onconnecterror === 'function') {
      com.onconnecterror(data);
    }
  },

  /**
   * Event fired when socket attempts to reconnect with signaling server when attempt
   *  to establish connection fails.
   * @event socket:reconnect
   * @for Socket
   * @since 0.6.0
   */
  reconnect: function (com, data, listener) {
    if (typeof com.onreconnect === 'function') {
      com.onreconnect(data);
    }
  },

  /**
   * Event fired when socket sends a message to the signaling server.
   * @event socket:message
   * @param {String} event The message event type.
   * @param {JSON} data The data received from server.
   * @param {String} sourceType The source type of the message received.
   * @for Socket
   * @since 0.6.0
   */
  message: function (com, data, listener) {},

  /**
   * Event fired when socket connection with signaling server has been disconnected.
   * @event socket:disconnect
   * @for Socket
   * @since 0.6.0
   */
  disconnect: function (com, data, listener) {
    if (typeof com.ondisconnect === 'function') {
      com.ondisconnect(data);
    }
  }
};

var StreamHandler = function (com, event, data, listener) {
  var params = event.split(':');

  // Class events
  data.server = com.server;
  data.port = com.port;
  data.type = com.type;
  data.protocol = com.protocol;

  fn.applyHandler(StreamEventResponseHandler, params, [com, data, listener]);

  listener(event, data);

  log.debug('Stream', 'Responding with event =>', event, data);
};
function Stream(stream, config, listener) {
  'use strict';

  // Prevent undefined listener error
  listener = listener || function (event, data) {};

  // Reference of instance
  var com = this;

  /* Attributes */
  /**
   * The stream id.
   * @attribute id
   * @type String
   * @for Stream
   * @since 0.6.0
   */
  com.id = null;

  /**
   * The stream label.
   * @attribute label
   * @type String
   * @for Stream
   * @since 0.6.0
   */
  com.label = '';

  /**
   * The getUserMedia constraints.
   * @attribute _constraints
   * @type JSON
   * @private
   * @for Stream
   * @since 0.6.0
   */
  com._constraints = null;

  /**
   * The streaming configuration.
   * @attribute config
   * @type JSON
   * @for Stream
   * @since 0.6.0
   */
  com.config = config;

  /**
   * The stream source origin.
   * There are two types of sources:
   * - <code>"local"</code> indicates that the stream came from self user.
   * - <code>"remote</code> indicates that the stream came from other users.
   * @attribute sourceType
   * @type String
   * @for Stream
   * @since 0.6.0
   */
  com.sourceType = 'local';

  /**
   * The MediaStream object.
   * @attribute MediaStream
   * @type Object
   * @private
   * @for Stream
   * @since 0.6.0
   */
  com._MediaStream = null;


  /* Methods */
  /**
   * The handler that the parent classes utilises to listen to events.
   * @method _parentHandler
   * @param {String} event The event name.
   * @param {JSON} data The response data.
   * @private
   * @for Stream
   * @since 0.6.0
   */
  com._parentHandler = function () {};

  /**
   * The handler that the manages response and received events.
   * @method _handler
   * @param {String} event The event name.
   * @param {JSON} data The response data.
   * @private
   * @for Stream
   * @since 0.6.0
   */
  com._handler = function (event, data) {
    StreamHandler(com, event, data, listener);

    if (typeof com._parentHandler === 'function') {
      com._parentHandler(event, data);
    }
  };

  /**
   * Binds events to MediaStream object.
   * @method _bind
   * @param {Object} bind The MediaStream object to bind events to.
   * @private
   * @for Stream
   * @since 0.6.0
   */
  com._bind = function (bind) {

    com.id = fn.generateUID();

    // Bind events to MediaStream
    // Un-implemented events functions
    // bindStream.onaddtrack = function () { };
    // bindStream.onremovetrack = function () { };

    // For firefox browsers
    StreamPolyfill.checkEnded(bind);

    bind.onended = function (event) {
      com._handler('stream:stop', {});
    };

    com.label = bind.label || 'Stream ' + com.id;

    // Bind track events
    com._bindTracks(bind.getAudioTracks(), bind);
    com._bindTracks(bind.getVideoTracks(), bind);

    com._MediaStream = bind;

    com._handler('stream:start', {});
  };

  /**
   * Binds track events to all MediaStreamTrack objects of the MediaStream object.
   * @method _bindTracks
   * @param {Array} bindTracks The list of MediaStreamTrack objects.
   * @param {Object} bindTracks.(#index) The MediaStreamTrack object to bind events to.
   * @param {Object} bind The MediaStream object to bind events to.
   * @private
   * @for Stream
   * @since 0.6.0
   */
  com._bindTracks = function (bindTracks, bind) {
    var i;

    // Passing jshint (Don't make functions within a loop)
    var onended = function (track) {
      return function () {
        com._handler('stream:track:stop', {
          track: track
        });
      };
    };

    var onmute = function (track) {
      return function () {
        com._handler('stream:track:mute', {
          track: track
        });
      };
    };

    var onunmute = function (track) {
      return function () {
        com._handler('stream:track:unmute', {
          track: track
        });
      };
    };

    for (i = 0; i < bindTracks.length; i += 1) {
      var track = bindTracks[i];

      var trackData = {
        id: track.id || fn.generateUID(),
        kind: track.kind,
        label: track.label,
        facing: track.facing
      };

      // Bind events to MediaStreamTrack
      // Un-implemented events functions
      // track.onstarted = function () { };
      // track.onoverconstrained = function(event) {};

      // Bind events first
      track.onended = onended(trackData);
      track.onmute = onmute(trackData);
      track.onunmute = onunmute(trackData);

      // Fallback for Safari / IE browsers. Events must be BINDED first.
      StreamPolyfill.track.checkEnded(track, bind);
      StreamPolyfill.track.checkMute(track, bind);
      StreamPolyfill.track.checkUnmute(track, bind);

      // Set the mute status
      var isEnabled = true;

      if (track.kind === 'audio') {
        isEnabled = (typeof com.config.audio === 'object') ?
          !!!com.config.status.audioMuted : !!com.config.audio;
      } else {
        isEnabled = (typeof com.config.video === 'object') ?
          !!!com.config.status.videoMuted : !!com.config.video;
      }

      track.enabled = isEnabled;

      window.track = track;

      com._handler('stream:track:start', {
        track: track
      });
    }
  };

  /**
   * Attaches the MediaStream object to a video element.
   * @method attachElement
   * @param {DOM} element The video DOM element to bind the MediaStream to.
   * @for Stream
   * @since 0.6.0
   */
  com.attachElement = function (element) {
    StreamPolyfill.attachMediaStream(element, com._MediaStream);
  };

  /**
   * Stops MediaStream object streaming.
   * This is only available for LocalMediaStreams.
   * @method stop
   * @for Stream
   * @since 0.6.0
   */
  com.stop = function () {
    // Stop MediaStream
    StreamPolyfill.stop(com._MediaStream);
  };

  /**
   * Stops all audio MediaStreamTracks streaming in the MediaStream object.
   * This is only available for LocalMediaStreams.
   * @method stopAudio
   * @support Firefox, Chrome, Opera
   * @for Stream
   * @since 0.6.0
   */
  com.stopAudio = function () {
    var tracks = com._MediaStream.getAudioTracks();
    var i;

    for (i = 0; i < tracks.length; i += 1) {
      var track = tracks[i];
      StreamPolyfill.track.stop(track);
    }
  };

  /**
   * Stops all video MediaStreamTracks streaming of the MediaStream object.
   * This is only available for LocalMediaStreams.
   * @method stopVideo
   * @support Firefox, Chrome, Opera
   * @for Stream
   * @since 0.6.0
   */
  com.stopVideo = function () {
    var tracks = com._MediaStream.getVideoTracks();
    var i;

    for (i = 0; i < tracks.length; i += 1) {
      var track = tracks[i];
      StreamPolyfill.track.stop(track);
    }
  };

  /**
   * Mutes all audio MediaStreamTracks of the MediaStream object.
   * This is only available for LocalMediaStreams.
   * @method muteAudio
   * @for Stream
   * @since 0.6.0
   */
  com.muteAudio = function () {
    var tracks = com._MediaStream.getAudioTracks();
    var i;

    for (i = 0; i < tracks.length; i += 1) {
      var track = tracks[i];
      StreamPolyfill.track.mute(track, com._MediaStream.id);
    }
  };

  /**
   * Mutes all video MediaStreamTracks of the MediaStream object.
   * This is only available for LocalMediaStreams.
   * @method muteVideo
   * @for Stream
   * @since 0.6.0
   */
  com.muteVideo = function () {
    var tracks = com._MediaStream.getVideoTracks();
    var i;

    for (i = 0; i < tracks.length; i += 1) {
      var track = tracks[i];
      StreamPolyfill.track.mute(track, com._MediaStream.id);
    }
  };


  /**
   * Unmutes all audio MediaStreamTracks of the MediaStream object.
   * This is only available for LocalMediaStreams.
   * @method unmuteAudio
   * @for Stream
   * @since 0.6.0
   */
  com.unmuteAudio = function () {
    var tracks = com._MediaStream.getAudioTracks();
    var i;

    for (i = 0; i < tracks.length; i += 1) {
      var track = tracks[i];
      StreamPolyfill.track.unmute(track, com._MediaStream.id);
    }
  };

  /**
   * Unmutes all video MediaStreamTracks of the MediaStream object.
   * This is only available for LocalMediaStreams.
   * @method unmuteVideo
   * @for Stream
   * @since 0.6.0
   */
  com.unmuteVideo = function () {
    var tracks = com._MediaStream.getVideoTracks();
    var i;

    for (i = 0; i < tracks.length; i += 1) {
      var track = tracks[i];
      StreamPolyfill.track.unmute(track, com._MediaStream.id);
    }
  };


  /* Event Handlers */
  /**
   * Function to subscribe to when stream object is ready to use.
   * @method onstart
   * @eventhandler true
   * @for Stream
   * @since 0.6.0
   */
  com.onstart = function () {};

  /**
   * Function to subscribe to when getUserMedia throws an exception or event has error.
   * @method onerror
   * @eventhandler true
   * @for Stream
   * @since 0.6.0
   */
  com.onerror = function () {};

  /**
   * Function to subscribe to when MediaStreamTrack of the MediaStream object has started.
   * @method ontrackstart
   * @eventhandler true
   * @for Stream
   * @since 0.6.0
   */
  com.ontrackstart = function () {};

  /**
   * Function to subscribe to when MediaStreamTrack of the MediaStream object has stopped.
   * @method ontrackstop
   * @eventhandler true
   * @for Stream
   * @since 0.6.0
   */
  com.ontrackstop = function () {};

  /**
   * Function to subscribe to when MediaStreamTrack of the MediaStream object has been disabled (muted).
   * @method ontrackmute
   * @eventhandler true
   * @for Stream
   * @since 0.6.0
   */
  com.ontrackmute = function () {};

  /**
   * Function to subscribe to when MediaStreamTrack of the MediaStream object has been enabled (unmuted).
   * @method ontrackunmute
   * @eventhandler true
   * @for Stream
   * @since 0.6.0
   */
  com.ontrackunmute = function () {};

  /**
   * Function to subscribe to when MediaStream object has ended.
   * @method onstop
   * @eventhandler true
   * @for Stream
   * @since 0.6.0
   */
  com.onstop = function () {};


  /* Beginning Logic */
  // Throw an error if adapterjs is not loaded
  if (!window.attachMediaStream) {
    throw new Error('Required dependency adapterjs not found');
  }

  // Bind or start MediaStream
  if (fn.isEmpty(stream)) {
    var audioSettings = StreamParser.parseAudioConfig(config.audio);
    var videoSettings = StreamParser.parseVideoConfig(config.video);
    var statusSettings = StreamParser.parseMutedConfig(config);

    com._constraints = {
      audio: audioSettings.userMedia,
      video: videoSettings.userMedia
    };

    com.config = {
      audio: audioSettings.settings,
      video: audioSettings.settings,
      status: statusSettings
    };

    // Get user media
    window.getUserMedia(com._constraints, com._bind, function (error) {
      com._handler('stream:error', {
        error: error,
        sourceType: com.sourceType
      });
    });

  } else {
    // Allow javascript to return object before code execution
    fn.runSync(function () {
      com.config = {
        audio: fn.isSafe(function () {
          return stream.getAudioTracks().length > 0;
        }),
        video: fn.isSafe(function () {
          return stream.getVideoTracks().length > 0;
        })
      };
      com._bind(stream);
    });
  }
}
var StreamEventResponseHandler = {

  /* Stream events */
  /**
   * Event fired when the MediaStream has started and that the stream object is ready to use.
   * @event stream:start
   * @for Stream
   * @since 0.6.0
   */
  start: function (com, data, listener) {
    if (typeof com.onstart === 'function') {
      com.onstart(data.MediaStream);
    }
  },

  /**
   * Event fired when usually getUserMedia fails or an exception has occurred during the
   *   MediaStream object handling.
   * @event stream:error
   * @param {Object} error The getUserMedia or event error.
   * @for Stream
   * @since 0.6.0
   */
  error: function (com, data, listener) {
    if (typeof com.onerror === 'function') {
      com.onerror(data);
    }
  },

  /**
   * Event fired when the MediaStream object has stopped.
   * @event stream:stop
   * @for Stream
   * @since 0.6.0
   */
  stop: function (com, data, listener) {
    if (typeof com.onstop === 'function') {
      com.onstop(data);
    }
  },

  /* StreamTrack events */
  track: {

    /**
     * Event fired when the MediaStreamTrack of the MediaStream object has started and
     *   that the track is ready to use.
     * @event stream:track:start
     * @for Stream
     * @since 0.6.0
     */
    start: function (com, data, listener) {
      if (typeof com.ontrackstart === 'function') {
        com.ontrackstart(data);
      }
    },

    /**
     * Event fired when the MediaStreamTrack of the MediaStream object has stopped.
     * @event stream:track:stop
     * @for Stream
     * @since 0.6.0
     */
    stop: function (com, data, listener) {
      if (typeof com.ontrackstop === 'function') {
        com.ontrackstop(data);
      }
    },

    /**
     * Event fired when the MediaStreamTrack of the MediaStream object has been disabled (muted).
     * @event stream:track:mute
     * @for Stream
     * @since 0.6.0
     */
    mute: function (com, data, listener) {
      if (typeof com.ontrackmute === 'function') {
        com.ontrackmute(data);
      }
    },

    /**
     * Event fired when the MediaStreamTrack of the MediaStream object has been enabled (unmuted).
     * @event stream:track:unmute
     * @for Stream
     * @since 0.6.0
     */
    unmute: function (com, data, listener) {
      if (typeof com.ontrackunmute === 'function') {
        com.ontrackunmute(data);
      }
    },
  }

};
var StreamHandler = function (com, event, data, listener) {
  var params = event.split(':');

  // Class events
  data.id = com.id;
  data.label = com.label;

  fn.applyHandler(StreamEventResponseHandler, params, [com, data, listener]);

  listener(event, data);

  log.debug('Stream', 'Responding with event', event, data);
};
var StreamParser = {
  /**
   * Stores the default stream and bandwidth settings.
   * @attribute StreamParser.defaultConfig
   * @type JSON
   * @param {JSON} audio The default audio streaming configuraiton.
   * @param {Boolean} audio.stereo The default flag to indicate if stereo is enabled.
   * @param {JSON} video The default video streaming configuraiton.
   * @param {JSON} video.resolution The default video resolution.
   * @param {Integer} video.resolution.width The default video resolution width.
   * @param {Integer} video.resolution.height The default video resolution height.
   * @param {Integer} video.frameRate The default video maximum framerate.
   * @param {JSON} bandwidth The default bandwidth streaming settings.
   * @param {Integer} bandwidth.audio The default audio bandwidth bitrate.
   * @param {Integer} bandwidth.video The default video bandwidth bitrate.
   * @param {Integer} bandwidth.data The default DataChannel data bandwidth bitrate.
   * @private
   * @since 0.6.0
   */
  defaultConfig: {
    audio: {
      stereo: false
    },
    video: {
      resolution: {
        width: 640,
        height: 480
      },
      frameRate: 50
    },
    bandwidth: {
      audio: 50,
      video: 256,
      data: 1638400
    }
  },

  /**
   * Parses the audio configuration for the stream configuration and getUserMedia constraints.
   * @method StreamParser.parseAudioConfig
   * @param {JSON|Boolean} options The audio settings or flag if audio is enabled.
   * @param {Boolean} options.stereo The flag to indicate if stereo is enabled.
   * @param {String} options.sourceId The source id of the audio MediaStreamTrack.
   * @return {JSON} Returns the output parsed audio configuration.
   * - <code>settings</code> <var>: <b>type</b> JSON|Boolean</var><br>
   *   The audio stream configuration.
   * - <code>settings.stereo</code> <var>: <b>type</b> Boolean</var><br>
   *   The flag that indicates if stereo is enabled for this streaming.
   * - <code>settings.sourceId</code> <var>: <b>type</b> JSON</var><br>
   *   The audio stream source id.
   * - <code>userMedia</code> <var>: <b>type</b> Boolean|JSON</var><br>
   *   The audio stream getUserMedia constraints.
   * - <code>userMedia.optional</code> <var>: <b>type</b> Array</var><br>
   *   The audio stream optional configuration.
   * - <code>settings.optional.(#index)</code> <var>: <b>type</b> JSON</var><br>
   *   The audio stream optional configuration item.
   * - <code>settings.optional.(#index).sourceId</code> <var>: <b>type</b> String</var><br>
   *   The audio stream source id.
   * @private
   * @since 0.6.0
   */
  parseAudioConfig: function (options) {
    options = (typeof options === 'object') ? options : !!options;

    var userMedia = false;
    var tempOptions = {};

    // Cleaning of unwanted keys
    if (options !== false) {
      options = (typeof options === 'boolean') ? {} : options;
      tempOptions.stereo = !!options.stereo;
      tempOptions.sourceId = options.sourceId;

      options = tempOptions;
    }

    userMedia = (typeof options === 'object') ?
      true : options;

    // Add video sourceId
    if (tempOptions.sourceId && tempOptions.audio !== false) {
      userMedia = { optional: [{ sourceId: tempOptions.sourceId }] };
    }

    return {
      settings: options,
      userMedia: userMedia
    };
  },

  /**
   * Parses the video configuration for the stream configuration and getUserMedia constraints.
   * @method StreamParser.parseVideoConfig
   * @param {JSON|Boolean} options The video settings.
   * @param {JSON} options.resolution The video resolution.
   * @param {Integer} options.resolution.width The video resolution width.
   * @param {Integer} options.resolution.height The video resolution height.
   * @param {Integer} options.frameRate The video maximum framerate.
   * @param {String} options.sourceId The source id of the video MediaStreamTrack.
   * @return {JSON} Returns the output parsed video configuration.
   * - <code>settings</code> <var>: <b>type</b> JSON|Boolean</var><br>
   *   The video stream configuration.
   * - <code>settings.resolution</code> <var>: <b>type</b> Boolean</var><br>
   *   The video stream resolution.
   * - <code>settings.resolution.width</code> <var>: <b>type</b> Integer</var><br>
   *   The video stream resolution width.
   * - <code>settings.resolution.height</code> <var>: <b>type</b> Integer</var><br>
   *   The video stream resolution height.
   * - <code>settings.resolution.frameRate</code> <var>: <b>type</b> Integer</var><br>
   *   The video stream resolution maximum framerate.
   * - <code>settings.sourceId</code> <var>: <b>type</b> JSON</var><br>
   *   The video stream source id.
   * - <code>userMedia</code> <var>: <b>type</b> Boolean|JSON</var><br>
   *   The video stream getUserMedia constraints.
   * - <code>userMedia.mandatory</code> <var>: <b>type</b> JSON</var><br>
   *   The video stream mandatory configuration.
   * - <code>userMedia.mandatory.maxWidth</code> <var>: <b>type</b> Integer</var><br>
   *   The video stream maximum width resolution.
   * - <code>userMedia.mandatory.maxHeight</code> <var>: <b>type</b> Integer</var><br>
   *   The video stream maximum height resolution.
   * - <code>userMedia.mandatory.maxFrameRate</code> <var>: <b>type</b> Array</var><br>
   *   The video stream maximum framerate. Not supported in current Plugin browsers.
   * - <code>userMedia.optional</code> <var>: <b>type</b> Array</var><br>
   *   The video stream optional configuration.
   * - <code>settings.optional.(#index)</code> <var>: <b>type</b> JSON</var><br>
   *   The video stream optional configuration item.
   * - <code>settings.optional.(#index).sourceId</code> <var>: <b>type</b> String</var><br>
   *   The video stream source id.
   * @private
   * @since 0.6.0
   */
  parseVideoConfig: function (options) {
    options = (typeof options === 'object') ?
    options : !!options;

    var userMedia = false;
    var tempOptions = {};

    // Cleaning of unwanted keys
    if (options !== false) {
      options = (typeof options === 'boolean') ?
        { resolution: {} } : options;

      // set the resolution parsing
      options.resolution = options.resolution || {};

      tempOptions.resolution = tempOptions.resolution || {};

      // set resolution
      tempOptions.resolution.width = options.resolution.width ||
        this.defaultConfig.video.resolution.width;

      tempOptions.resolution.height = options.resolution.height ||
        this.defaultConfig.video.resolution.height;

      // set the framerate
      tempOptions.frameRate = options.frameRate ||
        this.defaultConfig.video.frameRate;

      // set the sourceid
      tempOptions.sourceId = options.sourceId;

      options = tempOptions;

      userMedia = {
        mandatory: {
          //minWidth: tempOptions.resolution.width,
          //minHeight: tempOptions.resolution.height,
          maxWidth: tempOptions.resolution.width,
          maxHeight: tempOptions.resolution.height,
          //minFrameRate: tempOptions.frameRate,
          maxFrameRate: tempOptions.frameRate
        },
        optional: []
      };

      // Add video sourceId
      if (tempOptions.sourceId) {
        userMedia.optional[0] = { sourceId: tempOptions.sourceId };
      }

      //Remove maxFrameRate for AdapterJS to work with Safari
      if (window.webrtcDetectedType === 'plugin') {
        delete userMedia.mandatory.maxFrameRate;
      }
    }

    return {
      settings: options,
      userMedia: userMedia
    };
  },

  /**
   * Parses the bandwidth configuration.
   * In low-bandwidth environment, it's mostly managed by the browser.
   * However, this option enables you to set low bandwidth for high-bandwidth
   *   environment whichever way is possible.
   * @property StreamParser.parseBandwidthConfig
   * @param {JSON} options The bandwidth streaming settings.
   * @param {Integer} options.audio The audio bandwidth bitrate.
   * @param {Integer} options.video The video bandwidth bitrate.
   * @param {Integer} options.data The DataChannel data bandwidth bitrate.
   * @return {JSON} Returns the output parsed bandwidth configuration.
   * - <code>video</code> <var>: <b>type</b> Integer</var><br>
   *   The video bandwidth configuration (bitrate).
   * - <code>audio</code> <var>: <b>type</b> Integer</var><br>
   *   The audio bandwidth configuration (bitrate).
   * - <code>data</code> <var>: <b>type</b> Integer</var><br>
   *   The data bandwidth configuration (bitrate).
   * @private
   * @since 0.6.0
   */
  parseBandwidthConfig: function (options) {
    options = (typeof options === 'object') ? options : {};

    // set audio bandwidth
    options.audio = (typeof options.audio === 'number') ?
      options.audio : this.defaultConfig.bandwidth.audio;

    // set video bandwidth
    options.video = (typeof options.video === 'number') ?
      options.video : this.defaultConfig.bandwidth.video;

    // set data bandwidth
    options.data = (typeof options.data === 'number') ?
      options.data : this.defaultConfig.bandwidth.data;

    // set the settings
    return options;
  },

  /**
   * Parses the stream muted configuration.
   * @method StreamParser.parseMutedConfig
   * @param {JSON} options The stream muted settings.
   * @param {JSON} config The streaming configuration.
   * @param {JSON|Boolean} [config.audio=false] The audio stream configuration.
   *    If parsed as a boolean, other configuration settings under the audio
   *    configuration would be set as the default setting in the connection.
   * @param {Boolean} [config.audio.mute=false] The flag that indicates if audio stream
   *    should be muted when retrieving.
   * @param {String|Boolean} [config.video=false] The video stream configuration.
   *    If parsed as a boolean, other configuration settings under the video
   *    configuration would be set as the default setting in the connection.
   * @param {Boolean} [config.video.mute=false] The flag that indicates if video stream
   *    should be muted when retrieving.
   * @return {JSON} Returns the output parsed stream status configuration.
   * - <code>videoMuted</code> <var>: <b>type</b> Boolean</var><br>
   *   The video media status if video track is muted (disabled).
   * - <code>audioMuted</code> <var>: <b>type</b> Boolean</var><br>
   *   The audio media status if audio track is muted (disabled).
   * @private
   * @since 0.6.0
   */
  parseMutedConfig: function (options) {
    // the stream options
    options = (typeof options === 'object') ?
      options : { audio: false, video: false };

    var updateAudioMuted = (typeof options.audio === 'object') ?
      !!options.audio.mute : !options.audio;
    var updateVideoMuted = (typeof options.video === 'object') ?
      !!options.video.mute : !options.video;

    return {
      audioMuted: updateAudioMuted,
      videoMuted: updateVideoMuted
    };
  },


  parseDefaultConfig: function (options) {
    var hasMediaChanged = false;

    // prevent undefined error
    options = options || {};

    log.debug('Parsing stream settings. Default stream options:', options);

    options.maxWidth = (typeof options.maxWidth === 'number') ? options.maxWidth :
      640;
    options.maxHeight = (typeof options.maxHeight === 'number') ? options.maxHeight :
      480;

    // parse video resolution. that's for now
    this.defaultConfig.video.resolution.width = options.maxWidth;
    this.defaultConfig.video.resolution.height = options.maxHeight;

    log.debug('Parsed default media stream settings', this.defaultConfig);
  }
};
var StreamPolyfill = {

  /* MediaStream polyfills */
  /**
   * Handles the polyfill stop() function for MediaStream to trigger un-implemented
   *   MediaStream.onended in Firefox.
   * @method StreamPolyfill.stop
   * @param {Object} bind The MediaStream object.
   * @private
   * @for Stream
   * @since 0.6.0
   */
  stop: function (bind) {
    // End MediaStreamTracks as well for non-Webkit browsers
    if (window.webrtcDetectedType !== 'webkit') {
      var audioTracks = bind.getAudioTracks();
      var videoTracks = bind.getVideoTracks();

      var i, j;
      var track = null;
      var fn = function () {};

      for (i = 0; i < audioTracks.length; i += 1) {
        track = audioTracks[i];

        if (window.webrtcDetectedBrowser === 'firefox') {
          this.track.stop(track);

        // Polyfill temporarily for Safari / IE plugin-enabled browsers to trigger onended event
        } else {
          fn = this.track.getFn(track, bind.id, 'onended');
          fn(track);
        }
      }

      for (j = 0; j < videoTracks.length; j += 1) {
        track = videoTracks[j];

        if (window.webrtcDetectedBrowser === 'firefox') {
          this.track.stop(track);

        // Polyfill temporarily for Safari / IE plugin-enabled browsers to trigger onended event
        } else {
          fn = this.track.getFn(track, bind.id, 'onended');
          fn(track);
        }
      }
    }

    // Allow users to use polystop to polyfill stop and onended for MediaStreamTrack
    if (window.webrtcDetectedBrowser === 'firefox' ? bind instanceof LocalMediaStream : true) {
      bind.stop();
    }

    if (window.webrtcDetectedType === 'safari' || window.webrtcDetectedBrowser === 'IE') {
      delete this.track.fns[bind.id];
    }

    if (window.webrtcDetectedBrowser === 'firefox') {
      bind.ended = true;
    }
  },

  /**
   * Handles the un-implemented MediaStream.onended events. Use this to set a checker
   *   for Firefox MediaStreams when ended. It will trigger onended when stream has ended.
   * @method StreamPolyfill.checkEnded
   * @param {Object} bind The MediaStream object.
   * @private
   * @for Stream
   * @since 0.6.0
   */
  checkEnded: function (bind) {
    // Firefox browsers
    if (window.webrtcDetectedBrowser === 'firefox') {

      // Check if tracks have all ended
      bind.checkTracksEnded = setInterval(function () {
        var i, j;

        var audios = bind.getAudioTracks();
        var videos = bind.getVideoTracks();

        var audioEnded = true;
        var videoEnded = true;

        // Check for all tracks if ended
        for (i = 0; i < audios.length; i += 1) {
          if (audios[i].ended !== true) {
            audioEnded = false;
            break;
          }
        }

        for (i = 0; i < videos.length; i += 1) {
          if (videos[i].ended !== true) {
            videoEnded = false;
            break;
          }
        }

        if (audioEnded && videoEnded) {
          clearInterval(bind.checkTracksEnded);
          bind.ended = true;
        }

      }, 1000);

      // LocalMediaStream
      if (bind.constructor === LocalMediaStream) {
        bind.checkEnded = setInterval(function () {
          // If stream has flag ended because of media tracks being stopped
          if (bind.ended) {
            clearInterval(bind.checkEnded);

            // trigger that it has ended
            if (typeof bind.onended === 'function') {
              bind.onended(bind);
            }
          }

          if (typeof bind.recordedTime === 'undefined') {
            bind.recordedTime = 0;
          }

          if (bind.recordedTime === bind.currentTime) {
            clearInterval(bind.checkEnded);

            bind.ended = true;

            // trigger that it has ended
            if (typeof bind.onended === 'function') {
              bind.onended(bind);
            }

          } else {
            bind.recordedTime = bind.currentTime;
          }
        }, 1000);

      // Remote MediaStream
      } else {

        // Use a video to attach to check if stream has ended
        var video = document.createElement('video');

        video.checkEnded = setInterval(function () {
          // If stream has flag ended because of media tracks being stopped
          if (bind.ended) {
            clearInterval(bind.checkEnded);

            // trigger that it has ended
            if (typeof bind.onended === 'function') {
              bind.onended(bind);
            }
          }

          // Check if mozSrcObject is not empty
          if (typeof video.mozSrcObject === 'object' &&
              video.mozSrcObject !== null) {

            if (video.mozSrcObject.ended === true) {
              clearInterval(bind.checkEnded);

              bind.ended = true;

              // trigger that it has ended
              if (typeof bind.onended === 'function') {
                bind.onended(bind);
              }
            }
          }
        }, 1000);

        // Bind the video element to MediaStream object
        bind.checkingVideo = video;

        window.attachMediaStream(video, bind);
      }
    }
  },

  /**
   * Handles the attachMediaStream function due to stop polyfill code
   *   attaching the stream to the video element, hence attachMediaStream
   *   has to be reattachMediaStream.
   * @method StreamPolyfill.attachMediaStream
   * @param {DOM} element The video element object.
   * @param {Object} bind The MediaStream object.
   * @private
   * @for Stream
   * @since 0.6.0
   */
  attachMediaStream: function (element, bind) {
    // Firefox browsers
    if (window.webrtcDetectedBrowser === 'firefox') {
      // If there's an element used for checking stream stop
      // for an instance remote MediaStream for firefox
      // reattachmediastream instead
      if (typeof bind.checkingVideo !== 'undefined' &&
        bind instanceof LocalMediaStream === false) {
        window.reattachMediaStream(element, bind.checkingVideo);

      // LocalMediaStream
      } else {
        window.attachMediaStream(element, bind);
      }

    // Non-firefox browsers
    } else {
      window.attachMediaStream(element, bind);
    }
  },

  /* MediaStreamTrack polyfills */
  track: {
    /**
     * Stores the list of subscription events to prevent over-bloating the MediaStream object
     *   for Safari / IE (plugin-enabled) browsers.
     * @attribute StreamPolyfill.track.fns
     * @type JSON
     * @param {JSON} (#streamId) The stream id of the parent MediaStream.
     * @param {JSON} (#streamId).(#trackId) The track id that holds the functions.
     * @param {Function} [(#streamId).(#trackId).onended] The track's onended function.
     * @param {Function} [(#streamId).(#trackId).onmute] The track's onmute function.
     * @param {Function} [(#streamId).(#trackId).onunmute] The track's onunmute function.
     * @private
     * @support Safari, IE
     * @for Stream
     * @since 0.6.0
     */
    fns: {},

    /**
     * Gets the track.onsomething event subscribed.
     * @method StreamPolyfill.track.getFn
     * @param {Object} bindTrack The MediaStreamTrack object.
     * @param {String} mediaStreamId The MediaStream object id.
     * @param {String} fnName The onsomething event name.
     * @param {Function} [fn] The subscription function. If not provided, it
     *   returns the subscription function.
     * @private
     * @for Stream
     * @since 0.6.0
     */
    getFn: function (bindTrack, mediaStreamId, fnName, fn) {
      // Prevent undefined error
      this.fns[mediaStreamId] = this.fns[mediaStreamId] || {
        audio: {},
        video: {}
      };
      this.fns[mediaStreamId][bindTrack.kind] = this.fns[mediaStreamId][bindTrack.kind] || {};
      this.fns[mediaStreamId][bindTrack.kind][bindTrack.id] = this.fns[mediaStreamId][bindTrack.kind][bindTrack.id] || {};

      if (typeof fn === 'function') {
        this.fns[mediaStreamId][bindTrack.kind][bindTrack.id][fnName] = fn || function () {};

      } else {
        return this.fns[mediaStreamId][bindTrack.kind][bindTrack.id][fnName] || function () {};
      }
    },

    /**
     * Handles the polyfill stop() function for MediaStreamTrack to trigger
     *   un-implemented MediaStreamTrack.onended event for Firefox.
     * @method StreamPolyfill.track.stop
     * @param {Object} bind The MediaStreamTrack object.
     * @support Firefox, Chrome, Opera
     * @private
     * @for Stream
     * @since 0.6.0
     */
    stop: function (bind) {

      // Allow users to use polystop to polyfill stop and onended for MediaStreamTrack
      // Tell users that stop() is not implemented in plugin browsers for MediaStreamTrack
      //    due to certain issues with the feature
      if (window.webrtcDetectedBrowser === 'safari' || window.webrtcDetectedBrowser === 'IE') {
        log.warn('StreamPolyfill', window.webrtcDetectedBrowser.toUpperCase() + ' (plugin-enabled) browser ' +
          'does not support MediaStreamTrack.stop() due to issues with the feature');
        return;
      }

      bind.stop();

      // Workaround for firefox as it does not have stop events
      if (window.webrtcDetectedBrowser === 'firefox') {

        if (bind.ended !== true) {
          bind.ended = true;

          if (typeof bind.onended === 'function') {
            bind.onended(bind);
          }
        }
      }
    },

    /**
     * Handles the un-implemented MediaStream.onended events. Use this to set a checker
     *   for plugin-enabled browsers MediaStreams when ended. It will trigger onended when
     *   stream has ended.
     * @method StreamPolyfill.track.checkEnded
     * @param {Object} bind The MediaStreamTrack object.
     * @param {String} mediaStreamId The MediaStream object id.
     * @private
     * @for Stream
     * @since 0.6.0
     */
    checkEnded: function (bind, mediaStreamId) {
      if (window.webrtcDetectedBrowser === 'safari' ||
        window.webrtcDetectedBrowser === 'IE') {
        this.getFn(bind, mediaStreamId, 'onended', bind.onended);
      }
    },

    /**
     * Handles the un-implemented MediaStream.onmute events. Use this to set a checker
     *   for plugin-enabled browsers MediaStreams when muted. It will trigger onm,ute when
     *   stream has been muted.
     * @method StreamPolyfill.track.checkMute
     * @param {Object} bind The MediaStreamTrack object.
     * @param {String} mediaStreamId The MediaStream object id.
     * @private
     * @for Stream
     * @since 0.6.0
     */
    checkMute: function (bind, mediaStreamId) {
      if (window.webrtcDetectedBrowser === 'safari' ||
        window.webrtcDetectedBrowser === 'IE') {
        this.getFn(bind, mediaStreamId, 'onmute', bind.onmute);
      }
    },

    /**
     * Handles the un-implemented MediaStream.onunmute events. Use this to set a checker
     *   for plugin-enabled browsers MediaStreams when unmuted. It will trigger onunmuted when
     *   stream has unmuted.
     * @method StreamPolyfill.track.checkUnmute
     * @param {Object} bind The MediaStreamTrack object.
     * @param {String} mediaStreamId The MediaStream object id.
     * @private
     * @for Stream
     * @since 0.6.0
     */
    checkUnmute: function (bind, mediaStreamId) {
      if (window.webrtcDetectedBrowser === 'safari' ||
        window.webrtcDetectedBrowser === 'IE') {
        this.getFn(bind, mediaStreamId, 'onunmute', bind.onunmute);
      }
    },

    /**
     * Handles the polyfill muted attribute and sets it to <code>true</code> for
     *   MediaStreamTrack to trigger un-implemented MediaStreamTrack.onmute event.
     * This uses the enabled attribute and sets it to <code>false</code>.
     * @method StreamPolyfill.track.mute
     * @param {Object} bind The MediaStreamTrack object.
     * @param {String} mediaStreamId The MediaStream object id.
     * @private
     * @for Stream
     * @since 0.6.0
     */
    mute: function (bind, mediaStreamId) {

      // Allow users to use polymute to polyfill muted = true and onmute for MediaStreamTrack
      bind.enabled = false;
      bind.muted = true;

      // Workaround for Safari / IE users
      if (window.webrtcDetectedBrowser === 'safari' || window.webrtcDetectedBrowser === 'IE') {
        var fn = this.getFn(bind, mediaStreamId, 'onmute');
        fn(bind);

      } else {
        if (typeof bind.onmute === 'function') {
          bind.onmute(bind);
        }
      }
    },

    /**
     * Handles the polyfill muted attribute and sets it to <code>false</code> for
     *   MediaStreamTrack to trigger un-implemented MediaStreamTrack.onunmute event.
     * This uses the enabled attribute and sets it to <code>true</code>.
     * @method StreamPolyfill.track.unmute
     * @param {Object} bind The MediaStreamTrack object.
     * @param {String} mediaStreamId The MediaStream object id.
     * @private
     * @for Stream
     * @since 0.6.0
     */
    unmute: function (bind, mediaStreamId) {

      // Allow users to use polyunmute to polyfill muted = false and onunmute for MediaStreamTrack
      bind.enabled = true;
      bind.muted = false;

      // Workaround for Safari / IE users
      if (window.webrtcDetectedBrowser === 'safari' || window.webrtcDetectedBrowser === 'IE') {
        var fn = this.getFn(bind, mediaStreamId, 'onunmute');
        fn(bind);

      } else {
        if (typeof bind.onunmute === 'function') {
          bind.onunmute(bind);
        }
      }
    }

  }
};
var StreamGetSources = function (defer) {
  // Firefox does not support MediaStreamTrack.getSources yet
  // Chrome / Plugin / Opera supports MediaStreamTrack.getSources
  if (window.webrtcDetectedBrowser !== 'firefox') {
    var audioList = [];
    var videoList = [];

    // Retrieve list
    MediaStreamTrack.getSources(function (trackList) {
      var i;

      for (i = 0; i < trackList.length; i += 1) {
        var track = trackList[i];
        var data = {};

        // MediaStreamTrack label - FaceHD Camera
        data.label = track.label || (track.kind + '_' + (i + 1));
        // MediaStreamTrack kind - audio / video
        data.kind = track.kind;
        // MediaStreamTrack id - The identifier
        data.id = track.id;
        // The facing environment
        data.facing = track.facing;

        if (track.kind === 'audio') {
          audioList.push(data);
        } else {
          videoList.push(data);
        }
      }

      defer({
        audio: audioList,
        video: videoList
      });
    });
  }
};
function User (config, listener) {
  'use strict';

  // Prevent undefined listener error
  listener = listener || function (event, data) {};

  // Reference of instance
  var com = this;

  /* Attributes */
  /**
   * The user id.
   * @attribute id
   * @type String
   * @readOnly
   * @for User
   * @since 0.6.0
   */
  com.id = config.id;

  /**
   * The user type.
   * @attribute type
   * @type String
   * @default "user"
   * @readOnly
   * @for User
   * @since 0.6.0
   */
  com.type = 'user';

  /**
   * Stores the user data.
   * @attribute data
   * @type JSON
   * @private
   * @for User
   * @since 0.6.0
   */
  com.data = config.data || {};

  /**
   * Stores the browser agent information.
   * @attribute agent
   * @param {String} name The browser agent name.
   * @param {Integer} version The browser agent version.
   * @param {String} webRTCType The browser agent WebRTC type of implementation.
   * @type JSON
   * @for User
   * @since 0.6.0
   */
  com.agent = config.agent || {};

  /**
   * Stores the user's bandwidth configuration.
   * @attribute bandwidth
   * @param {Integer} audio The bandwidth audio configuration.
   * @param {Integer} data The bandwidth data configuration.
   * @param {Integer} video The bandwidth video configuration.
   * @type JSON
   * @private
   * @for User
   * @since 0.6.0
   */
  com.bandwidth = config.bandwidth || {};

  /**
   * Stores the list of peer connections to user.
   * @attribute peers
   * @type JSON
   * @private
   * @for User
   * @since 0.6.0
   */
  com.peers = {};


  /* Methods */
  /**
   * The handler that the manages response and received events.
   * @method _handler
   * @param {String} event The event name.
   * @param {JSON} data The response data.
   * @private
   * @for Stream
   * @since 0.6.0
   */
  com._handler = function (event, data) {
    UserHandler(com, event, data, listener);
  };

  /**
   * Starts a new peer connection to user.
   * @method addConnection
   * @param {JSON} data The shared peer connection streaming configuration.
   * @param {JSON} data.prid The shared peer connection id.
   * @param {Array} data.iceServers The ICE servers the connection should use.
   * @param {JSON} data.stream The streamming configuration for the shared peer connection.
   * @param {JSON|Boolean} [data.stream.audio=false] The audio stream configuration.
   *    If parsed as a boolean, other configuration settings under the audio
   *    configuration would be set as the default setting in the connection.
   * @param {Boolean} [data.stream.audio.stereo=false] The flag that indiciates
   *    if stereo is enabled for this connection.
   * @param {String} [data.stream.audio.sourceId] The source id of the audio MediaStreamTrack
     *    used for this connection.
   * @param {String|Boolean} [data.stream.video=false] The video stream configuration.
   *    If parsed as a boolean, other configuration settings under the video
   *    configuration would be set as the default setting in the connection.
   * @param {JSON} [data.stream.video.resolution] The video streaming resolution.
   * @param {Integer} data.stream.video.resolution.width The video resolution width.
   * @param {Integer} data.stream.video.resolution.height The video resolution height.
   * @param {Integer} data.stream.video.frameRate The video stream framerate.
   * @param {String} [data.stream.video.sourceId] The source id of the video MediaStreamTrack
   *    used for this connection.
   * @param {JSON} data.stream.status The stream MediaStreamTrack status.
   * @param {Boolean} [data.stream.status.audioMuted=false] The flag that indicates if audio is muted.
   *    If audio is set to false, this would be set as true.
   * @param {Boolean} [data.stream.status.videoMuted=false] The flag that indicates if video is muted.
   *    If video is set to false, this would be set as true.
   * @param {JSON} data.bandwidth The bandwidth configuration the peer connections.
   *    This does fixes the bandwidth but doesn't prevent alterations done by browser for smoother streaming.
   * @param {Integer} [data.bandwidth.audio] The bandwidth configuration for the audio stream.
   * @param {Boolean} [data.bandwidth.video] The bandwidth configuration for the video stream.
   * @param {Boolean} [data.bandwidth.data] The bandwidth configuration for the data stream.
   * @param {String} data.SDPType The session description type that the peer connection would send.
   *    Types are <code>"offer"</code> or <code>"answer"</code>.
   * @param {Stream} [stream] The stream object.
   * @private
   * @for User
   * @since 0.6.0
   */
  com.addConnection = function (data, stream) {
    var peerConfig = {
      id: data.prid,
      iceServers: data.iceServers,
      sdpConfig: {
        bandwidth: data.bandwidth,
        stereo: fn.isSafe(function () {
          return !!data.settings.audio.stereo;
        }),
        SDPType: data.SDPType
      },
      streamingConfig: data.settings
    };

    // Add the main streaming config
    com.streamingConfigs[data.stream.prid] = data.settings;

    var peer = new Peer(peerConfig, com.routeEvent);

    peer.connect(stream);

    com.peers[peer.id] = peer;

    com._handler('user:addconnection', {
      peer: peer,
      peerId: data.prid,
      config: peerConfig
    });
  };

  /**
   * Stops a peer connection to user.
   * @method removeConnection
   * @param {String} peerId The shared peer connection id.
   * @private
   * @for User
   * @since 0.6.0
   */
  com.removeConnection = function (peerId) {
    var peer = com.peers[peerId];

    if (!fn.isEmpty(peer)) {
      peer.disconnect();
    }

    com._handler('user:removeconnection', {
      peerId: peerId
    });
  };

  /**
   * Disconnects this user connection.
   * @method disconnect
   * @private
   * @for User
   * @since 0.6.0
   */
  com.disconnect = function () {
    fn.forEach(com.peers, function (peer, id) {
      peer.disconnect();
    });
  };

  /**
   * Gets this user information.
   * @method getInfo
   * @param {String} [peerId] The shared peer connection id to retrieve
   *    that streaming information only.
   * @returns {JSON} The user streaming configuration and custom data.
   * - <code>userData</code> <var>: <b>type</b> String | JSON</var><br>
   *   The custom data.
   * - <code>agent</code> <var>: <b>type</b> JSON</var><br>
   *   The user's browser agent information.
   * - <code>agent.name</code> <var>: <b>type</b> String</var><br>
   *   The user's browser agent name.
   * - <code>agent.version</code> <var>: <b>type</b> Integer</var><br>
   *   The user's browser agent version.
   * - <code>agent.webRTCType</code> <var>: <b>type</b> String</var><br>
   *   The user's browser webrtc implementation type.
   * - <code>streams</code> <var>: <b>type</b> JSON</var><br>
   *   The list of peer connections streaming.
   * - <code>streams.(#peerId)</code> <var>: <b>type</b> JSON</var><br>
   *   The peer connection streaming information.
   * - <code>streams.(#peerId).audio</code> <var>: <b>type</b> JSON|Boolean</var><br>
   *   The audio streaming information. If there is no stream connection with the peer,
   *   it's <code>false</code>.
   * - <code>streams.(#peerId).audio.stereo</code> <var>: <b>type</b> Boolean</var><br>
   *   The flag that indicates if stereo is enabled for this connection. By default,
   *   it's <code>false</code>.
   * - <code>streams.(#peerId).audio.sourceId</code> <var>: <b>type</b> String</var><br>
   *   The audio MediaStreamTrack source used for this connection.
   * - <code>streams.(#peerId).video</code> <var>: <b>type</b> JSON|Boolean</var><br>
   *   The video streaming information. If there is no stream connection with the peer,
   *   it's <code>false</code>.
   * - <code>streams.(#peerId).video.resolution</code> <var>: <b>type</b> JSON</var><br>
   *   The video stream resolution.
   * - <code>streams.(#peerId).video.resolution.width</code> <var>: <b>type</b> Integer</var><br>
   *   The video stream resolution height.
   * - <code>streams.(#peerId).video.resolution.height</code> <var>: <b>type</b> Integer</var><br>
   *   The video stream resolution width.
   * - <code>streams.(#peerId).video.frameRate</code> <var>: <b>type</b> Integer</var><br>
   *   The video stream resolution framerate.
   * - <code>streams.(#peerId).video.sourceId</code> <var>: <b>type</b> String</var><br>
   *   The video MediaStreamTrack source used for this connection.
   * - <code>streams.(#peerId).status</code> <var>: <b>type</b> JSON</var><br>
   *   The MediaStreamTracks enabled status (muted/unmuted).
   * - <code>streams.(#peerId).status.audioMuted</code> <var>: <b>type</b> Boolean</var><br>
   *   The audio MediaStreamTrack enabled status (muted/unmuted).
   * - <code>streams.(#peerId).status.audioMuted</code> <var>: <b>type</b> Boolean</var><br>
   *   The video MediaStreamTrack enabled status (muted/unmuted).
   * - <code>bandwidth</code> <var>: <b>type</b> JSON</var><br>
   *   The bandwidth configuration for the peer connections.
   *   This does fixes the bandwidth but doesn't prevent alterations done by browser for smoother streaming.
   * - <code>bandwidth.data</code> <var>: <b>type</b> Integer</var><br>
   *   The bandwidth configuration for data stream.
   * - <code>bandwidth.video</code> <var>: <b>type</b> Integer</var><br>
   *   The bandwidth configuration for video stream.
   * - <code>bandwidth.audio</code> <var>: <b>type</b> Integer</var><br>
   *   The bandwidth configuration for audio stream.
   * @for User
   * @since 0.6.0
   */
  com.getInfo = function (peerId) {
    var data = {};

    // Pass jshint error
    var getStreamSettingsFn = function (peer) {
      var stream = peer.stream || {};
      return stream.config || {
        audio: false,
        video: false,
        status: {
          audioMuted: true,
          videoMuted: true
        }
      };
    };

    data.userData = com.data;
    data.agent = com.agent;
    data.bandwidth = com.bandwidth;


    // If it's retrieving on peer connection streaming information or not
    if (!fn.isEmpty(peerId)) {
      var onepeer = com.peers[peerId];

      // If the peer connection is empty, throw an exception
      if (!fn.isEmpty(onepeer)) {
        data.stream = getStreamSettingsFn(onepeer);

      } else {
        throw new Error('Peer connection for "' + peerId + '" does not exist');
      }


    } else {
      data.streams = {};

      var key;

      for (key in com.peers) {
        if (com.peers.hasOwnProperty(key)) {
          var peer = com.peers[key];

          var settings = getStreamSettingsFn(peer);

          settings.bandwidth = peer.bandwidth || {};

          data.streams[peer.id] = settings;
        }
      }
    }
    return data;
  };

  /* Event Handlers */
  /**
   * Function to subscribe to when the user object is ready to use.
   * @method onready
   * @eventhandler true
   * @for User
   * @since 0.6.0
   */
  com.onready = function () {};

  /**
   * Function to subscribe to when user's custom data is updated.
   * @method onupdate
   * @eventhandler true
   * @for User
   * @since 0.6.0
   */
  com.onupdate = function () {};

  /**
   * Function to subscribe to when user has an established "main" peer connection.
   * @method onconnect
   * @eventhandler true
   * @for User
   * @since 0.6.0
   */
  com.onconnect = function () {};

  /**
   * Function to subscribe to when user is disconnected from the room.
   * @method ondisconnect
   * @eventhandler true
   * @for User
   * @since 0.6.0
   */
  com.ondisconnect = function () {};

  /**
   * Function to subscribe to when a new peer connection is established to user.
   * @method onaddconnection
   * @eventhandler true
   * @for User
   * @since 0.6.0
   */
  com.onaddconnection = function () {};

  /**
   * Function to subscribe to when a peer connection to user has added.
   * @method onremoveconnection
   * @eventhandler true
   * @for User
   * @since 0.6.0
   */
  com.onremoveconnection = function () {};

  /**
   * Function to subscribe to when a new data transfer request is initialized from user.
   * @method ondatarequest
   * @eventhandler true
   * @for User
   * @since 0.6.0
   */
  com.ondatarequest = function () {};

  /**
   * Function to subscribe to when a new data is received after transfer is completed from user.
   * @method ondata
   * @eventhandler true
   * @for User
   * @since 0.6.0
   */
  com.ondata = function () {};

  /**
   * Function to subscribe to when a new message is received from user.
   * @method onmessage
   * @eventhandler true
   * @for User
   * @since 0.6.0
   */
  com.onmessage = function () {};


  /* Beginning Logic */
  // Run sync so there is time to return the user object before running ready.
  // Example user = new User(). Return and assign to user the user object reference
  //   before running user:ready
  fn.runSync(function () {
    com._handler('user:ready', config);
  });
}
var UserEventMessageHandler = {

  // Add peer connection if peer doesn't exists
  // If exist, exit
  enter: function (com, data, listener) {
    var peer = com.peers[data.prid];

    if (!fn.isEmpty(peer)) {
      return;
    }

    // Adds a peer connection
    com.addConnection({
      id: data.prid,
      iceServers: data.iceServers,
      bandwidth: com.bandwidth,
      stream: data.stream,
      SDPType: 'answer'

    }, data.streamObject);
  },

  // Add peer connection if peer doesn't exists
  // If exist, it could be a weight checking
  // For an instance, when both users receives each other's welcome
  welcome: function (com, data, listener) {
    var peer = com.peers[data.prid];

    // If peer has been created because of duplicate enter,
    // Check which weight received is higher first
    if (!fn.isEmpty(peer)) {
      if (peer.weight < data.weight) {
        return;
      }

      peer.SDPType = 'offer';
      data.type = 'start';

    // New peer
    } else {
      // Adds a peer connection
      com.addConnection({
        id: data.prid,
        iceServers: data.iceServers,
        bandwidth: com.bandwidth,
        stream: data.stream,
        SDPType: 'offer'

      }, data.streamObject);
    }
  },

  // Receives a peer offer, send to the correct peer
  offer: function (com, data, listener) {
    var peer = com.peers[data.prid];

    if (!fn.isEmpty(peer)) {
      peer.handler('message:offer', data);
    }
  },

  // Receives a peer answer, send to the correct peer
  answer: function (com, data, listener) {
    var peer = com.peers[data.prid];

    if (!fn.isEmpty(peer)) {
      peer.handler('message:answer', data);
    }
  },

  // Receives an ice candidate, send to the correct peer
  candidate: function (com, data, listener) {
    var peer = com.peers[data.prid];

    if (!fn.isEmpty(peer)) {
      peer.handler('message:candidate', data);
    }
  },

  // Receives a restart, send to the correct peer
  restart: function (com, data, listener) {
    var peer = com.peers[data.prid];

    if (!fn.isEmpty(peer)) {
      peer.handler('message:restart', data);
    }
  },

  // Receives an updateUserEvent. Update the user data
  updateUserEvent: function (com, data, listener) {
    com.data = data.data;

    com.handler('user:update', {
      data: data.userData
    });
  },

  // Receives an audio muted event. relay to correct peer
  muteAudioEvent: function (com, data, listener) {
    var peer = com.peers[data.prid];

    if (!fn.isEmpty(peer)) {
      peer.handler('message:muteAudioEvent', data);
    }
  },

  // Receives an video muted event. relay to correct peer
  muteVideoEvent: function (com, data, listener) {
    var peer = com.peers[data.prid];

    if (!fn.isEmpty(peer)) {
      peer.handler('message:muteVideoEvent', data);
    }
  }
};

var UserEventReceivedHandler = {

  /* Handles peer events */
  peer: {

    // Peer connection object is created an binded with
    // apprioate rtcevents.
    // Ready to start creating offer
    connect: function (com, data, listener) {
      var peer = com.peers[data.id];

      if (typeof com.onaddconnection === 'function') {
        com.onaddconnection(peer);
      }

      if (peer.SDPType === 'offer') {
        peer.createOffer();
      }
    },

    // Check if peer's ice connection state is connected
    // If connected, user has one connection - meaning connected
    iceconnectionstate: function (com, data, listener) {
      if (data.id === 'main' && data.state === 'connected') {
        com.handler('user:connect', {});
      }
    },

    // Handles the peers that disconnects
    // TODO: If main connection disconnects, it should disconnect the other peers too
    // If no peer connections connected, it should reflect user:disconnect
    disconnect: function (com, data, listener) {
      var peer = com.peers[data.id];

      delete com.peers[data.id];

      if (typeof com.onremoveconnection === 'function') {
        com.onremoveconnection(peer);
      }

      if (Object.keys(com.peers).length === 0) {
        com.handler('user:disconnect', {});
      }
    }
  },

  /* Handles data transfer events */
  transfer: {
    // TODO
    complete: function (com, data, listener) {
      com.handler('user:data', data);
    },

    // TODO
    request: function (com, data, listener) {
      com.handler('user:datarequest', data);
    }
  }

};
var UserEventResponseHandler = {

  /**
   * Event fired when the user object is ready to use.
   * @event user:ready
   * @for User
   * @since 0.6.0
   */
  ready: function (com, data, listener) {
    if (typeof com.onready === 'function') {
      com.onready();
    }
  },

  /**
   * Event fired when the user has an established "main" peer connection.
   * @event user:connect
   * @for User
   * @since 0.6.0
   */
  connect: function (com, data, listener) {
    if (typeof com.onconnect === 'function') {
      com.onconnect();
    }
  },

  /**
   * Event fired when the user has transferred a data successfully.
   * @event user:data
   * @for User
   * @since 0.6.0
   */
  data: function (com, data, listener) {
    if (typeof com.ondata === 'function') {
      com.ondata();
    }
  },

  /**
   * Event fired when the user is initiating a data transfer request.
   * @event user:datarequest
   * @for User
   * @since 0.6.0
   */
  datarequest: function (com, data, listener) {
    if (typeof com.ondatarequest === 'function') {
      com.ondatarequest();
    }
  },

  /**
   * Event fired when the user's custom data has been updated.
   * @event user:data
   * @for User
   * @since 0.6.0
   */
  update: function (com, data, listener) {
    if (typeof com.onupdate === 'function') {
      com.onupdate(data.data);
    }
  },

  /**
   * Event fired when the user has started a peer connection.
   * @event user:addconnection
   * @for User
   * @since 0.6.0
   */
  addconnection: function (com, data, listener) {
    if (typeof com.onaddconnection === 'function') {
      com.onaddconnection();
    }
  },

  /**
   * Event fired when the user has ended a peer connection
   * @event user:removeconnection
   * @for User
   * @since 0.6.0
   */
  removeconnection: function (com, data, listener) {
    if (typeof com.onremoveconnection === 'function') {
      com.onremoveconnection(data.data);
    }
  },

  /**
   * Event fired when the user sends an incoming message.
   * @event user:message
   * @for User
   * @since 0.6.0
   */
  message: function (com, data, listener) {
    if (typeof com.onmessage === 'function') {
      com.onmessage();
    }
  },

  /**
   * Event fired when the user's peer connections has been disconnected.
   * Usually fired when user leaves the room.
   * @event user:disconnect
   * @for User
   * @since 0.6.0
   */
  disconnect: function (com, data, listener) {
    if (typeof com.ondisconnect === 'function') {
      com.ondisconnect();
    }
  }

};
var UserHandler = function (com, event, data, listener) {
  var params = event.split(':');

  // Messaging events
  if (event.indexOf('message:') === 0) {

    fn.applyHandler(UserEventMessageHandler, params, [com, data, listener]);

    log.debug('Stream', 'Received message event', event, data);

  } else {
    // Class events
    if (event.indexOf('user:') === 0) {
      data.id = com.id;

      fn.applyHandler(UserEventResponseHandler, params, [com, data, listener]);

      log.debug('Stream', 'Responding with event', event, data);

    } else {
      data.userId = com.id;

      fn.applyHandler(UserEventReceivedHandler, params, [com, data, listener]);

      log.debug('Stream', 'Received sub-class event', event, data);
    }

    listener(event, data);
  }
};