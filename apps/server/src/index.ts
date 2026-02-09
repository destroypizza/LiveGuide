import http from "node:http";
import cors from "cors";
import express from "express";
import { Server as SocketIOServer } from "socket.io";
import { readEnv } from "./env.js";
import { ControlService } from "./controlService.js";
import { registerHttpRoutes } from "./httpRoutes.js";
import { registerSocketHandlers } from "./socketHandlers.js";
import { MemoryStore } from "./store/memoryStore.js";

const env = readEnv();

const app = express();
app.use(express.json());
app.use(
  cors({
    origin: env.webOrigin,
    credentials: true
  })
);

const server = http.createServer(app);

const io = new SocketIOServer(server, {
  cors: {
    origin: env.webOrigin,
    methods: ["GET", "POST"]
  }
});

const store = new MemoryStore();
const control = new ControlService(store, io, {
  commandRateLimitMs: env.commandRateLimitMs,
  allowedDurationsSec: [10, 60, 120, 300]
});

registerHttpRoutes(app, store, control);
registerSocketHandlers(io, store, control);

server.listen(env.port, () => {
  // eslint-disable-next-line no-console
  console.log(`[server] listening on http://localhost:${env.port}`);
});

