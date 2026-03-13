require("dotenv").config();
const express = require("express");
const path = require("path");
const PORT = process.env.PORT || 5000;
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const router = require("./routes/index");
const ErrorHandlingMiddleware = require("./middleware/ErrorHandlingMiddleware");
const socketAuthMiddleware = require("./middleware/socketAuthMiddleware");
const cookieParser = require("cookie-parser");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true,
  },
});
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  }),
);
app.use(express.json());
app.use(cookieParser());
app.use((req, res, next) => {
  req.io = io;
  next();
});
app.use("/api", router);
app.use(ErrorHandlingMiddleware);
io.use(socketAuthMiddleware);

const onlineUsers = new Map();

io.on("connection", (socket) => {
  const userId = socket.user.id;
  const username = socket.user.username;

  onlineUsers.set(userId, socket.id);
  socket.join(userId.toString());
  io.emit("user_online", { userId });

  console.log(`User connected: ${username} (${socket.id})`);

  const joinRoom = (roomId) => {
    socket.join(roomId);
    console.log(`User ${username} joined room: ${roomId}`);
  };
  socket.on("join_room", joinRoom);
  socket.on("join_chat", joinRoom);

  socket.on("typing", (roomId) => {
    socket.to(roomId).emit("user_typing", {
      userId: userId,
      username: username,
    });
  });

  socket.on("stop_typing", (roomId) => {
    socket.to(roomId).emit("user_stop_typing", { userId: userId });
  });

  socket.on("mark_as_read", async ({ roomId, chatId }) => {
    try {
      const targetRoomId = roomId ?? chatId;
      const intRoomId = Number(targetRoomId);

      await prisma.messages.updateMany({
        where: {
          chat_id: intRoomId,
          sender_id: { not: userId },
          isRead: false,
        },
        data: {
          isRead: true,
        },
      });

      socket.to(targetRoomId).emit("message_read", {
        roomId: targetRoomId,
        chatId: targetRoomId,
      });
    } catch (e) {
      console.log("Error marking message as read:", e);
    }
  });

  socket.on("disconnect", () => {
    onlineUsers.delete(userId);

    io.emit("user_offline", { userId });
    console.log("User disconnected", userId);
  });
});

server.listen(PORT, () => {
  console.log(`Server is up and running on ${PORT} ...`);
});
