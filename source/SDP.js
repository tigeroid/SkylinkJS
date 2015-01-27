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
        sdpLines.splice(audioLine[0], 1, audioLine[1], 'b=AS:' + bandwidth.audio);
      }
      
      if (bandwidth.video) {
        var videoLine = this.find(sdpLines, ['a=video', 'm=video']);
        sdpLines.splice(videoLine[0], 1, videoLine[1], 'b=AS:' + bandwidth.video);
      }
      
      if (bandwidth.data && this._enableDataChannel) {
        var dataLine = this.find(sdpLines, ['a=application', 'm=application']);
        sdpLines.splice(dataLine[0], 1, dataLine[1], 'b=AS:' + bandwidth.data);
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
  }
};