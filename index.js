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

const app = express();
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

app.listen(port, () => {
    console.log(`Server is running: ${port}`);
});
