/*
일시 : 2018년 10월 10일
작성자 : 임대동
설명 : Signaling Server과 통신하는 송신자 측 코드
*/

// signal 핸들러
function caller_signal_handler(event) {
    var signal = JSON.parse(event.data);
    if (signal.type === "caller_arrived") {
        peer_connection.createOffer (
            new_description_created,
            log_error
        );
    }
}

// description 정보 생성 및 Signaling 서버에 정보 전송
function new_description_created(description) {
    peer_connection.setLocalDescription(
        description,
        function () {
            signaling_server.send(
                JSON.stringify({
                    call_token:call_token,    // webrtc_discussions의 인덱스 값으로 사용
                    type:"new_description",
                    sdp:description
                })
            );
        },
        log_error
    );
}