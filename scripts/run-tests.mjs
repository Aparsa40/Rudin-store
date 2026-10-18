import { spawn } from 'node:child_process';
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';

const testRoots = ['backend', 'src'];

const testFiles = [];

async function findTests(dir) {
  const entries = await readdir(dir, {
    withFileTypes: true,
  });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);

    if (entry.isDirectory()) {
      await findTests(fullPath);
      continue;
    }

    if (entry.isFile() && entry.name.endsWith('.test.ts')) {
      testFiles.push(fullPath);
    }
  }
}

for (const root of testRoots) {
  try {
    await findTests(root);
  } catch {
    // Ignore missing folders
  }
}

if (testFiles.length === 0) {
  console.error('No test files found.');
  process.exit(1);
}

console.log('Running tests:');
console.log(testFiles.join('\n'));

const child = spawn('tsx', ['--test', ...testFiles], {
  stdio: 'inherit',
  shell: true,
});

child.on('exit', (code) => {
  process.exit(code ?? 1);
});
