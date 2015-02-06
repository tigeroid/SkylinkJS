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
  },
  
  forEach: function (main, deferItem, deferFin) {
    if (typeof main === 'object' && !fn.isEmpty(main)) {
      // Array objects
      if (main.constructor === Array) {
        var i;
        
        for (i = 0; i < main.length; i += 1) {
          deferItem(main[i], i);
        }
      
      // JSON objects
      } else {
        var key;
        
        for (key in main) {
          if (main.hasOwnProperty(key)) {
            deferItem(main[key], key);
          }
        }
      }
      // Finished loop
      if (typeof deferFin === 'function') {
        deferFin();
      }
    }
  }
  
};