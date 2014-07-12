var webrtc;
if (typeof window !== 'undefined') {
    webrtc = window;
} else {
    webrtc = require('wrtc');
}

module.exports = {
    RTCPeerConnection:      webrtc.RTCPeerConnection ||
                            webrtc.mozRTCPeerConnection ||
                            webrtc.webkitRTCPeerConnection,
    RTCIceCandidate:        webrtc.RTCIceCandidate ||
                            webrtc.mozRTCIceCandidate,
    RTCSessionDescription:  webrtc.RTCSessionDescription ||
                            webrtc.mozRTCSessionDescription
};
