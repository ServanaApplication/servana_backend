const express = require('express');
const cors = require('cors');

require('dotenv').config();


const ServanaRouter = require('./routes/profile.js')
const departmentRoutes = require('./routes/department.js');   
const adminsRoutes = require('./routes/manageAdmin.js');
const autoReplies = require('./routes/autoReplies.js');
const macrosAgentsRoutes = require("./routes/macrosAgents.js");
const macrosClientsRoutes = require("./routes/macrosClients.js");
const changeRoleRoutes = require("./routes/changeRole.js");

const app = express();
const port = process.env.PORT || 3000;


app.use(express.static("public"));
app.use(cors(corsOptions));
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
