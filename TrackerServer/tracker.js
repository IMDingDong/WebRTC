/*
일시 : 2018년 10월 12일
작성자 : 임대동
설명 : WebRTC에서 Peer들의 정보를 수집하는 Tracker Server
미구현
 - 동일한 token ID의 요청이 반복적(15초)으로 들어올 때 처리
 - 일정 시간(3분)마다 storageList와 analysisList의 배열을 비워서 최신화 or express-session 라이브러리의 세션과 같이 각 객체에 만료 시간(1분)을 부여
*/

// 사용 라이브러리
var express = require('express');
var app = express();
var uuidv1 = require('uuid/v1');

// 전역 변수
var port = 19200;    // port 번호 19200
var storageList = [];
var analysisList = [];

// WebServer 기능
app.listen(port, function() {
    log_comment('트래커 서버가 시작되었습니다. : ' + port + '번');
});

/*
    storage 노드와 analysis 노드가 보고하는 기능

    storage 노드의 report 예제
    http://서버ip주소:19200/report?nodeType=storage&tokenId=tokenId&storageCapacity=storageCapacity

    analysis 노드의 report 예제
    http://서버ip주소:19200/report?nodeType=analysis&tokenId=tokenId
*/
app.get('/report', function(req, res) {
    var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress || req.connection.socket.remoteAddress;
    log_comment(ip + ' 클라이언트의 요청이 들어왔습니다.');

    var query = req.query;
    var tokenId = query.tokenId;    // uuid 라이브러리를 이용한 토큰
    var storageCapacity = query.storageCapacity;
    var nodeType = query.nodeType;

    // storage의 report가 왔을 경우
    if (nodeType === 'storage') {
        storageList.push({
            nodeType: 'storage', 
            address: ip, 
            token: tokenId, 
            capacity: storageCapacity
        });

        log_comment('nodeType 값: ' + nodeType);
        log_comment('tokenId 값 : ' + tokenId);
        log_comment('storageCapacity 값 : ' + storageCapacity);

        res.send('storageReportingSuccess');

        console.dir(storageList);
    }
    // analysis의 report가 왔을 경우
    else if (nodeType === 'analysis') {
        analysisList.push({
            nodeType: 'analysis', 
            address: ip, 
            token: tokenId
        });

        log_comment('nodeType 값: ' + nodeType);
        log_comment('tokenId 값 : ' + tokenId);

        res.send('analysisReportingSuccess');

        console.dir(analysisList);
    }
    // 잘못된 형식의 report가 왔을 경우
    else {
        log_error('invalid report');

        res.send('invalidReportFormat');
    }
});

/*
    시그널링 서버가 정보를 요구하는 기능

    storage 노드의 정보를 요구하는 예제
    http://서버ip주소:19200/requestInfo?nodeType=storage&tokenId=tokenId&targetTokenId=targetTokenId

    analysis 노드의 정보를 요구하는 예제
    http://서버ip주소:19200/requestInfo?nodeType=analysis&tokenId=tokenId&targetTokenId=targetTokenId
*/
app.get('/requestInfo', function(req, res) {
    log_comment("시그널링 서버의 요청이 들어왔습니다.");

    var query = req.query;
    var nodeType = query.nodeType;
    var tokenId = query.tokenId;
    var connectionToken = uuidvi();
    var responseInfo = [];

    responseInfo.push({
        tokenId: tokenId, 
        targetTokenId: targetTokenId, 
        connectionToken : connectionToken
    });

    if (nodeType == 'stoage') {
        
        log_comment('storage 정보 응답');

        res.send(responseInfo);
        res.send('storageInfoRequestSuccess');
    }
    else if (nodeType == 'analysis') {
        
        log_comment('analysis 정보 응답');

        res.send(responseInfo);
        res.send('analysisInfoRequestSuccess');
    }
    else {
        log_error('invalid request');

        res.send('invalidRequestFormat');
    }
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