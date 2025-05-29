const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const os = require("os");

const app = express();
const port = 3000;

const storage = multer.memoryStorage();
const upload = multer({ storage });

function saveEmailToFolder(parsedData, attachments = []) {
  try {
    const senderEmail =
      (parsedData.envelope?.from || "unknown_sender").replace(
        /[<>:"/\\|?*\x00-\x1F]/g,
        "_"
      ) || "unknown_sender";
    const folderPath = path.join(__dirname, "emails", senderEmail);

    fs.mkdirSync(folderPath, { recursive: true });

    const filePath = path.join(folderPath, "message.txt");
    const content = `Subject: ${parsedData.subject || "No Subject"}${os.EOL}${
      os.EOL
    }${parsedData.text || "No Text"}`;
    fs.writeFileSync(filePath, content);

    let attachmentCount = 0;
    for (const file of attachments) {
      const safeFilename = file.originalname.replace(
        /[<>:"/\\|?*\x00-\x1F]/g,
        "_"
      );
      const attachmentPath = path.join(folderPath, safeFilename);
      fs.writeFileSync(attachmentPath, file.buffer);
      attachmentCount++;
    }

    console.log(
      `Saved email from ${senderEmail} with ${attachmentCount} attachment(s).`
    );
  } catch (err) {
    console.error("Error saving email to folder:", err);
  }
}

app.post("/webhooks/email-handler", upload.any(), (req, res) => {
  try {
    console.log("Files received:", req.files);
    console.log("Fields received:", req.body);

    // parse JSON fields if needed
    let parsedData = {};
    for (const key in req.body) {
      try {
        parsedData[key] = JSON.parse(req.body[key]);
      } catch {
        parsedData[key] = req.body[key];
      }
    }

    saveEmailToFolder(parsedData, req.files);

    res.status(200).send("Webhook received and saved");
  } catch (err) {
    console.error("Error processing webhook:", err);
    res.status(500).send("Internal server error");
  }
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
