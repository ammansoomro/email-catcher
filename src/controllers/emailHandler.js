const express = require("express");
const router = express.Router();
const saveEmailToFolder = require("../utils/emailSaver");
const extractDataFromFilePath = require("../utils/fileExtractor");
const generateWithClaude = require("../services/aiService");

router.post("/", async (req, res) => {
  try {
    const parsedData = parseRequestData(req.body);
    const { folderName } = saveEmailToFolder(parsedData, req.files);

    if (folderName) {
      const emailText = await extractDataFromFilePath(folderName);
      console.log("EMAIL TEXT", emailText);
      await generateWithClaude(emailText, folderName);
    }

    res.status(200).send("Webhook received and processed");
  } catch (err) {
    console.error("Error processing webhook:", err);
    res.status(500).send("Internal server error");
  }
});

function parseRequestData(body) {
  const parsed = {};
  for (const key in body) {
    try {
      parsed[key] = JSON.parse(body[key]);
    } catch {
      parsed[key] = body[key];
    }
  }
  return parsed;
}

module.exports = router;
