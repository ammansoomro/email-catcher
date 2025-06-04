const fs = require("fs");
const path = require("path");
const os = require("os");

function sanitize(str) {
  return str.replace(/[<>:"/\\|?*\x00-\x1F]/g, "_");
}

function saveEmailToFolder(parsedData, attachments = []) {
  try {
    const recipient = Array.isArray(parsedData.envelope?.to)
      ? parsedData.envelope.to[0]
      : parsedData.envelope?.to || parsedData.to || "unknown_recipient";

    const recipientSafe = sanitize(recipient);
    const emailDir = path.join(__dirname, "../../emails", recipientSafe);
    fs.mkdirSync(emailDir, { recursive: true });

    const emailText = parsedData.text || "No Text";
    const fullMessage = `Subject: ${parsedData.subject || "No Subject"}${
      os.EOL
    }${os.EOL}${emailText}`;

    fs.writeFileSync(path.join(emailDir, "message.txt"), fullMessage);

    for (const file of attachments) {
      const safeName = sanitize(file.originalname);
      fs.writeFileSync(path.join(emailDir, safeName), file.buffer);
    }

    console.log(
      `Saved email to ${recipientSafe} with ${attachments.length} attachment(s).`
    );

    return {
      emailText,
      folderName: recipientSafe,
    };
  } catch (err) {
    console.error("Error saving email to folder:", err);
    return {
      emailText: null,
      folderName: null,
    };
  }
}

module.exports = saveEmailToFolder;
