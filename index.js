var EventEmitter = require('eemitter'),
    extend = require('extend'),
    webrtc = require('./lib/webrtc');

var RTCPeerConnection     = webrtc.RTCPeerConnection;
var RTCIceCandidate       = webrtc.RTCIceCandidate;
var RTCSessionDescription = webrtc.RTCSessionDescription;

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

function RTCDataConnection(config) {
    this.config = extend(true, {}, RTCDataConnection.defaults, config);
    this._createConnection();
}

RTCDataConnection.defaults = {
    reliable: true,
    peerConnection: {
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


RTCDataConnection.prototype.send = function (data) {
    if (this.dataChannel && this.dataChannel.readyState === 'open') {
        this.dataChannel.send(data);
    }
};

RTCDataConnection.prototype.close = function () {
    if (this.dataChannel) {
        this.dataChannel.close();
    }
    this.dataChannel = null;
    this.peerConnection.close();
    this.peerConnection = null;
};

RTCDataConnection.prototype.setDescription = function (description) {
    this.peerConnection.setRemoteDescription(new RTCSessionDescription(description));
};

RTCDataConnection.prototype.addCandidate = function (candidate) {
    this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
};

RTCDataConnection.prototype.createAnswer = function () {
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

RTCDataConnection.prototype.createOffer = function () {
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

RTCDataConnection.prototype._createConnection = function() {
    var dataConnection = this;
    this.peerConnection = new RTCPeerConnection(this.config.peerConnection, this.config.constraints);
    this.peerConnection.addEventListener('icecandidate', function handleICECandidate(event) {
        var candidate = event.candidate;
        if (candidate) {
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

RTCDataConnection.prototype._createDataChannel = function () {
    this.dataChannel = this.peerConnection.createDataChannel('RTCDataConnection', {
        reliable: this.config.reliable
    });
    this._setupDataChannel();
};

RTCDataConnection.prototype._setupDataChannel = function () {
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

RTCDataConnection.prototype._handleMessage = function (data) {
    this.emit('message', data);
};

module.exports = RTCDataConnection;
