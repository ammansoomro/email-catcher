const express = require("express");
const multer = require("multer");
const dotenv = require("dotenv");
const emailHandlerController = require("./src/controllers/emailHandler");

dotenv.config(); 

const app = express();
const port = 3000;

const upload = multer({ storage: multer.memoryStorage() });

app.use("/webhooks/email-handler", upload.any(), emailHandlerController);

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
