import path from "path";
import fs from "fs";
import textract from "textract";
import csvParser from "csv-parser";
import * as XLSX from "xlsx";

export async function extractDataFromFilePath(filePath) {
  const ext = path.extname(filePath).toLowerCase();

  const extractTextFile = (filePath) =>
    new Promise((resolve, reject) =>
      textract.fromFileWithPath(filePath, (err, text) => {
        if (err) reject(err);
        else resolve(text);
      })
    );

  // NEW — move inside the function
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

  switch (ext) {
    case ".doc":
    case ".docx":
    case ".txt":
      return await extractTextFile(filePath);
    case ".pdf":
      return await extractPDF(filePath);
    case ".xlsx":
      return extractXLSX(filePath);
    case ".csv":
      return await extractCSV(filePath);
    default:
      return "Unsupported file type for extraction.";
  }
}
