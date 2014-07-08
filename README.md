# RTC Data Connection

A slightly simplified and smoothed-over wrapper around the native WebRTC peer connection and data channels APIs. This is for data connections only - no audio/video streams. See [simple-rtc-data-connection](https://github.com/lakenen/simple-rtc-data-connection) for an even simpler version and example stuffs.


## Installation

```
npm install rtc-data-connection
```


## Usage

```
var RTCDataConnection = require('rtc-data-connection');
var dataConnection = new RTCDataConnection();

dataConnection.on('offer', function (offer) {
    // send offer to peer
    socket.emit('offer', offer);
})
dataConnection.on('answer', function (answer) {
    // send answer to peer
    socket.emit('answer', answer);
})
dataConnection.on('candidate', function (candidate) {
    // send candidate to peer
    socket.emit('candidate', candidate);
})
dataConnection.on('open', function () {
    // connection opened!
    this.send('hello, world!');
})

// assume a websocket signaling server
socket.on('offer', function (offer) {
    // set local description and create an answer
    dataConnection.setDescription(offer);
    dataConnection.createAnswer();
});
socket.on('answer', function (answer) {
    dataConnection.setDescription(answer);
});
socket.on('candidate', function (candidate) {
    dataConnection.addCandidate(candidate);
});

// someone needs to be the first to offer...
dataConnection.createOffer();

```


## License

([The MIT License](LICENSE))

Copyright 2014 Cameron Lakenen
