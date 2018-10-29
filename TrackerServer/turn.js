/*
일시 : 2018년 10월 10일
작성자 : 임대동
설명 : WebRTC TURN Server
*/

// NAT아래의 Private IP를 Public IP로 변환하기 위한 STUN Server
// STUN Server을 이용해 통신이 실패했을 경우 Peer들간의 통신을 중계하기 위한 TURN Server

// 전역 변수
var port = 29200;    // port 번호 29200
