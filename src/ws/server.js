import { WebSocket, WebSocketServer } from "ws";

function sendJson(socket, data) {
  if (socket.readyState !== WebSocket.OPEN) {
    return;
  }
  socket.send(JSON.stringify(data));
}

function broadcast(wss, data) {
  for (const client of wss.clients) {
    if (client.readyState !== WebSocket.OPEN) {
      continue;
    }
    try {
      client.send(JSON.stringify(data));
    } catch (error) {
      console.error("Error broadcasting to client:", error);
    }
  }
}

export function attachWebSocketServer(server) {
  const wss = new WebSocketServer({
    server,
    path: "/ws",
    maxPayload: 1024 * 1024,
  });

  wss.on("connection", (socket) => {
    socket.isAlive = true;
    sendJson(socket, { type: "welcome" });

    socket.on("pong", () => {
      socket.isAlive = true;
    });

    socket.on("error", console.error);
  });

  const interval = setInterval(() => {
    wss.clients.forEach((socket) => {
      if (socket.isAlive === false) {
        return socket.terminate();
      }
      socket.isAlive = false;
      socket.ping();
    });
  }, 30000);

  wss.on("close", () => {
    clearInterval(interval);
  });
  function broadcastMatchCreated(match) {
    broadcast(wss, { type: "match-created", match });
  }

  return { broadcastMatchCreated };
}
