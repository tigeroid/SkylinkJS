var log = console;

/**
 * Stores the preferences shared across classes.
 * @attribute globals
 * @type JSON
 * @param {String} apiKey The developer API Key.
 * @param {String} region The regional server to connect to.
 * @param {String} defaultRoom The default room that joinRoom should connect to.
 * @private
 * @for Skylink
 * @since 0.6.0
 */
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
    return typeof data === 'undefined' || data === null;
  },
  
  isSafe: function (unsafeFn) {
    try {
      return unsafeFn();
    } catch (error){
      log.warn('Unsafe code received', error);
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
  
  clone: function (obj) {
    if (this.isEmpty(obj) || typeof obj !== 'object') {
      return obj;
    }
    var copy = obj.constructor();
    
    for (var attr in obj) {
      if (obj.hasOwnProperty(attr)) {
        copy[attr] = obj[attr];
      }
    }
    return copy;
  },
  
  constant: function (main, property, value) {
    var obj = {};
    obj[property] = {
      value: value,
      enumerable: true
    };
    Object.defineProperties(main, obj);
  }
}