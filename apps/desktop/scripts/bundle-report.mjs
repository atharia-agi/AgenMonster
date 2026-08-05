import { readdirSync, statSync, readFileSync } from 'node:fs';
import { join, extname, relative } from 'node:path';
import { gzipSync } from 'node:zlib';

const BUILD_DIR = join(process.cwd(), 'build');
const BUDGET_BYTES = 500 * 1024;

function findJsFiles(dir, files = []) {
  const entries = readdirSync(dir);
  for (const entry of entries) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      findJsFiles(full, files);
    } else if (extname(entry) === '.js') {
      files.push(full);
    }
  }
  return files;
}

function analyze() {
  const files = findJsFiles(BUILD_DIR);
  const chunks = [];

  for (const full of files) {
    const buf = readFileSync(full);
    const raw = statSync(full).size;
    const gz = gzipSync(buf).length;
    const rel = relative(BUILD_DIR, full);
    chunks.push({ file: rel, size: raw, gzipped: gz });
  }

  chunks.sort((a, b) => b.gzipped - a.gzipped);

  const overBudget = chunks.filter((c) => c.gzipped > BUDGET_BYTES);
  const totalGz = chunks.reduce((s, c) => s + c.gzipped, 0);

  console.log('\n📦 Bundle Analysis\n');
  console.log(`Total chunks: ${chunks.length}`);
  console.log(`Total gzipped: ${(totalGz / 1024).toFixed(1)} KB\n`);

  console.log('Top 10 largest (gzipped):');
  for (const c of chunks.slice(0, 10)) {
    const bar = '█'.repeat(Math.max(1, Math.round((c.gzipped / chunks[0].gzipped) * 30)));
    const budgetMark = c.gzipped > BUDGET_BYTES ? ' ⚠️  OVER BUDGET' : '';
    console.log(`  ${c.file.padEnd(40)} ${(c.gzipped / 1024).toFixed(1).padStart(6)} KB ${bar}${budgetMark}`);
  }

  if (overBudget.length > 0) {
    console.log(`\n❌ ${overBudget.length} chunk(s) exceed ${BUDGET_BYTES / 1024}KB budget:`);
    for (const c of overBudget) {
      console.log(`   - ${c.file}: ${(c.gzipped / 1024).toFixed(1)} KB`);
    }
    if (process.argv.includes('--check')) {
      process.exit(1);
    }
  } else {
    console.log(`\n✅ All chunks within ${BUDGET_BYTES / 1024}KB budget`);
  }
}

analyze();
