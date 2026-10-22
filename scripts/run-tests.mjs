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

const TAP_RESULT_LINE = /^(ok |not ok |# Subtest|# tests|# suites|# pass|# fail|# cancelled|# skipped|# todo|# duration_ms|# code)/;

// Extract the full multi-line detail block that follows a marker line. Server
// error dumps (stack traces, MongoDB errInfo) and TAP failure details span many
// lines, so single-line filtering loses the root cause.
function collectBlock(lines, startIndex, maxLines) {
  const block = [lines[startIndex].trim()];
  let j = startIndex + 1;
  while (j < lines.length && block.length < maxLines) {
    const next = lines[j].trim();
    if (TAP_RESULT_LINE.test(next)) break;
    if (next) block.push(next);
    j += 1;
  }
  return { text: block.join('\n'), endIndex: j };
}

// GitHub renders a limited number of annotations per step; prioritize the root
// causes (server error dumps) over individual assertion blocks.
function emitFailureAnnotations(output) {
  if (process.env.CI !== 'true') return;

  const lines = output.split('\n');
  const blocks = [];
  const consumed = new Set();

  // Server-side unhandled API errors first: they carry the underlying cause.
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('Unhandled API error:')) {
      const block = collectBlock(lines, i, 30);
      blocks.push(block.text);
      for (let k = i; k < block.endIndex; k++) consumed.add(k);
      i = block.endIndex - 1;
    }
  }

  // Then every failing test with its assertion details.
  for (let i = 0; i < lines.length; i++) {
    if (consumed.has(i)) continue;
    if (lines[i].trim().startsWith('not ok ')) {
      const block = collectBlock(lines, i, 30);
      blocks.push(block.text);
      for (let k = i; k < block.endIndex; k++) consumed.add(k);
      i = block.endIndex - 1;
    }
  }

  // Split into annotation-sized chunks; GitHub truncates long messages.
  const chunks = [];
  for (const block of blocks) {
    const clean = block.replace(/\u001b\[\d+m/g, '');
    for (let offset = 0; offset < clean.length; offset += 900) {
      chunks.push(clean.slice(offset, offset + 900));
      if (chunks.length >= 10) break;
    }
    if (chunks.length >= 10) break;
  }

  if (chunks.length === 0) {
    chunks.push(
      (output.trimEnd().split('\n').slice(-10).join('\n') || 'npm test failed without diagnostic output').slice(0, 900),
    );
  }

  for (const chunk of chunks) {
    const message = chunk
      .replace(/%/g, '%25')
      .replace(/\r/g, '%0D')
      .replace(/\n/g, '%0A');
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
