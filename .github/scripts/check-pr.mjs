// Usage: check-pr.mjs <pr body file> <changed files file>
// Fails when the PR description is incomplete or a UI change has no screenshot.
import { readFileSync } from 'node:fs';

const body = readFileSync(process.argv[2], 'utf8');
const files = readFileSync(process.argv[3], 'utf8').split('\n').filter(Boolean);

const stripComments = (s) => s.replace(/<!--[\s\S]*?-->/g, '');
const section = (name) => {
  const match = stripComments(body).match(
    new RegExp(`##\\s*${name}[^\\n]*\\n([\\s\\S]*?)(?=\\n##\\s|$)`, 'i')
  );
  return match ? match[1].trim() : '';
};

const problems = [];
if (!section('Description')) {
  problems.push('The "Description" section is empty.');
}
if (!section('How Has This Been Tested')) {
  problems.push('The "How Has This Been Tested?" section is empty.');
}

const uiFiles = files.filter(
  (f) => f.startsWith('src/') && !f.startsWith('src/i18n/')
);
const hasMedia =
  /!\[[^\]]*\]\([^)]+\)|<img\s|<video\s|github\.com\/user-attachments\//i.test(
    section('Screenshots')
  );
if (uiFiles.length && !hasMedia) {
  problems.push(
    `This PR changes the UI (${uiFiles.slice(0, 3).join(', ')}${
      uiFiles.length > 3 ? ', ...' : ''
    }) but the "Screenshots" section has no embedded screenshot or recording.`
  );
}

for (const p of problems) console.log(`::error::${p}`);
process.exit(problems.length ? 1 : 0);
