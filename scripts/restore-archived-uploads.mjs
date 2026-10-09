/**
 * Brings back uploads listed in docs/archived-uploads.json from git history.
 * They were removed from the working tree because only deleted records used them.
 *
 *   node scripts/restore-archived-uploads.mjs list              # what can be restored
 *   node scripts/restore-archived-uploads.mjs events:2022-labouting
 *   node scripts/restore-archived-uploads.mjs all
 *
 * Restored files land in data/uploads/. To use them on the site, add them in the Content Studio
 * (Media → Rescan picks them up) or restore the deleted record from its revision history.
 */
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const manifest = JSON.parse(readFileSync(new URL('../docs/archived-uploads.json', import.meta.url), 'utf8'));
const target = process.argv[2];
if (!target || target === 'list') {
  for (const r of manifest.records) console.log(`${r.id.padEnd(48)} ${String(r.images).padStart(3)} images  ${r.title}${r.date ? ' (' + r.date + ')' : ''}`);
  process.exit(target ? 0 : 1);
}
const chosen = target === 'all' ? manifest.records : manifest.records.filter(r => r.id === target);
if (!chosen.length) { console.error(`No archived uploads for "${target}". Run with "list" to see the options.`); process.exit(1); }
const files = chosen.flatMap(r => r.files);
for (let i = 0; i < files.length; i += 200) {
  const batch = files.slice(i, i + 200);
  execFileSync('git', ['checkout', manifest.commit, '--', ...batch], { stdio: 'inherit' });
  // checkout also stages the files; unstage them so they only get committed if you choose to.
  execFileSync('git', ['reset', '-q', '--', ...batch], { stdio: 'inherit' });
}
console.log(`Restored ${files.length} files from ${manifest.commit.slice(0, 7)} into data/uploads/ (not staged).`);
