const express = require("express");
const cors = require('cors')
require("dotenv").config();

const routes = require('./routes')
const connectDB = require('./db');
const { DEFAULT_PORT } = require("./config");
const { updatePairs } = require("./utils");

// express
const app = express();
// body parser
app.use(express.json());
app.use(cors())
// router
app.use('/', routes)
// connect to database
connectDB()

updatePairs()

app.listen(3000, () => {
    console.log(`Server is running on 3000`);
});
