const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const os = require("os");
const dotenv = require("dotenv");

dotenv.config(); // Load .env file

const app = express();
const port = 3000;



const storage = multer.memoryStorage();
const upload = multer({ storage });

function saveEmailToFolder(parsedData, attachments = []) {
  try {
    const recipientEmail = (
      Array.isArray(parsedData.envelope?.to)
        ? parsedData.envelope.to[0]
        : parsedData.envelope?.to || parsedData.to || "unknown_recipient"
    ).replace(/[<>:"/\\|?*\x00-\x1F]/g, "_");

    const parentDir = path.join(__dirname, "emails", recipientEmail);
    fs.mkdirSync(parentDir, { recursive: true });

    const emailText = parsedData.text || "No Text";
    const fullMessage = `Subject: ${parsedData.subject || "No Subject"}${os.EOL}${os.EOL}${emailText}`;

    // Save message.txt
    const filePath = path.join(parentDir, "message.txt");
    fs.writeFileSync(filePath, fullMessage);

    // Save attachments
    for (const file of attachments) {
      const safeFilename = file.originalname.replace(/[<>:"/\\|?*\x00-\x1F]/g, "_");
      const attachmentPath = path.join(parentDir, safeFilename);
      fs.writeFileSync(attachmentPath, file.buffer);
    }

    console.log(
      `Saved email to ${recipientEmail} with ${attachments.length} attachment(s).`
    );

    return emailText; // return extracted email body
  } catch (err) {
    console.error("Error saving email to folder:", err);
    return null;
  }
}


// --------- AI Integration ---------
async function generateWithClaude4Sonnet(emailText) {
  try {
    const { createOpenRouter } = await import("@openrouter/ai-sdk-provider");
const { generateText } = await import("ai");
const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});
    const chatModel = openrouter.chat('anthropic/claude-3.5-sonnet');

    const { text } = await generateText({
      model: chatModel,
      prompt: `
You are an AI assistant specialized in analyzing and extracting information from email threads. Your task is to parse the following email thread and extract specific order details. This task is crucial for accurately processing customer orders and ensuring correct information is captured.

Here's the email thread you need to analyze:

<email_thread>
${emailText}
</email_thread>

Follow these steps to complete the task:

1. Carefully read through the entire email thread.

2. Identify the person placing the order. Look for cues such as "I would like to order," "Please process my order," or similar phrases.

3. Extract the following details:
   a. Full name of the person placing the order  
   b. Email address of the customer  
   c. Shipping or billing address provided  
   d. Ordered items (line items)

4. For each ordered item, identify:
   a. Item name or description  
   b. Quantity ordered  
   c. Price (if mentioned)

5. Summarize your analysis, briefly explaining how you identified the person placing the order, what they ordered, and from which parts of the email you inferred this information.

6. Structure your response in a clean JSON format as follows:

<json_format>
{
  "analysis": "Your brief summary goes here",

  "order_details": {
    "name": "Full name of the customer",
    "email": "Customer email address",
    "address": "Shipping or billing address",
    "line_items": {
      "item01": {
        "name": "Item name or description",
        "quantity": X,
        "price": "Price if mentioned"
      },
      "item02": {
        // Additional items follow the same structure
      }
    }
  }
}
</json_format>

7. If any field is missing or unclear in the email, use "null" or "not found" as the value. Do not make assumptions or infer information that isn't explicitly stated in the email thread.

8. Double-check your extracted information for accuracy before finalizing your JSON response.

Provide your complete JSON response within <response> tags.
`,
    });

    console.log("Claude 4 Sonnet Response:");
    console.log(text);
    return text;
  } catch (error) {
    console.error("Error generating text with Claude 4 Sonnet:", error);
  }
}

// -----------------------------------

app.post("/webhooks/email-handler", upload.any(), async (req, res) => {
  try {
    console.log("Files received:", req.files);
    console.log("Fields received:", req.body);

    let parsedData = {};
    for (const key in req.body) {
      try {
        parsedData[key] = JSON.parse(req.body[key]);
      } catch {
        parsedData[key] = req.body[key];
      }
    }

    const emailText = saveEmailToFolder(parsedData, req.files);

    if (emailText) {
      await generateWithClaude4Sonnet(emailText);
    }

    res.status(200).send("Webhook received and processed");
  } catch (err) {
    console.error("Error processing webhook:", err);
    res.status(500).send("Internal server error");
  }
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
