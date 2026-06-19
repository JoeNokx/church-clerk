const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "src/features/supportHelp/pages/SupportHelpPage.jsx");
const lines = fs.readFileSync(filePath, "utf8").split("\n");

// Find the accordion map closing line: "            ))}"
const mapCloseIdx = lines.findIndex((l) => l.trimEnd() === "            ))}");
if (mapCloseIdx === -1) { console.error("Map close marker not found"); process.exit(1); }

// Find the next closing div for the divide-y container: "          </div>"
let divCloseIdx = -1;
for (let i = mapCloseIdx + 1; i < lines.length; i++) {
  if (lines[i].trimEnd() === "          </div>") {
    divCloseIdx = i;
    break;
  }
}
if (divCloseIdx === -1) { console.error("Div close marker not found"); process.exit(1); }

// Remove everything between mapCloseIdx+1 and divCloseIdx (exclusive of both markers)
const cleaned = [
  ...lines.slice(0, mapCloseIdx + 1),
  ...lines.slice(divCloseIdx)
];

fs.writeFileSync(filePath, cleaned.join("\n"), "utf8");
console.log("Done. Removed " + (divCloseIdx - mapCloseIdx - 1) + " leftover lines.");
