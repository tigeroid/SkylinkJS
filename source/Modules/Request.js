/**
 * Handles the XMLHttpRequest and API function calls.
 * @attribute Request
 * @for Skylink
 * @since 0.6.0
 */
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