import { WebSocket, WebSocketServer } from "ws";
import { wsArcjet } from "../arcjet.js";

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

  wss.on("connection", async (socket, req) => {
    if (wsArcjet) {
      try {
        const decision = await wsArcjet.protect(req);
        if (decision.isDenied()) {
          const code = decision.reason.isRateLimit() ? 1013 : 1008; // 1013: Try Again Later, 1008: Policy Violation

          const reason = decision.reason.isRateLimit()
            ? "Rate limit exceeded"
            : "Forbidden: Access denied by Arcjet";
          socket.close(code, reason);
          return;
        }
      } catch (error) {
        console.error("Error in Arcjet WebSocket protection:", error);
        socket.close(1011, "Server Security Error");
        return;
      }
    }
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
