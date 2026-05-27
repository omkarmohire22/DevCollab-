import express from "express";
import http from "http";
import cors from "cors";
import dotenv from "dotenv";
import { Server as SocketServer } from "socket.io";

import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/users.js";
import workspaceRoutes from "./routes/workspaces.js";
import projectRoutes from "./routes/projects.js";
import taskRoutes from "./routes/tasks.js";
import snippetRoutes from "./routes/snippets.js";
import wikiRoutes from "./routes/wiki.js";
import notificationRoutes from "./routes/notifications.js";
import invitationRoutes from "./routes/invitations.js";
import paymentRoutes from "./routes/payments.js";
import aiRoutes from "./routes/ai.js";
import inviteRoutes from "./routes/invite.js";

dotenv.config();

const app = express();

const server = http.createServer(app);

/* SOCKET */
const io = new SocketServer(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
  },
});

/* MIDDLEWARE */
app.use(cors());

app.use(express.json());

app.use(
  express.urlencoded({
    extended: true,
  })
);

/* TEST ROUTE */
app.get("/", (req, res) => {
  res.send("Backend running");
});

/* ROUTES */
app.use("/api/auth", authRoutes);

app.use("/api/users", userRoutes);

app.use("/api/workspaces", workspaceRoutes);

app.use("/api/projects", projectRoutes);

app.use("/api/tasks", taskRoutes);

app.use("/api/snippets", snippetRoutes);

app.use("/api/wiki", wikiRoutes);

app.use(
  "/api/notifications",
  notificationRoutes
);

app.use(
  "/api/invitations",
  invitationRoutes
);

app.use("/api/payments", paymentRoutes);
app.use("/api/ai", aiRoutes);

/* IMPORTANT */
app.use("/api", inviteRoutes);

/* SOCKET EVENTS */
io.on("connection", (socket) => {

  console.log("Socket connected");

  socket.on("join-room", (roomId) => {
    socket.join(roomId);
  });
});

/* 404 */
app.use((req, res) => {

  res.status(404).json({
    error: "Not Found",
  });
});

/* ERROR */
app.use((err, req, res, next) => {

  console.error(err);

  res.status(500).json({
    error:
      err.message ||
      "Server error",
  });
});

/* START */
const port =
  process.env.PORT || 4000;

server.listen(port, "0.0.0.0", () => {
  console.log(`DevCollab backend listening on port ${port}`);
});