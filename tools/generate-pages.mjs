import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const manifestPath = process.argv[2];

if (!manifestPath) {
  throw new Error('Usage: node tools/generate-pages.mjs <path-to-policies.json>');
}

const policyOrder = ['terms_of_use', 'privacy_policy', 'community_guidelines'];
const siteRoot = 'https://jaydenNguyen17.github.io/SoulTracks-Policies';
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));

for (const kind of policyOrder) {
  const document = manifest[kind];
  const outputDirectory = path.join('docs', kind);
  await mkdir(outputDirectory, { recursive: true });
  await writeFile(
    path.join(outputDirectory, 'index.html'),
    renderPolicyPage(kind, document),
    'utf8',
  );
}

await writeFile(path.join('docs', 'index.html'), renderIndexPage(), 'utf8');

function renderPolicyPage(kind, document) {
  const sections = document.sections
    .map((section) => {
      const paragraphs = section.paragraphs
        .map((paragraph) => `      <p>${escapeHtml(paragraph)}</p>`)
        .join('\n');
      const links = section.links?.length
        ? `\n      <ul>\n${section.links
            .map(
              (link) =>
                `        <li><a href="${escapeHtml(link.url)}" rel="noopener noreferrer">${escapeHtml(link.label)}</a></li>`,
            )
            .join('\n')}\n      </ul>`
        : '';
      return `    <section>\n      <h2>${escapeHtml(section.heading)}</h2>\n${paragraphs}${links}\n    </section>`;
    })
    .join('\n');
  const canonicalUrl = `${siteRoot}/${kind}/`;

  return `<!doctype html>
<html lang="en-US">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="referrer" content="no-referrer">
  <meta name="robots" content="noindex, nofollow">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'self'; base-uri 'none'; form-action 'none'">
  <link rel="canonical" href="${canonicalUrl}">
  <link rel="stylesheet" href="../styles.css">
  <title>${escapeHtml(document.title)} | SoulTracks</title>
</head>
<body>
  <main>
    <p><a href="../">SoulTracks policies</a></p>
    <h1>${escapeHtml(document.title)}</h1>
    <p class="metadata">Version ${escapeHtml(document.version)} · Effective ${escapeHtml(document.effectiveOn)}</p>
${sections}
    <footer>SoulTracks controlled beta · Questions: jayden17nguyen@gmail.com</footer>
  </main>
</body>
</html>
`;
}

function renderIndexPage() {
  return `<!doctype html>
<html lang="en-US">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="referrer" content="no-referrer">
  <meta name="robots" content="noindex, nofollow">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'self'; base-uri 'none'; form-action 'none'">
  <link rel="canonical" href="${siteRoot}/">
  <link rel="stylesheet" href="styles.css">
  <title>SoulTracks policies</title>
</head>
<body>
  <main>
    <h1>SoulTracks policies</h1>
    <p>Public policy documents for the SoulTracks controlled beta.</p>
    <ul class="policy-list">
      <li><a href="terms_of_use/">Terms of Use</a></li>
      <li><a href="privacy_policy/">Privacy Policy</a></li>
      <li><a href="community_guidelines/">Community Guidelines</a></li>
    </ul>
    <footer>Questions: jayden17nguyen@gmail.com</footer>
  </main>
</body>
</html>
`;
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
