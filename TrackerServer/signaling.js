/*
일시 : 2018년 10월 12일
작성자 : 임대동
설명 : WebRTC Signaling Server
*/

// socket.io를 이용해 시그널링 과정을 거치는 서버

// 사용 라이브러리
var app = require('express')();
var http = require('http');
var server = http.createServer(app);
var io = require('socket.io')(server);    // http server를 socket.io Server로 upgrade

// 전역 변수
var port = 39200;    // port 번호 39200
var webrtc_clients = [];
var webrtc_discussions = [];

// WebServer 기능
server.listen(port, function() {
    log_comment('시그널링 서버가 시작되었습니다. : ' + port + '번');
});

io.on('connection', function(socket) {    // connection이 수립되면 event handler function의 인자로 socket이 들어온다
    var requestUrl = 'http://서버ip주소:19200/requestInfo?' + 'nodeType=' + 'storage' + '&tokenId=' + tokenId + '&targetTokenId=' + targetTokenId;

    log_comment('웹 소켓 서버에 연결되었습니다.');
    socket.on('message', function(message) {
        if (message.type === 'utf-8') {
            var signal = undefined;
            try {
                signal = JSON.parse(message.utf8Data);
            } catch(e) {
                log_error('Json 파싱 오류');
            };
            if (signal) {
                if (signal.type === 'Join' && signal.token !== undefined) {
                    try {
                        if (webrtc_discussions[signal.token] === undefined) {
                            webrtc_discussions[signal.token] = {};
                        }
                    } catch(e) {
                        log_error('webrtc_discussions[signal.token] 객체 생성 Error Occurred');
                    };

                    try {
                        webrtc_discussions[signal.token][socket.id] = true;
                    } catch(e) {
                        log_error('Error Occurred');
                    };
                } else if (signal.token !== undefined) {
                    try {
                        Object.keys(webrtc_discussions[signal.token]).forEach(function(id) {
                            if (id != connection.id) {
                                webrtc_clients[id].send(message.utf8Data);
                            }
                        });
                    } catch(e) {
                        log_error('Error Occurred');
                    };
                } else {
                    log_error('invalid signal');
                }
            } else {
                log_error('invalid signal');
            }
        }
    });

    // Connection Close
    socket.on('close', function(socket) {
        log_comment("Connection Closed (" + socket.remote + ")");  
        Object.keys(webrtc_discussions).forEach(function(token) {
            Object.keys(webrtc_discussions[token]).forEach(function(id) {
                if (id === socket.id) {
                    delete webrtc_discussions[token][id];
                }
            });
        });
    });
});

// Error Logging 기능
function log_error(error) {
    if (error !== undefined) {
        log_comment("ERROR: " + error);
    }
}

function log_comment(comment) {
    console.log((new Date()) + " " + comment);
}

// 시그널링이 성공했을 때 추가할 코드
// var msg = 'signaling success';
// socket.emit('success', msg);