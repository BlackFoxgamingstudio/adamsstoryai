import WebSocketClient from './WebSocketClient';

let wsClient = null;

export const initSocket = () => {
  if (!wsClient) {
    wsClient = new WebSocketClient();
  }
  return wsClient;
};

export const getSocket = () => {
  if (!wsClient) {
    wsClient = initSocket();
  }
  return wsClient;
};

export const closeSocket = () => {
  if (wsClient) {
    wsClient.close();
    wsClient = null;
  }
};

export const addMessageHandler = (handler) => {
  const socket = getSocket();
  socket.addMessageHandler(handler);
  return () => socket.removeMessageHandler(handler);
};

export const sendMessage = (message) => {
  const socket = getSocket();
  socket.sendMessage(message);
};

export default {
  initSocket,
  getSocket,
  closeSocket,
  addMessageHandler,
  sendMessage,
}; 