import 'dotenv/config';
import { spawn } from 'node:child_process';
import { appendFileSync } from 'node:fs';
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

// GitHub Actions must never report a green test job after silently skipping all
// MongoDB integration suites because their opt-in environment was not configured.
if (
  process.env.CI === 'true' &&
  (process.env.RUN_MONGODB_INTEGRATION !== 'true' || !process.env.MONGODB_URI)
) {
  console.error(
    'CI requires RUN_MONGODB_INTEGRATION=true and MONGODB_URI; refusing to run a partial test suite.',
  );
  process.exit(1);
}

if (testFiles.length === 0) {
  console.error('No test files found.');
  process.exit(1);
}

console.log('Running tests:');
console.log(testFiles.join('\n'));

// MongoDB integration suites each start an API process and exercise transactions
// against the same Atlas cluster. Running all files concurrently can overload a
// small shared test cluster and cause unrelated API requests to time out.
const child = spawn('tsx', ['--test', '--test-concurrency=1', ...testFiles], {
  stdio: ['ignore', 'pipe', 'pipe'],
  shell: true,
});

// Capture the runner output while still streaming it live, so a CI failure can
// also be surfaced as GitHub annotations and in the job summary. Raw logs are
// only visible to signed-in users, but annotations appear on the public job
// page, which keeps test failures observable to reviewers without log access.
let captured = '';
const forward = (stream, target) => {
  stream.on('data', (chunk) => {
    const text = chunk.toString();
    captured += text;
    target.write(text);
  });
};
forward(child.stdout, process.stdout);
forward(child.stderr, process.stderr);

const FAILURE_LINE_PATTERN =
  /(✖|not ok |AssertionError|ERR_ASSERTION|ERR_[A-Z_]+|Error: |Test API exited|exited early|exited with code)/;

// GitHub renders at most 50 annotations per step; keep the feed focused on the
// clearest failure signals so the first lines identify the failing suite.
function emitFailureAnnotations(output) {
  if (process.env.CI !== 'true') return;

  const lines = [];
  for (const rawLine of output.split('\n')) {
    const line = rawLine.trim();
    if (line && FAILURE_LINE_PATTERN.test(line) && !lines.includes(line)) {
      lines.push(line);
    }
  }

  const picked = lines.slice(0, 12);
  if (picked.length === 0) {
    picked.push(
      output.trimEnd().split('\n').slice(-10).join(' | ') ||
        'npm test failed without diagnostic output',
    );
  }

  for (const line of picked) {
    const message = line
      .replace(/%/g, '%25')
      .replace(/\r/g, '%0D')
      .replace(/\n/g, '%0A')
      .slice(0, 950);
    console.log(`::error title=Test failure::${message}`);
  }

  const summaryPath = process.env.GITHUB_STEP_SUMMARY;
  if (summaryPath) {
    const tail = output.trimEnd().split('\n').slice(-400).join('\n');
    try {
      appendFileSync(summaryPath, `### npm test failure output (tail)\n\n\`\`\`\n${tail}\n\`\`\`\n`);
    } catch {
      // The summary is a convenience channel; never fail the step over it.
    }
  }
}

child.on('exit', (code) => {
  if ((code ?? 1) !== 0) {
    emitFailureAnnotations(captured);
  }
  process.exit(code ?? 1);
});
