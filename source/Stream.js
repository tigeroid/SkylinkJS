/**
 * Handles the MediaStream object connection and events.
 * @class Stream
 * @constructor
 * @param {Object} stream The MediaStream object to parse and hook events on.
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

  /**
   * The stream id.
   * @attribute id
   * @type String
   * @private
   * @for Stream
   * @since 0.6.0
   */
  com.id = null;

  /**
   * The getUserMedia constraints.
   * @attribute constraints
   * @type JSON
   * @private
   * @for Stream
   * @since 0.6.0
   */
  com.constraints = null;

  /**
   * The streaming configuration.
   * @attribute config
   * @type JSON
   * @private
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
   * @default "local"
   * @private
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
  com.MediaStream = null;

  
  /**
   * Function to subscribe to when stream object is ready to use.
   * @method onstart
   * @eventhandler true
   * @for Stream
   * @since 0.6.0
   */
  com.onstart = function () { };

  /**
   * Function to subscribe to when getUserMedia throws an exception or event has error.
   * @method onerror
   * @eventhandler true
   * @for Stream
   * @since 0.6.0
   */
  com.onerror = function () { };
  
  /**
   * Function to subscribe to when MediaStreamTrack of the MediaStream object has started.
   * @method ontrackstart
   * @eventhandler true
   * @for Stream
   * @since 0.6.0
   */
  com.ontrackstart = function () { };

  /**
   * Function to subscribe to when MediaStreamTrack of the MediaStream object has stopped.
   * @method ontrackstop
   * @eventhandler true
   * @for Stream
   * @since 0.6.0
   */
  com.ontrackstop = function () { };
  
  /**
   * Function to subscribe to when MediaStreamTrack of the MediaStream object has been disabled (muted).
   * @method ontrackmute
   * @eventhandler true
   * @for Stream
   * @since 0.6.0
   */
  com.ontrackmute = function () { };

  /**
   * Function to subscribe to when MediaStreamTrack of the MediaStream object has been enabled (unmuted).
   * @method ontrackunmute
   * @eventhandler true
   * @for Stream
   * @since 0.6.0
   */
  com.ontrackunmute = function () { };
  
  /**
   * Function to subscribe to when MediaStream object has ended.
   * @method onstop
   * @eventhandler true
   * @for Stream
   * @since 0.6.0
   */
  com.onstop = function () { };
  

  /**
   * The handler that the parent classes utilises to listen to events.
   * @method parentHandler
   * @param {String} event The event name.
   * @param {JSON} data The response data.
   * @private
   * @for Stream
   * @since 0.6.0
   */
  com.parentHandler = function () {};

  /**
   * The handler that manages all triggers or relaying events.
   * @method handler
   * @param {String} event The event name.
   * @param {JSON} data The response data.
   * @private
   * @for Stream
   * @since 0.6.0
   */
  com.handler = function (event, data) {
    StreamHandler(com, event, data, listener);
  
    if (typeof com.parentHandler === 'function') {
      com.parentHandler(event, data);
    }
  };

  /**
   * Starts a MediaStream connection with getUserMedia.
   * @method start
   * @private
   * @for Stream
   * @since 0.6.0
   */
  com.start = function () {
    window.getUserMedia(com.constraints, com.bind, function (error) {
      com.handler('stream:error', {
        error: error,
        sourceType: com.sourceType
      });
    });
  };

  /**
   * Binds events to MediaStream object.
   * @method bind
   * @param {Object} bindStream The MediaStream object to bind events to.
   * @private
   * @for Stream
   * @since 0.6.0
   */
  com.bind = function (bindStream) {
    // Set a MediaStream id if Firefox or Chrome doesn't
    com.id = fn.generateUID();

    // Bind events to MediaStream
    // bindStream.onaddtrack = com.onAddTrack;
    // bindStream.onremovetrack = com.onRemoveTrack;
    bindStream.onended = com.bindOnStreamEnded(bindStream);
    bindStream.newId = com.id;

    // Bind track events
    com.bindTracks(bindStream.getAudioTracks());
    com.bindTracks(bindStream.getVideoTracks());

    com.MediaStream = bindStream;
 
    com.handler('stream:start', {
      label: bindStream.label,
      constraints: com.constraints,
      sourceType: com.sourceType
    });
  };

  /**
   * Binds events to MediaStreamTrack object.
   * @method bindTracks
   * @param {Array} bindTracks The MediaStreamTracks from the MediaStream object.
   * @param {Object} bindTracks.n The MediaStreamTrack object to bind events to.
   * @private
   * @for Stream
   * @since 0.6.0
   */
  com.bindTracks = function (bindTracks) {
    var i;
    
    for (i = 0; i < bindTracks.length; i += 1) {
      var track = bindTracks[i];
  
      track.newId = track.id || fn.generateUID();

      // Bind events to MediaStreamTrack
      // bindTracks[i].onstarted = com.onStarted;
      track.onended = function () {
        com.handler('stream:track:stop', {
          trackId: track.newId,
          kind: track.kind,
          label: track.label,
          enabled: track.enabled,
          sourceType: com.sourceType
        });

        if (typeof com.ontrackended === 'function') {
          com.ontrackended(track);
        }
      };

      // Un-implemented events functions
      //track.onmute = function(event) {};
      //track.onunmute = function(event) {};
      // track.onoverconstrained = function(event) {};

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

      com.handler('stream:track:start', {
        trackId: track.newId,
        kind: track.kind,
        label: track.label,
        enabled: track.enabled,
        sourceType: com.sourceType
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
    if (window.webrtcDetectedBrowser === 'firefox' &&
      (com.MediaStream instanceof LocalMediaStream) === false) {
      window.reattachMediaStream(element, com.MediaStream.checkingVideo);
    
    } else {
      window.attachMediaStream(element, com.MediaStream);
    }
  };

  /**
   * Handles the differences for non-implemented onended event for MediaStream.
   * @method bindOnStreamEnded
   * @param {Object} bindStream The MediaStream object to bind the event to.
   * @return {Function|Object} The interval object workaround for Firefox or the
   *   event handler function for supported browsers.
   * @private
   * @for Stream
   * @since 0.6.0
   */
  com.bindOnStreamEnded = function (bindStream) {
    var fn = function () {
      com.handler('stream:stop', {
        label: stream.label,
        constraints: com.constraints,
        sourceType: com.sourceType
      });
      
      if (typeof com.onended === 'function') {
        com.onended(bindStream);
      }
    };
    
    // Firefox browsers
    if (window.webrtcDetectedBrowser === 'firefox') {
      // LocalMediaStream
      if (bindStream.constructor === LocalMediaStream) {
        return setInterval(function () {
          if (bindStream.hasEnded) {
            clearInterval(bindStream.onended);
            // trigger that it has ended
            fn();
          }
  
          if (typeof bindStream.recordedTime === 'undefined') {
            bindStream.recordedTime = 0;
          }

          if (bindStream.recordedTime === bindStream.currentTime) {
            clearInterval(bindStream.onended);
            // trigger that it has ended
            fn();

          } else {
            bindStream.recordedTime = bindStream.currentTime;
          }
        }, 1000);

        // Remote MediaStream
      } else {
        return (function () {
          // Use a video to attach to check if stream has ended
          var video = document.createElement('video');
          video.onstreamended = setInterval(function () {
            if (bindStream.hasEnded) {
              clearInterval(video.onstreamended);
              fn();
            }
            
            if (!fn.isEmpty(video.mozSrcObject)) {
              if (video.mozSrcObject.ended === true) {
                clearInterval(video.onstreamended);
                fn();
              }
            }
          }, 1000);
          
          bindStream.checkingVideo = video;
  
          window.attachMediaStream(video, bindStream);
          return video;
        })();
      }
    }
    // Non-firefox browsers
    return fn;
  };

  /**
   * Mutes all audio MediaStreamTracks of the MediaStream object.
   * @method muteAudio
   * @for Stream
   * @since 0.6.0
   */
  com.muteAudio = function () {
    var tracks = com.MediaStream.getAudioTracks();
    var i;
    
    for (i = 0; i < tracks.length; i += 1) {
      var track = tracks[i];
      
      track.enabled = false;
      
      com.handler('stream:track:mute', {
        trackId: track.newId,
        kind: track.kind,
        label: track.label,
        enabled: track.enabled,
        sourceType: com.sourceType
      });

      if (typeof com.ontrackmute === 'function') {
        com.ontrackmute(track);
      }
    }
  };

  /**
   * Unmutes all audio MediaStreamTracks of the MediaStream object.
   * @method unmuteAudio
   * @for Stream
   * @since 0.6.0
   */
  com.unmuteAudio = function () {
    var tracks = com.MediaStream.getAudioTracks();
    var i;
    
    for (i = 0; i < tracks.length; i += 1) {
      var track = tracks[i];
  
      track.enabled = true;
      
      com.handler('stream:track:unmute', {
        trackId: track.newId,
        kind: track.kind,
        label: track.label,
        enabled: track.enabled,
        sourceType: com.sourceType
      });

      if (typeof com.ontrackunmute === 'function') {
        com.ontrackunmute(track);
      }
    }
  };

  /**
   * Stops all audio MediaStreamTracks streaming in the MediaStream object.
   * @method stopAudio
   * @for Stream
   * @since 0.6.0
   */
  com.stopAudio = function () {
    var tracks = com.MediaStream.getAudioTracks();
    var i;
    
    for (i = 0; i < tracks.length; i += 1) {
      var track = tracks[i];
  
      track.stop();

      // Workaround for firefox as it does not have stop events
      if (window.webrtcDetectedBrowser === 'firefox') {
        if (track.hasEnded !== true) {
          track.onended(track);
          track.hasEnded = true;
        }
      }
    }
    
    // Workaround for firefox as it does not have stop stream when all track ends
    if (window.webrtcDetectedBrowser === 'firefox') {
      if (com.MediaStream.videoEnded === true) {
        com.MediaStream.hasEnded = true;
      }
      com.MediaStream.audioEnded = true;
    }
  };

  /**
   * Mutes all video MediaStreamTracks of the MediaStream object.
   * @method muteVideo
   * @for Stream
   * @since 0.6.0
   */
  com.muteVideo = function () {
    var tracks = com.MediaStream.getVideoTracks();
    var i;
    
    for (i = 0; i < tracks.length; i += 1) {
      var track = tracks[i];
  
      track.enabled = false;
      
      com.handler('stream:track:mute', {
        trackId: track.newId,
        kind: track.kind,
        label: track.label,
        enabled: track.enabled,
        sourceType: com.sourceType
      });

      if (typeof com.ontrackmute === 'function') {
        com.ontrackmute(track);
      }
    }
  };

  /**
   * Unmutes all video MediaStreamTracks of the MediaStream object.
   * @method unmuteVideo
   * @for Stream
   * @since 0.6.0
   */
  com.unmuteVideo = function () {
    var tracks = com.MediaStream.getVideoTracks();
    var i;
    
    for (i = 0; i < tracks.length; i += 1) {
      var track = tracks[i];
  
      track.enabled = true;
      
      com.handler('stream:track:unmute', {
        trackId: track.newId,
        kind: track.kind,
        label: track.label,
        enabled: track.enabled,
        sourceType: com.sourceType
      });

      if (typeof com.ontrackunmute === 'function') {
        com.ontrackunmute(track);
      }
    }
  };

  /**
   * Stops all video MediaStreamTracks streaming of the MediaStream object.
   * @method stopVideo
   * @for Stream
   * @since 0.6.0
   */
  com.stopVideo = function () {
    var tracks = com.MediaStream.getVideoTracks();
    var i;
    
    for (i = 0; i < tracks.length; i += 1) {
      var track = tracks[i];
  
      track.stop();

      // Workaround for firefox as it does not have stop events
      if (window.webrtcDetectedBrowser === 'firefox') {
        if (track.hasEnded !== true) {
          track.onended(tracks[i]);
          track.hasEnded = true;
        }
      }
    }
    
    // Workaround for firefox as it does not have stop stream when all track ends
    if (window.webrtcDetectedBrowser === 'firefox') {
      if (com.MediaStream.audioEnded === true) {
        com.MediaStream.hasEnded = true;
      }
      com.MediaStream.videoEnded = true;
    }
  };

  /**
   * Stops MediaStream object streaming.
   * @method stop
   * @for Stream
   * @since 0.6.0
   */
  com.stop = function () {
    // Stop MediaStream tracks
    com.stopVideo();
    com.stopAudio();
    // Stop MediaStream
    com.MediaStream.stop();
  };
  

  // Throw an error if adapterjs is not loaded
  if (!window.attachMediaStream) {
    throw new Error('Required dependency adapterjs not found');
  }

  // Bind or start MediaStream
  if (fn.isEmpty(stream)) {
    var audioSettings = StreamParser.parseAudioConfig(config.audio);
    var videoSettings = StreamParser.parseVideoConfig(config.video);
    var statusSettings = StreamParser.parseMutedConfig(config);

    com.constraints = {
      audio: audioSettings.userMedia,
      video: videoSettings.userMedia
    };

    com.config = {
      audio: audioSettings.settings,
      video: audioSettings.settings,
      status: statusSettings
    };

    com.start();

  } else {
    // Allow javascript to return object before code execution
    fn.runSync(function () {
      com.config = {
        audio: fn.isSafe(function () { return stream.getAudioTracks().length > 0; }),
        video: fn.isSafe(function () { return stream.getVideoTracks().length > 0; })
      };
      com.bind(stream);
    });
  }
}