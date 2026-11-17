const fs = require("node:fs");
const path = require("node:path");

const source = path.join(__dirname, "..", "node_modules", "@supabase", "supabase-js", "dist", "umd", "supabase.js");
const target = path.join(__dirname, "..", "chat-ui", "supabase-sdk.js");

if (!fs.existsSync(source) || fs.statSync(source).size === 0) {
  throw new Error("Pinned Supabase UMD SDK was not installed at " + source);
}
fs.copyFileSync(source, target);
if (fs.statSync(target).size === 0) throw new Error("Supabase SDK packaging produced an empty file");
console.log("Packaged Supabase browser SDK into chat-ui/supabase-sdk.js");
