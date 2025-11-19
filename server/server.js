require("dotenv").config();
const express = require("express");
const path = require("path");
const PORT = process.env.PORT || 5000;
const cors = require("cors");
const router = require("./routes/index");
const ErrorHandlingMiddleware = require("./middleware/ErrorHandlingMiddleware");

const app = express();
app.use(cors());
app.use(express.json());
app.use("/api", router);
app.use(ErrorHandlingMiddleware);

app.listen(PORT, () => {
  console.log(`Server is up and running on ${PORT} ...`);
});
