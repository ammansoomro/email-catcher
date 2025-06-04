const path = require("path");
const fs = require("fs");
const textract = require("textract");
const csvParser = require("csv-parser");
const XLSX = require("xlsx");

async function extractDataFromFolder(folderName) {
  const folderPath = path.join(__dirname, "../../emails", folderName);
  const extractedTexts = [];

  const extractTextFile = (filePath) =>
    new Promise((resolve, reject) =>
      textract.fromFileWithPath(filePath, (err, text) => {
        if (err) reject(err);
        else resolve(text);
      })
    );

  const extractPDF = async (filePath) => {
    const pdfParse = (await import("pdf-parse")).default;
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(dataBuffer);
    return data.text;
  };

  const extractXLSX = (filePath) => {
    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json(sheet);
    return JSON.stringify(jsonData, null, 2);
  };

  const extractCSV = (filePath) =>
    new Promise((resolve, reject) => {
      const results = [];
      fs.createReadStream(filePath)
        .pipe(csvParser())
        .on("data", (data) => results.push(data))
        .on("end", () => resolve(JSON.stringify(results, null, 2)))
        .on("error", (err) => reject(err));
    });

  const ignoreFiles = ["message.txt"];
  const imageExtensions = [".png", ".jpg", ".jpeg", ".gif", ".webp"];

  const files = fs.readdirSync(folderPath);
  for (const file of files) {
    const filePath = path.join(folderPath, file);
    const ext = path.extname(file).toLowerCase();

    if (ignoreFiles.includes(file) || imageExtensions.includes(ext)) continue;

    try {
      let extracted;
      switch (ext) {
        case ".doc":
        case ".docx":
        case ".txt":
          extracted = await extractTextFile(filePath);
          break;
        case ".pdf":
          extracted = await extractPDF(filePath);
          break;
        case ".xlsx":
          extracted = extractXLSX(filePath);
          break;
        case ".csv":
          extracted = await extractCSV(filePath);
          break;
        default:
          extracted = `Unsupported file type: ${file}`;
      }

      extractedTexts.push(
        `\n===== Extracted from: ${file} =====\n${extracted}`
      );
    } catch (err) {
      extractedTexts.push(
        `\n===== Error reading ${file}: ${err.message} =====`
      );
    }
  }

  const finalOutput = `Data From Attachments of the Email:\n\n${extractedTexts.join(
    "\n"
  )}`;
  const outputPath = path.join(folderPath, "extractedData.txt");
  fs.writeFileSync(outputPath, finalOutput);
  console.log(`✅ Extracted data saved to ${outputPath}`);
}

module.exports = extractDataFromFolder;
