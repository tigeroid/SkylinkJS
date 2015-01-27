/**
 * Handles the parsing of Stream / Bandwidth settings.
 * @attribute StreamParser
 * @for Skylink
 * @since 0.6.0
 */
var StreamParser = {
  /**
   * Stores the default Stream / Bandwidth settings.
   * @property defaultConfig
   * @param {JSON} audio The default audio settings.
   * @param {Boolean} audio.stereo The default flag to indicate if stereo is enabled.
   * @param {JSON} video The default video settings.
   * @param {JSON} video.resolution The default video resolution.
   * @param {Integer} video.resolution.width The default video resolution width.
   * @param {Integer} video.resolution.height The default video resolution height.
   * @param {Integer} video.frameRate The default video maximum framerate.
   * @param {JSON} bandwidth The default bandwidth streaming settings.
   * @param {Integer} bandwidth.audio The default audio bandwidth bitrate.
   * @param {Integer} bandwidth.video The default video bandwidth bitrate.
   * @param {Integer} bandwidth.data The default DataChannel data bandwidth bitrate.
   * @type JSON
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
   * Parses the audio configuration for the getUserMedia constraints.
   * @property parseAudioConfig
   * @param {JSON|Boolean} options The audio settings or flag if audio is enabled.
   * @param {Boolean} options.stereo The flag to indicate if stereo is enabled.
   * @type Function
   * @return {JSON}
   * - options: The configuration.
   * - userMedia: The getUserMedia constraints.
   * @private
   * @since 0.6.0
   */
  parseAudioConfig: function (options) {
    options = (typeof options === 'object') ? options : !!options;

    // Cleaning of unwanted keys
    if (options !== false) {
      options = (typeof options === 'boolean') ? {} : options;
      var tempOptions = {};
      tempOptions.stereo = !!options.stereo;
      options = tempOptions;
    }

    var userMedia = (typeof options === 'object') ?
      true : options;

    // Add video sourceId
    if (tempOptions.sourceId && tempOptions.audio === true) {
      userMedia = { optional: [{ sourceId: tempOptions.sourceId }] };
    }

    return {
      settings: options,
      userMedia: userMedia
    };
  },
  
  /**
   * Parses the video configuration for the getUserMedia constraints.
   * @property parseVideoConfig
   * @param {JSON} options The video settings.
   * @param {JSON} options.resolution The video resolution.
   * @param {Integer} options.resolution.width The video resolution width.
   * @param {Integer} options.resolution.height The video resolution height.
   * @param {Integer} options.frameRate The video maximum framerate.
   * @type Function
   * @return {JSON}
   * - options: The configuration.
   * - userMedia: The getUserMedia constraints.
   * @private
   * @since 0.6.0
   */
  parseVideoConfig: function (options) {
    options = (typeof options === 'object') ?
    options : !!options;

    var userMedia = false;

    // Cleaning of unwanted keys
    if (options !== false) {
      options = (typeof options === 'boolean') ?
        { resolution: {} } : options;
      
      var tempOptions = {};
      
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
   * - In low-bandwidth environment, it's mostly managed by the browser.
   *   However, this option enables you to set low bandwidth for high-bandwidth
   *   environment whichever way is possible.
   * @property parseBandwidthConfig
   * @param {JSON} options The bandwidth streaming settings.
   * @param {Integer} options.audio The audio bandwidth bitrate.
   * @param {Integer} options.video The video bandwidth bitrate.
   * @param {Integer} options.data The DataChannel data bandwidth bitrate.
   * @type Function
   * @return {JSON}
   * - options: The configuration.
   * - userMedia: The getUserMedia constraints.
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
   * @property parseMutedConfig
   * @param {JSON} options The stream muted settings.
   * @param {Integer} options.audioMuted The flag to indicate if audio stream is muted.
   * @param {Integer} options.videoMuted The flag to indicate if video stream is muted.
   * @type Function
   * @return {JSON}
   * - options: The configuration.
   * - userMedia: The getUserMedia constraints.
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