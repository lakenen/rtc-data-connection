var EventEmitter = require('eemitter');
var global = window || this;
var RTCPeerConnection     = global.RTCPeerConnection ||
                            global.mozRTCPeerConnection ||
                            global.webkitRTCPeerConnection;
var RTCIceCandidate       = global.RTCIceCandidate ||
                            global.mozRTCIceCandidate;
var RTCSessionDescription = global.RTCSessionDescription ||
                            global.mozRTCSessionDescription;

// borrowed from https://github.com/HenrikJoreteg/RTCPeerConnection
function applySdpHack(sdp) {
    var parts = sdp.split('b=AS:30');
    if (parts.length === 2) {
        // increase max data transfer bandwidth to 100 Mbps
        return parts[0] + 'b=AS:102400' + parts[1];
    } else {
        return sdp;
    }
}

function RTCDataConnection() {
    // todo: extend config
    this.config = RTCDataConnection.defaults;
    this._createConnection();
}

RTCDataConnection.defaults = {
    reliable: true,
    pcConfig: {
        iceServers: [
            { url: 'stun:stun.l.google.com:19302' }
        ]
    },
    constraints: {
        optional: [{
            DtlsSrtpKeyAgreement: true
        }],
        mandatory: {
            OfferToReceiveAudio: false,
            OfferToReceiveVideo: false
        }
    }
};

RTCDataConnection.prototype = Object.create(EventEmitter.prototype);
RTCDataConnection.prototype.constructor = RTCDataConnection;

var RTCDataConnectionProto = RTCDataConnection.prototype;

RTCDataConnectionProto.send = function (data) {
    if (this.dataChannel && this.dataChannel.readyState === 'open') {
        this.dataChannel.send(data);
    }
};

RTCDataConnectionProto.close = function () {
    if (this.dataChannel) {
        this.dataChannel.close();
    }
    this.peerConnection.close();
};

RTCDataConnectionProto.setDescription = function (description) {
    this.peerConnection.setRemoteDescription(new RTCSessionDescription(description));
};

RTCDataConnectionProto.addCandidate = function (candidate) {
    this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
};

RTCDataConnectionProto.createAnswer = function () {
    var dataConnection = this,
        peerConnection = this.peerConnection;
    function createAnswerSuccess(description) {
        description.sdp = applySdpHack(description.sdp);
        var sessionDescription = new RTCSessionDescription(description);
        peerConnection.setLocalDescription(sessionDescription);
        dataConnection.emit('answer', description);
    }
    function createAnswerFail() {
        dataConnection.emit('error', new Error('could not create answer'));
    }
    this.peerConnection.createAnswer(
        createAnswerSuccess,
        createAnswerFail,
        dataConnection.config.constraints
    );
};

RTCDataConnectionProto.createOffer = function () {
    // create a data channel for use with this offer
    var dataConnection = this,
        peerConnection = this.peerConnection;

    function createOfferSuccess(description) {
        description.sdp = applySdpHack(description.sdp);
        var sessionDescription = new RTCSessionDescription(description);
        peerConnection.setLocalDescription(sessionDescription);
        dataConnection.emit('offer', description);
    }
    function createOfferFail() {
        dataConnection.emit('error', new Error('could not create offer'));
    }

    // the offering peer creates the datachannel
    this._createDataChannel();
    peerConnection.createOffer(
        createOfferSuccess,
        createOfferFail,
        dataConnection.config.constraints
    );
};

RTCDataConnectionProto._createConnection = function() {
    var dataConnection = this,
        peerConnection = this.peerConnection;
    this.peerConnection = new RTCPeerConnection(this.config.pcConfig, this.config.constraints);
    this.peerConnection.addEventListener('icecandidate', function handleICECandidate(event) {
        var candidate = event.candidate;
        if (candidate) {
            // firefox can't JSON.stringify mozRTCIceCandidate objects...
            if (global.mozRTCPeerConnection) {
                candidate = {
                    sdpMLineIndex: candidate.sdpMLineIndex,
                    sdpMid: candidate.sdpMid,
                    candidate: candidate.candidate
                };
            }
            dataConnection.emit('candidate', candidate);
        }
    });

    this.peerConnection.addEventListener('iceconnectionstatechange', function handleICEConnectionStateChange() {
        switch (this.iceConnectionState) {
            case 'connected':
                dataConnection.emit('connect');
                break;

            case 'closed':
            case 'disconnected':
                if (dataConnection.dataChannel) {
                    dataConnection.dataChannel.close();
                }
                break;
        }
    });

    this.peerConnection.addEventListener('datachannel', function handleDataChannel(event) {
        if (event.channel) {
            dataConnection.dataChannel = event.channel;
            dataConnection._setupDataChannel();
        }
    });
};

RTCDataConnectionProto._createDataChannel = function () {
    this.dataChannel = this.peerConnection.createDataChannel('RTCDataConnection', {
        reliable: this.config.reliable
    });
    this._setupDataChannel();
};

RTCDataConnectionProto._setupDataChannel = function () {
    var dataConnection = this;
    this.dataChannel.addEventListener('open', function () {
        dataConnection.emit('open');
    });
    this.dataChannel.addEventListener('close', function () {
        dataConnection.emit('close');
    });
    this.dataChannel.addEventListener('message', function (event) {
        dataConnection._handleMessage(event.data);
    });
};

RTCDataConnectionProto._handleMessage = function (data) {
    this.emit('message', data);
};

module.exports = RTCDataConnection;
