const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser'); // ✅ Required for HTTP-only cookies
require('dotenv').config();

const ServanaRouter = require('./routes/profile.js');
const departmentRoutes = require('./routes/department');   
const adminsRoutes = require('./routes/manageAdmin');
const autoReplies = require('./routes/autoReplies');
const macrosAgentsRoutes = require("./routes/macrosAgents");
const macrosClientsRoutes = require("./routes/macrosClients");
const changeRoleRoutes = require("./routes/changeRole");
const chatModule = require('./routes/chat');
const chatRoutes = chatModule.router; // for routing
const { handleSendMessage } = chatModule; // for socket
const roleRoutes = require("./routes/role");
const manageAgentsRoutes = require('./routes/manageAgents');
const authRoutes = require('./routes/auth'); // ✅ Add Auth Routes

const app = express();
const http = require('http');
const socketIo = require('socket.io');
const port = process.env.PORT || 3000;

// ✅ Middleware
app.use(express.static("public"));
app.use(cors({
  origin: 'http://localhost:5173', // ✅ Change to your domain for production
  credentials: true // ✅ Important for sending cookies
}));
app.use(express.json());
app.use(cookieParser()); // ✅ Required for reading cookies

// ✅ Auth Routes
app.use('/auth', authRoutes); // ✅ Supabase + system_user auth

// ✅ Your Existing Routes
app.use('/profile', ServanaRouter);
app.use('/departments', departmentRoutes);
app.use('/admins', adminsRoutes);
app.use('/auto-replies', autoReplies);
app.use("/agents", macrosAgentsRoutes);
app.use("/clients", macrosClientsRoutes);
app.use("/change-role", changeRoleRoutes);
app.use("/chat", chatRoutes);
app.use("/roles", roleRoutes);
app.use('/manage-agents', manageAgentsRoutes);

// ✅ Socket.IO Setup
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: '*', // ✅ Allow socket connection from any origin
  }
});

io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  socket.on('joinChatGroup', (groupId) => {
    socket.join(groupId);
    console.log(`Socket ${socket.id} joined room ${groupId}`);
  });

  socket.on('sendMessage', async (message) => {
    await handleSendMessage(message, io);
  });

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
