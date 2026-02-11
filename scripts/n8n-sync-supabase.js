#!/usr/bin/env node
/**
 * Sync n8n workflow JSON to/from Supabase.
 *
 * Uses: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (or .env.local)
 *
 * Usage:
 *   node scripts/n8n-sync-supabase.js push     # push workflow from n8n-sync.json config
 *   node scripts/n8n-sync-supabase.js push path/to/workflow.json --slug my-flow
 *   node scripts/n8n-sync-supabase.js pull     # pull into file from n8n-sync.json config
 *   node scripts/n8n-sync-supabase.js pull --slug my-flow
 *   node scripts/n8n-sync-supabase.js list     # list workflows in Supabase
 */

const fs = require('fs');
const path = require('path');

// Load env from .env.local if present
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  content.split('\n').forEach((line) => {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
  });
}

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (e.g. in .env.local)');
  process.exit(1);
}

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const CONFIG_FILE = path.join(process.cwd(), 'n8n-sync.json');

function loadConfig() {
  if (!fs.existsSync(CONFIG_FILE)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
}

function getArgs() {
  const args = process.argv.slice(2);
  const cmd = args[0];
  const rest = args.slice(1);
  let workflowFile = null;
  let slug = null;
  for (let i = 0; i < rest.length; i++) {
    if (rest[i] === '--slug' && rest[i + 1]) {
      slug = rest[++i];
    } else if (rest[i] && !rest[i].startsWith('--')) {
      workflowFile = rest[i];
    }
  }
  return { cmd, workflowFile, slug };
}

async function push(workflowFile, slug) {
  const config = loadConfig();
  const file = workflowFile || (config && config.workflow_file) || 'mobile/n8n.json';
  const name = config?.name || path.basename(file, path.extname(file));
  const finalSlug = slug || (config && config.slug) || path.basename(file, path.extname(file)).replace(/\s+/g, '-');

  const absPath = path.isAbsolute(file) ? file : path.join(process.cwd(), file);
  if (!fs.existsSync(absPath)) {
    console.error('Workflow file not found:', absPath);
    process.exit(1);
  }

  const workflowJson = JSON.parse(fs.readFileSync(absPath, 'utf8'));

  const { data, error } = await supabase
    .from('n8n_workflows')
    .upsert(
      { slug: finalSlug, name, workflow_json: workflowJson, updated_at: new Date().toISOString() },
      { onConflict: 'slug' }
    )
    .select()
    .single();

  if (error) {
    console.error('Push failed:', error.message);
    process.exit(1);
  }
  console.log('Pushed workflow to Supabase:', data.slug, '(id:', data.id + ')');
}

async function pull(slug, outPath) {
  const config = loadConfig();
  const finalSlug = slug || (config && config.slug);
  if (!finalSlug) {
    console.error('Specify --slug or set "slug" in n8n-sync.json');
    process.exit(1);
  }

  const { data, error } = await supabase
    .from('n8n_workflows')
    .select('workflow_json, name')
    .eq('slug', finalSlug)
    .single();

  if (error || !data) {
    console.error('Pull failed:', error?.message || 'Workflow not found');
    process.exit(1);
  }

  const out = outPath || (config && config.workflow_file) || `n8n-${finalSlug}.json`;
  const absOut = path.isAbsolute(out) ? out : path.join(process.cwd(), out);
  fs.mkdirSync(path.dirname(absOut), { recursive: true });
  fs.writeFileSync(absOut, JSON.stringify(data.workflow_json, null, 2), 'utf8');
  console.log('Pulled workflow to', absOut);
}

async function list() {
  const { data, error } = await supabase
    .from('n8n_workflows')
    .select('id, slug, name, updated_at')
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('List failed:', error.message);
    process.exit(1);
  }
  if (!data.length) {
    console.log('No workflows in Supabase.');
    return;
  }
  console.log('Workflows in Supabase:');
  data.forEach((r) => console.log('  ', r.slug, '|', r.name || '-', '|', r.updated_at));
}

async function main() {
  const { cmd, workflowFile, slug } = getArgs();

  if (cmd === 'push') {
    await push(workflowFile, slug);
  } else if (cmd === 'pull') {
    await pull(slug, workflowFile);
  } else if (cmd === 'list') {
    await list();
  } else {
    console.log(`
n8n-sync-supabase — sync n8n workflow JSON to/from Supabase

Usage:
  node scripts/n8n-sync-supabase.js push              # push using n8n-sync.json
  node scripts/n8n-sync-supabase.js push <file> --slug <slug>
  node scripts/n8n-sync-supabase.js pull               # pull using n8n-sync.json
  node scripts/n8n-sync-supabase.js pull --slug <slug> [output.json]
  node scripts/n8n-sync-supabase.js list               # list workflows in Supabase

Config (n8n-sync.json):
  { "slug": "payment-processor", "name": "...", "workflow_file": "mobile/n8n.json" }

Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (or in .env.local)
`);
    process.exit(cmd ? 1 : 0);
  }
}

main();
