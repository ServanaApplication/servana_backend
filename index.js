const express = require('express');
const cors = require('cors');

require('dotenv').config();


const ServanaRouter = require('./routes/profile.js')
const departmentRoutes = require('./routes/department');   
const adminsRoutes = require('./routes/manageAdmin');
const autoReplies = require('./routes/autoReplies');
const macrosAgentsRoutes = require("./routes/macrosAgents");
const macrosClientsRoutes = require("./routes/macrosClients");

const app = express();
const port = process.env.PORT || 3000;


app.use(express.static("public"));
app.use(cors({origin: true, credentials: true})); // Allow CORS for all origins

app.use(express.json());
app.use('/profile', ServanaRouter);
app.use('/departments', departmentRoutes);
app.use('/admins', adminsRoutes);
app.use('/auto-replies', autoReplies);
app.use("/agents", macrosAgentsRoutes);
app.use("/clients", macrosClientsRoutes);

app.listen(port, () => {
    console.log(`Server is running: ${port}`);
});
