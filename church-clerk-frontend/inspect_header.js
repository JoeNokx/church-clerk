const fs = require("fs");
const content = fs.readFileSync("src/features/dashboard/components/Header.jsx", "utf8");
const idx = content.indexOf("Welcome back");
console.log(JSON.stringify(content.slice(idx - 10, idx + 100)));
