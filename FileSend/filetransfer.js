'use strict';

let localConnection;
let sendChannel;
let receiveChannel;
let fileReader;

const fileInput = document.querySelector('input#fileInput');
const downloadAnchor = document.querySelector('a#download');
const sendProgress = document.querySelector('progress#sendProgress');
const statusMessage = document.querySelector('span#status');
const sendFileButton = document.querySelector('button#sendFile');

let receiveBuffer = [];
let receivedSize = 0;

// Signaling 서버 설정
const configuration = {
  iceServers: [{
    url: 'stun:stun.l.google.com:19302'    // Google 공개 STUN 서버
  }]
};

// 랜덤으로 방 번호 생성 및 해쉬 값 설정
// TODO: 받는 Peer의 peerId로 방 번호 설정
if (!location.hash) {
  location.hash = Math.floor(Math.random() * 0xFFFFFF).toString(16);
}
const chatHash = location.hash.substring(1);

// TODO: Channel ID 변경
const drone = new ScaleDrone('yiS12Ts5RdNhebyM');
// Scaledrone room name needs to be prefixed with 'observable-'
const roomName = 'observable-' + chatHash;
// Signaling에 사용되는 방 번호
let room;

// Signaling 서버에 접속하는 것을 대기
drone.on('open', error => {
  if (error) {
    return console.error(error);
  }
  room = drone.subscribe(roomName);
  room.on('open', error => {
    if (error) {
      return console.error(error);
    }
    console.log('Connected to signaling server');
  });
  // We're connected to the room and received an array of 'members'
  // connected to the room (including us). Signaling server is ready.
  room.on('members', members => {
    if (members.length >= 3) {
      return alert('The room is full');
    }
    // 두번째 참가자가 방에 접속했을 때 Offer를 생성
    var _isOfferer = members.length === 2;
    createConnection(_isOfferer);
  });
});

// scaledrone에 보낼 시그널 메시지 전송
function sendSignalingMessage(message) {
  drone.publish({
    room: roomName,
    message
  });
}

// file이 정상적으로 선택됐는지 확인 후 전송 버튼 활성화
fileInput.addEventListener('change', handleFileInputChange, false);
async function handleFileInputChange() {
  let file = fileInput.files[0];
  if (!file) {
    console.log('No file chosen');
  } else {
    sendFileButton.disabled = false;
  }
}

// RTCPeerConnection 생성
function createConnection(_isOfferer) {
  sendFileButton.disabled = true;
  console.log('Starting WebRTC in as', _isOfferer ? 'offerer' : 'waiter');
  localConnection = new RTCPeerConnection(configuration);
  console.log('Created local peer connection object localConnection');

  // Remote Peer에게 candidate를 전송
  localConnection.onicecandidate = event => {
    if (event.candidate) {
      sendSignalingMessage({'candidate': event.candidate});
      console.log(event.candidate);
    }
  };

  // 두번째 Peer
  if (_isOfferer) {
    localConnection.onnegotiationneeded = () => {
      localConnection.createOffer(localDescCreated, error => console.error(error));
    }
    sendChannel = localConnection.createDataChannel('sendDataChannel');
    sendChannel.binaryType = 'arraybuffer';
    console.log('Created send data channel');

    onSendChannelStateChange();
    sendChannel.addEventListener('open', onSendChannelStateChange);
    sendChannel.addEventListener('close', onSendChannelStateChange);
    sendChannel.addEventListener('error', error => console.error('Error in sendChannel:', error));
    sendChannel.onmessage = event =>
      receiveFile(event.data);
  }
  // 첫번째 Peer
  else {
    localConnection.ondatachannel = event => {
      sendChannel = event.channel;
      //onSendChannelStateChange();
      sendChannel.addEventListener('open', onSendChannelStateChange);
      sendChannel.addEventListener('close', onSendChannelStateChange);
      sendChannel.addEventListener('error', error => console.error('Error in sendChannel:', error));
      sendChannel.onmessage = event =>
        receiveFile(event.data);
    }
  }
  startListentingToSignals();
}

// listen Signal
function startListentingToSignals() {
  // Listen to signaling data from Scaledrone
  room.on('data', (message, client) => {
    // Message was sent by us
    if (client.id === drone.clientId) {
      return;
    }
    if (message.sdp) {
      console.log(message.sdp);
      // This is called after receiving an offer or answer from another peer
      localConnection.setRemoteDescription(new RTCSessionDescription(message.sdp), () => {
        console.log('localConnection.remoteDescription.type', localConnection.remoteDescription.type);
        // When receiving an offer lets answer it
        if (localConnection.remoteDescription.type === 'offer') {
          console.log('Answering offer');
          localConnection.createAnswer(localDescCreated, error => console.error(error));
        }
      }, error => console.error(error));
    } else if (message.candidate) {
      // Add the new ICE candidate to our connections remote description
      localConnection.addIceCandidate(new RTCIceCandidate(message.candidate));
    }
  });
}

function localDescCreated(desc) {
  localConnection.setLocalDescription(
    desc,
    () => sendSignalingMessage({'sdp': localConnection.localDescription}),
    error => console.error(error)
  );
}

// 파일 전송
function sendData() {
  const file = fileInput.files[0];
  console.log(`File is ${[file.name, file.size, file.type, file.lastModified].join(' ')}`);

  // Handle 0 size files.
  statusMessage.textContent = '';
  downloadAnchor.textContent = '';
  if (file.size === 0) {
    statusMessage.textContent = 'File is empty, please select a non-empty file';
    closeDataChannels();
    return;
  }
  sendProgress.max = file.size;

  const chunkSize = 16384;    // 16kb
  fileReader = new FileReader();
  let offset = 0;
  fileReader.addEventListener('error', error => console.error('Error reading file:', error));
  fileReader.addEventListener('load', e => {
    console.log('FileRead.onload ', e);
    sendChannel.send(e.target.result);
    offset += e.target.result.byteLength;
    sendProgress.value = offset;
    if (offset < file.size) {
      readSlice(offset);
    }
  });
  const readSlice = o => {
    console.log('readSlice ', o);
    const slice = file.slice(offset, o + chunkSize);
    fileReader.readAsArrayBuffer(slice);
  };
  readSlice(0);
}

function receiveFile(data) {
  console.log(data);
  const readyState = sendChannel.readyState;
  if (readyState === 'open') {
    console.log(`Received Message ${data.byteLength}`);
    receiveBuffer.push(data);
    receivedSize += data.byteLength;

  const chunk = 16384;
  if (chunk > data.byteLength) {
    const received = new Blob(receiveBuffer);
    receiveBuffer = [];

    downloadAnchor.href = URL.createObjectURL(received);
    downloadAnchor.download = 'test.png';
    downloadAnchor.textContent = 'Click to download';
    downloadAnchor.style.display = 'block';

    closeDataChannels();
  }
  } else {
  }
}

function closeDataChannels() {
  console.log('Closing data channels');
  sendChannel.close();
  console.log(`Closed data channel with label: ${sendChannel.label}`);
  if (receiveChannel) {
    receiveChannel.close();
    console.log(`Closed data channel with label: ${receiveChannel.label}`);
  }
  localConnection.close();
  localConnection = null;
  console.log('Closed peer connections');

  // re-enable the file select
  fileInput.disabled = false;
  sendFileButton.disabled = false;
}

function onSendChannelStateChange() {
  const readyState = sendChannel.readyState;
  console.log(`Send channel state is: ${readyState}`);
}

sendFileButton.addEventListener('click', () => {
  /*
  const data = {
    name
  };
  sendChannel.send(JSON.stringify(data));
  */

  sendData();
});