const express = require('express');
const cors = require('cors');

require('dotenv').config();


const ServanaRouter = require('./routes/profile.js')
const departmentRoutes = require('./routes/department');   

const app = express();
const port = process.env.PORT || 3000;


app.use(express.static("public"));
app.use(cors({origin: true, credentials: true})); // Allow CORS for all origins

app.use(express.json());
app.use('/profile', ServanaRouter);
app.use('/departments', departmentRoutes);
app.listen(port, () => {
    console.log(`Server is running: ${port}`);
});
