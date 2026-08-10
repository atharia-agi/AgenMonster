#!/usr/bin/env node
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function runK6(scenario, baseUrl) {
  return new Promise((resolve, reject) => {
    const args = [
      'run',
      `--env=BASE_URL=${baseUrl}`,
      '--out=json=results/load-test-results.json',
      `--scenario=${scenario}`,
      resolve(__dirname, 'load-test.js'),
    ];

    console.log(`Running k6 ${scenario} test against ${baseUrl}...`);
    console.log(`Command: k6 ${args.join(' ')}`);

    const k6 = spawn('k6', args, {
      stdio: 'inherit',
      shell: true,
    });

    k6.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`k6 ${scenario} test failed with code ${code}`));
      }
    });

    k6.on('error', (err) => {
      reject(err);
    });
  });
}

async function main() {
  const args = process.argv.slice(2);
  const scenario = args[0] || 'smoke';
  const baseUrl = args[1] || 'http://localhost:1420';

  const validScenarios = ['smoke', 'load', 'stress', 'spike'];
  if (!validScenarios.includes(scenario)) {
    console.error(`Invalid scenario: ${scenario}. Valid options: ${validScenarios.join(', ')}`);
    process.exit(1);
  }

  try {
    await runK6(scenario, baseUrl);
    console.log(`\n✅ ${scenario} test completed successfully`);
  } catch (error) {
    console.error(`\n❌ ${scenario} test failed:`, error.message);
    process.exit(1);
  }
}

main();