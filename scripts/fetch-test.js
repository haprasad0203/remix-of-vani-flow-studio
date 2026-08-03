import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const envPath = path.resolve('.env');
let supabaseUrl = '';
let supabaseKey = '';

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
  }
}

const customFetch = (input, init) => {
  const url = typeof input === 'string' ? input : input.url;
  console.log("RAW SUPABASE REST REQUEST URL:", url);
  return fetch(input, init);
};

const supabase = createClient(supabaseUrl, supabaseKey, {
  global: { fetch: customFetch }
});

async function main() {
  console.log("\n--- EXECUTING LIVE API CALL ---");
  const { data, error } = await supabase.from('organizations').select('id, name').limit(1);
  console.log("Response data:", data);
  console.log("Response error:", error ? error.message : "none");
}

main();
