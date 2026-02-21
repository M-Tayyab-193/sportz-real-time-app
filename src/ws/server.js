import { WebSocket, WebSocketServer } from "ws";
import { wsArcjet } from "../arcjet.js";

const matchSubscriptions = new Map();

function subscribeToMatch(matchId, socket) {
  if (!matchSubscriptions.has(matchId)) {
    matchSubscriptions.set(matchId, new Set());
  }
  matchSubscriptions.get(matchId).add(socket);
}

function unsubscribeFromMatch(matchId, socket) {
  if (matchSubscriptions.has(matchId)) {
    const subscribers = matchSubscriptions.get(matchId);

    if (!subscribers) {
      return;
    }

    if (subscribers.size === 0) {
      matchSubscriptions.delete(matchId);
    }
    subscribers.delete(socket);
  }
}

function cleanupSubscriptions(socket) {
  for (const matchId of socket.subscriptions) {
    unsubscribeFromMatch(matchId, socket);
  }
}

function broadcastToMatch(matchId, data) {
  const subscribers = matchSubscriptions.get(matchId);
  if (!subscribers || subscribers.size === 0) {
    return;
  }

  const message = JSON.stringify(data);
  for (const client of subscribers) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  }
}

function handleMessage(socket, data) {
  let message;

  try {
    message = JSON.parse(data.toString());
  } catch (error) {
    sendJson(socket, { type: "error", error: "Invalid JSON" });
  }

  if (message?.type === "subscribe" && Number.isInteger(message.matchId)) {
    subscribeToMatch(message.matchId, socket);
    socket.subscriptions.add(message.matchId);
    sendJson(socket, { type: "subscribed", matchId: message.matchId });
    return;
  }

  if (message?.type === "unsubscribe" && Number.isInteger(message.matchId)) {
    unsubscribeFromMatch(message.matchId, socket);
    socket.subscriptions.delete(message.matchId);
    sendJson(socket, { type: "unsubscribed", matchId: message.matchId });
    return;
  }
}
function sendJson(socket, data) {
  if (socket.readyState !== WebSocket.OPEN) {
    return;
  }
  socket.send(JSON.stringify(data));
}

function broadcastToAll(wss, data) {
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

    socket.subscriptions = new Set();

    socket.on("message", (data) => handleMessage(socket, data));

    socket.on("close", () => {
      cleanupSubscriptions(socket);
    });

    socket.on("pong", () => {
      socket.isAlive = true;
    });

    socket.on("error", (error) => {
      console.error("WebSocket error:", error);
      socket.terminate();
    });
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
    broadcastToAll(wss, { type: "match-created", match });
  }

  function broadcastCommentary(matchId, comment) {
    broadcastToMatch(matchId, { type: "commentary", data: comment });
  }

  return { broadcastMatchCreated, broadcastCommentary };
}
