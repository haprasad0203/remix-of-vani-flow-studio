import fs from 'fs';
import path from 'path';

const envPath = path.resolve('.env');
let supabaseUrl = '';
let supabaseKey = '';
let supabaseProjectId = '';

if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf-8');
  const lines = content.split(/\r?\n/);
  for (let line of lines) {
    line = line.trim();
    if (!line || line.startsWith('#')) continue;
    const idx = line.indexOf('=');
    if (idx === -1) continue;
    const key = line.substring(0, idx).trim();
    let val = line.substring(idx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.substring(1, val.length - 1);
    }
    if (key === 'VITE_SUPABASE_URL') supabaseUrl = val;
    if (key === 'VITE_SUPABASE_PUBLISHABLE_KEY') supabaseKey = val;
    if (key === 'VITE_SUPABASE_PROJECT_ID') supabaseProjectId = val;
  }
}

console.log("-----------------------------------------");
console.log("SUPABASE_PROJECT_ID:", supabaseProjectId);
console.log("SUPABASE_URL:", supabaseUrl);
console.log("SUPABASE_PUBLISHABLE_KEY (truncated):", supabaseKey ? supabaseKey.substring(0, 35) + "..." : "NONE");
console.log("-----------------------------------------");

if (supabaseUrl.includes('tnytobgsezrtectszevd')) {
  console.log("✅ CONFIRMED: Connected to tnytobgsezrtectszevd.supabase.co!");
} else {
  console.error("❌ ERROR: Still pointing to old project:", supabaseUrl);
}
