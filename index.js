const express = require('express');
const cors = require('cors');
require('dotenv').config();


const ServanaRouter = require('./routes/profile.js')
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



const app = express();
const http = require('http');
const socketIo = require('socket.io');
const port = process.env.PORT || 3000;


app.use(express.static("public"));
app.use(cors({ origin: '*' }));
app.use(express.json());
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


// app.listen(port, () => {
//     console.log(`Server is running: ${port}`);
// });



// websocket setup ////////////////////////////////////////////////////////

const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: '*',
  }
});

// Socket.IO logic
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  socket.on('joinChatGroup', (groupId) => {
    socket.join(groupId);
    console.log(`Socket ${socket.id} joined room ${groupId}`);
  });

  socket.on('sendMessage', async (message) => {
  await handleSendMessage(message, io); // ✅ Delegate to the module
});



  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});