import AgentAPI from "apminsight";
AgentAPI.config();
import express from "express";
import matchRouter from "#routes/matches.routes.js";
import commentaryRouter from "#routes/commentary.routes.js";
import http from "http";
import { attachWebSocketServer } from "#ws/server.js";
import { securityMiddleware } from "./arcjet.js";

const app = express();
const server = http.createServer(app);

const HOST = process.env.HOST || "0.0.0.0";
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "Welcome to the Sportz API!" });
});

app.use(securityMiddleware());
app.use("/matches", matchRouter);
app.use("/matches/:id/commentary", commentaryRouter);
const { broadcastMatchCreated, broadcastCommentary } =
  attachWebSocketServer(server);
app.locals.broadcastMatchCreated = broadcastMatchCreated;
app.locals.broadcastCommentary = broadcastCommentary;
server.listen(PORT, HOST, () => {
  const baseUrl =
    HOST === "0.0.0.0" ? `http://localhost:${PORT}` : `http://${HOST}:${PORT}`;

  console.log(`HTTP Server is listening at ${baseUrl}`);
  console.log(
    `WebSocket Server is available at ${baseUrl.replace("http", "ws")}/ws`,
  );
});

export default app;
