/**
 * Handles the MediaStream object connection and events.
 * @class Stream
 * @constructor
 * @param {Object} stream The MediaStream object to parse and hook events on.
 * @param {JSON} config The streaming configuration.
 * @param {JSON|Boolean} [config.audio=false] The audio stream configuration.
 *    If parsed as a boolean, other configuration settings under the audio
 *    configuration would be set as the default setting in the connection.
 * @param {Boolean} [config.audio.stereo=false] The flag that indiciates
 *    if stereo is enabled for this stream connection.
 * @param {String} [config.audio.sourceId] The source id of the audio MediaStreamTrack
 *    used for this connection.
 * @param {Boolean} [config.audio.mute=false] The flag that indicates if audio stream
 *    should be muted when retrieving.
 * @param {String|Boolean} [config.video=false] The video stream configuration.
 *    If parsed as a boolean, other configuration settings under the video
 *    configuration would be set as the default setting in the connection.
 * @param {JSON} [config.video.resolution] The video streaming resolution.
 * @param {Integer} config.video.resolution.width The video resolution width.
 * @param {Integer} config.video.resolution.height The video resolution height.
 * @param {Integer} config.video.frameRate The video stream framerate.
 * @param {String} [config.video.sourceId] The source id of the video MediaStreamTrack
 *    used for this connection.
 * @param {Boolean} [config.video.mute=false] The flag that indicates if video stream
 *    should be muted when retrieving.
 * @param {Function} [listener] The listener function.
 * @instantiable true
 * @for Skylink
 * @since 0.6.0
 */
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
          !!!com.config.audio.mute : !!com.config.audio;
      } else {
        isEnabled = (typeof com.config.video === 'object') ?
          !!!com.config.video.mute : !!com.config.video;
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
    if (com.config.audio === false) {
      log.warn('There is no available audio tracks to stop');
      return;
    }

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
    if (com.config.video === false) {
      log.warn('There is no available video tracks to stop');
      return;
    }

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
    if (com.config.audio === false) {
      log.warn('There is no available audio tracks to mute');
      return;
    }

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
    if (com.config.video === false) {
      log.warn('There is no available video tracks to mute');
      return;
    }

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
    if (com.config.audio === false) {
      log.warn('There is no available audio tracks to unmute');
      return;
    }

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
    if (com.config.video === false) {
      log.warn('There is no available video tracks to unmute');
      return;
    }

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

    com._constraints = {
      audio: audioSettings.userMedia,
      video: videoSettings.userMedia
    };

    com.config = {
      audio: audioSettings.settings,
      video: audioSettings.settings
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