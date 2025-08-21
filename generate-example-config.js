#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packagePath = __dirname;

const exampleConfig = {
  mcpServers: {
    swagger: {
      command: "node",
      args: [path.join(packagePath, "dist", "index.js")],
    },
  },
};

const outputPath = path.join(process.cwd(), "swagger-mcp.config.json");
fs.writeFileSync(outputPath, JSON.stringify(exampleConfig, null, 2));

console.log(`✅ Generated example.mcp.json at: ${outputPath}`);
console.log("\nConfiguration uses:");
console.log(`  - Package: ${packagePath}`);
