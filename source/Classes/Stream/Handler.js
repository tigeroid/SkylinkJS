/**
 * Handles the stream class events.
 * @method StreamHandler
 * @param {Object} com The reference to the class object.
 * @param {String} event The event name.
 * @param {JSON} data The event data response.
 * @param {Function} listener The listener function.
 * @private
 * @for Stream
 * @since 0.6.0
 */
var StreamHandler = function (com, event, data, listener) {
  var params = event.split(':');

  // Class events
  data.id = com.id;
  data.label = com.label;

  fn.applyHandler(StreamEventResponseHandler, params, [com, data, listener]);

  listener(event, data);

  log.debug('Stream', 'Responding with event', event, data);
};