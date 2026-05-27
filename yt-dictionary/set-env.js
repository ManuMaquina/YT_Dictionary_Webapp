// Runs before `ng build` on Vercel to inject environment variables
// into the Angular environment file. Values come from Vercel's
// Environment Variables dashboard (Settings → Environment Variables).
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env['SUPABASE_URL'];
const supabaseKey = process.env['SUPABASE_ANON_KEY'];

if (!supabaseUrl || !supabaseKey) {
  console.error('ERROR: SUPABASE_URL and SUPABASE_ANON_KEY must be set as environment variables.');
  process.exit(1);
}

const content = `export const environment = {
  production: true,
  supabaseUrl: '${supabaseUrl}',
  supabaseKey: '${supabaseKey}',
};
`;

const targetPath = path.join(__dirname, 'src', 'environments', 'environment.production.ts');
fs.writeFileSync(targetPath, content);
console.log(`✔ environment.production.ts written with Supabase config`);
