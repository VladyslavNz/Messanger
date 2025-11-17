require("dotenv").config();
const express = require("express");
const path = require("path");
const PORT = process.env.PORT || 5000;
const cors = require("cors");
const router = require("./routes/index");

const app = express();
app.use(cors());
