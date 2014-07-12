var DC = require('./index');

var d1 = new DC();
var d2 = new DC();

d1.on('offer', function (offer) {
    d2.setDescription(offer);
    d2.createAnswer();
});
d2.on('answer', function (answer) {
    d1.setDescription(answer);
});
d1.on('candidate', function (candidate) {
    d2.addCandidate(candidate);
});
d2.on('candidate', function (candidate) {
    d1.addCandidate(candidate);
});
d1.on('message', function (data) {
    console.log('message from 2', data);
});
d1.on('open', function () {
    console.log('connected 1->2');
});
d1.on('close', function () {
    console.log('disconnected 1->2');
});
d2.on('message', function (data) {
    console.log('message from 1', data);
});
d2.on('open', function () {
    console.log('connected 2->1');
    this.send('hello, world!');
});
d2.on('close', function () {
    console.log('disconnected 2->1');
});
d1.createOffer();
