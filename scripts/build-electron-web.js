import { existsSync, renameSync, rmSync } from "fs";
import { execSync } from "child_process";

const apiPath = "src/app/api";
const apiBackupPath = "../api.electron.backup"; // Outside src/

function main() {
  console.log("📦 Starting Electron build...");
  
  // Clean .next cache
  if (existsSync(".next")) {
    console.log("🧹 Cleaning .next cache...");
    rmSync(".next", { recursive: true, force: true });
  }
  
  // Temporarily move API routes out of the way for static export
  if (existsSync(apiPath)) {
    console.log("🔧 Moving API routes aside for static export...");
    renameSync(apiPath, apiBackupPath);
  }
  
  try {
    // Build Next.js with static export
    console.log("🏗️ Building Next.js for Electron...");
    execSync("npx next build", { 
      stdio: "inherit",
      env: { ...process.env, BUILD_ELECTRON: "1", NEXT_TELEMETRY_DISABLED: "1" }
    });
    console.log("✅ Next.js build complete");
  } finally {
    // Restore API routes
    if (existsSync(apiBackupPath)) {
      console.log("🔄 Restoring API routes...");
      renameSync(apiBackupPath, apiPath);
    }
  }
  
  console.log("✨ Electron web build done!");
}

main();