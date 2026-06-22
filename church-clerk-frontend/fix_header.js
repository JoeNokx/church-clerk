const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "src/features/dashboard/components/Header.jsx");
const lines = fs.readFileSync(filePath, "utf8").split("\n");

// Line 1110 (1-indexed) = index 1109 — remove the orphaned broken fragment
const targetIdx = 1109;
console.log("Line to remove:", JSON.stringify(lines[targetIdx]));
lines[targetIdx] = "";

fs.writeFileSync(filePath, lines.join("\n"), "utf8");
console.log("Done.");
