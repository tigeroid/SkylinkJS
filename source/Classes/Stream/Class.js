function Stream(stream, config, listener) {
  'use strict';

  // Prevent undefined listener error
  listener = listener || function (event, data) {};

  // Reference of instance
  var com = this;

  /* Attributes */
  com.id = null;
  com._constraints = null;
  com.config = config;
  com.sourceType = 'local';
  com._MediaStream = null;


  /* Methods */
  com._parentHandler = function () {};

  com._handler = function (event, data) {
    StreamHandler(com, event, data, listener);

    if (typeof com._parentHandler === 'function') {
      com._parentHandler(event, data);
    }
  };

  com._bind = function (bind) {

    com.id = fn.generateUID();

    // Bind events to MediaStream
    // Un-implemented events functions
    // bindStream.onaddtrack = function () { };
    // bindStream.onremovetrack = function () { };

    StreamPolyfill.stop(bind);

    bind.onended = function (event) {
      com._handler('stream:stop', {
        label: stream.label,
        constraints: com.constraints,
        sourceType: com.sourceType
      });
    };

    // Bind track events
    com._bindTracks(bind.getAudioTracks());
    com._bindTracks(bind.getVideoTracks());

    com._MediaStream = bind;

    com._handler('stream:start', {
      label: bind.label,
      constraints: com.constraints,
      sourceType: com.sourceType
    });
  };

  com._bindTracks = function (bindTracks) {
    var i;

    // Passing jshint (Don't make functions within a loop)
    var onended = function (track) {
      return function () {
        com._handler('stream:track:stop', {
          trackId: track.newId,
          kind: track.kind,
          label: track.label,
          enabled: track.enabled,
          sourceType: com.sourceType
        });
      };
    };

    var onmute = function (track) {
      return function () {
        com._handler('stream:track:mute', {
          trackId: track.newId,
          kind: track.kind,
          label: track.label,
          enabled: track.enabled,
          sourceType: com.sourceType
        });
      };
    };

    var onunmute = function (track) {
      return function () {
        com._handler('stream:track:unmute', {
          trackId: track.newId,
          kind: track.kind,
          label: track.label,
          enabled: track.enabled,
          sourceType: com.sourceType
        });
      };
    };

    for (i = 0; i < bindTracks.length; i += 1) {
      var track = bindTracks[i];

      track.newid = fn.generateUID();

      // Bind events to MediaStreamTrack
      // Un-implemented events functions
      // track.onstarted = function () { };
      // track.onoverconstrained = function(event) {};

      StreamPolyfill.track.stop(track);
      StreamPolyfill.track.mute(track);
      StreamPolyfill.track.unmute(track);

      track.onended = onended(track);
      track.onmute = onmute(track);
      track.onunmute = onunmute(track);

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

      com._handler('stream:track:start', {
        trackId: track.newid,
        kind: track.kind,
        label: track.label,
        enabled: track.enabled,
        sourceType: com.sourceType
      });
    }
  };

  com.attachElement = function (element) {
    StreamPolyfill.attachMediaStream(element, com._MediaStream);
  };

  com.muteAudio = function () {
    var tracks = com._MediaStream.getAudioTracks();
    var i;

    for (i = 0; i < tracks.length; i += 1) {
      var track = tracks[i];
      track.polymute();
    }
  };

  com.unmuteAudio = function () {
    var tracks = com._MediaStream.getAudioTracks();
    var i;

    for (i = 0; i < tracks.length; i += 1) {
      var track = tracks[i];
      track.polyunmute();
    }
  };

  com.stopAudio = function () {
    var tracks = com._MediaStream.getAudioTracks();
    var i;

    for (i = 0; i < tracks.length; i += 1) {
      var track = tracks[i];
      track.polystop();
    }
  };

  com.muteVideo = function () {
    var tracks = com._MediaStream.getVideoTracks();
    var i;

    for (i = 0; i < tracks.length; i += 1) {
      var track = tracks[i];
      track.polymute();
    }
  };

  com.unmuteVideo = function () {
    var tracks = com._MediaStream.getVideoTracks();
    var i;

    for (i = 0; i < tracks.length; i += 1) {
      var track = tracks[i];
      track.polyunmute();
    }
  };

  com.stopVideo = function () {
    var tracks = com._MediaStream.getVideoTracks();
    var i;

    for (i = 0; i < tracks.length; i += 1) {
      var track = tracks[i];
      track.polystop();
    }
  };

  com.stop = function () {
    // Stop MediaStream tracks
    com.stopVideo();
    com.stopAudio();
    // Stop MediaStream
    com._MediaStream.polystop();
  };


  /* Event Handlers */
  com.onstart = function () {};
  com.onerror = function () {};
  com.ontrackstart = function () {};
  com.ontrackstop = function () {};
  com.ontrackmute = function () {};
  com.ontrackunmute = function () {};
  com.onstop = function () {};


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
    window.getUserMedia(com.constraints, com._bind, function (error) {
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