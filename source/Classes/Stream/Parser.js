/**
 * Handles the parsing of stream and bandwidth configuration.
 * @attribute StreamParser
 * @type JSON
 * @private
 * @global true
 * @for Stream
 * @since 0.6.0
 */
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
      tempOptions.sourceId = options.sourceId || null;
      tempOptions.mute = typeof options.mute === 'boolean' ? options.mute : false;

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
      tempOptions.sourceId = options.sourceId || null;

      // set the mute options
      tempOptions.mute = typeof options.mute === 'boolean' ? options.mute : false;

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