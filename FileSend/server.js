var fs = require('fs');
var express = require('express');
var router = express.Router();
var app = express();

var port = 19200;    // port 번호 19200

app.listen(port, function() {
    log_comment('트래커 서버가 시작되었습니다. : ' + port + '번');
});
// 본인의 파일 경로를 작성하세요
app.use('/', express.static('/Users/DingDong/Desktop/SampleSharingSystem/p2p/FileSend'));
router.use('/', function(req, res) {
    res.sendFile('/index.html');
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