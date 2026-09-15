import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const manifestPath = process.argv[2];

if (!manifestPath) {
  throw new Error('Usage: node tools/validate-pages.mjs <path-to-policies.json>');
}

const policyOrder = ['terms_of_use', 'privacy_policy', 'community_guidelines'];
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const forbiddenMarkup = /<(script|iframe|img|video|audio|form|object|embed)\b/i;
const allowedExternalLinks = new Set([
  'https://www.spotify.com/us/legal/cookies-policy/',
  'https://www.spotify.com/us/legal/privacy-policy/',
  'https://www.spotify.com/us/legal/end-user-agreement/',
]);

for (const kind of policyOrder) {
  const document = manifest[kind];
  const html = await readFile(path.join('docs', kind, 'index.html'), 'utf8');
  const calculatedHash = createHash('sha256')
    .update(JSON.stringify(document.sections))
    .digest('hex');

  assert(calculatedHash === document.contentSha256, `${kind}: content hash mismatch`);
  assert(html.includes(`Version ${document.version} · Effective ${document.effectiveOn}`), `${kind}: metadata missing`);
  assert(!forbiddenMarkup.test(html), `${kind}: forbidden active markup found`);
  assert(html.includes(`default-src 'none'; style-src 'self'`), `${kind}: restrictive CSP missing`);

  for (const section of document.sections) {
    assert(html.includes(escapeHtml(section.heading)), `${kind}: heading missing`);
    for (const paragraph of section.paragraphs) {
      assert(html.includes(escapeHtml(paragraph)), `${kind}: paragraph missing`);
    }
  }

  for (const match of html.matchAll(/href="(https:[^"]+)"/g)) {
    const url = match[1];
    assert(
      url === `https://jaydennguyen17.github.io/SoulTracks-Policies/${kind}/` ||
        allowedExternalLinks.has(url),
      `${kind}: unexpected external link ${url}`,
    );
  }
}

process.stdout.write('Validated three complete static policy pages.\n');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character]);
}
