const fs = require("fs");
const path = require("path");

async function generateWithClaude(emailText, folderName) {
  try {
    const { createOpenRouter } = await import("@openrouter/ai-sdk-provider");
    const { generateText } = await import("ai");

    const openrouter = createOpenRouter({
      apiKey: process.env.OPENROUTER_API_KEY,
    });

    const chatModel = openrouter.chat("anthropic/claude-3.5-sonnet");

    const prompt = `
You are an AI assistant specialized in analyzing and extracting information from email threads. Your task is to parse the following email thread and extract specific order details.

<email_thread>
${emailText}
</email_thread>

Follow these steps:
1. Identify the person placing the order.
2. Extract:
   - Full name
   - Email
   - Address
   - Ordered items

3. For each item:
   - Name
   - Quantity
   - Price (if any)

4. Provide a JSON structured like this:

<json_format>
{
  "analysis": "...",
  "order_details": {
    "name": "...",
    "email": "...",
    "address": "...",
    "line_items": {
      "item01": {
        "name": "...",
        "quantity": X,
        "price": "..."
      }
    }
  }
}
</json_format>

Use "null" or "not found" if data is missing. Output JSON inside <response> tags.
`;

    const { text } = await generateText({
      model: chatModel,
      prompt,
    });

    // Save full response as raw text in a .json file
    const folderPath = path.join(__dirname, "../../emails", folderName);
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filePath = path.join(folderPath, `order-${timestamp}.json`);

    fs.writeFileSync(filePath, JSON.stringify({ text }, null, 2));

    console.log('Order Details Saved');
    return text;
  } catch (error) {
    console.error("Error generating text with Claude:", error);
  }
}

module.exports = generateWithClaude;
