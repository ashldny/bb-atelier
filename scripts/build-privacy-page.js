// Builds docs/privacy.html (served by GitHub Pages) from PRIVACY.md, so the policy has
// one source. Handles the Markdown PRIVACY.md uses: headings, paragraphs, lists,
// a table, **bold**, _italic_, `code`, [links](url) and bare https:// URLs.
// Run: npm run privacy
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const escape = (text) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function inline(text) {
  const links = [];
  let out = escape(text).replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, (_, label, url) => {
    links.push(`<a href="${url}">${label}</a>`);
    return `\u0000${links.length - 1}\u0000`;
  });
  out = out
    .replace(/(^|[\s(])(https:\/\/[^\s<)]+[^\s<).,])/g, '$1<a href="$2">$2</a>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|\s)_([^_]+)_(?=\s|$|[.,])/g, '$1<em>$2</em>');
  return out.replace(/\u0000(\d+)\u0000/g, (_, i) => links[Number(i)]);
}

function render(markdown) {
  const html = [];
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  let title = 'Privacy Policy';
  for (let i = 0; i < lines.length;) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
    } else if (/^#{1,3} /.test(line)) {
      const level = line.match(/^#+/)[0].length;
      const text = line.slice(level + 1).trim();
      if (level === 1) title = text;
      html.push(`<h${level}>${inline(text)}</h${level}>`);
      i++;
    } else if (/^- /.test(line)) {
      const items = [];
      while (i < lines.length && /^- /.test(lines[i])) items.push(lines[i++].slice(2));
      html.push(`<ul>${items.map((item) => `<li>${inline(item)}</li>`).join('')}</ul>`);
    } else if (line.startsWith('|')) {
      const rows = [];
      while (i < lines.length && lines[i].startsWith('|')) rows.push(lines[i++]);
      const cells = (row) =>
        row
          .split('|')
          .slice(1, -1)
          .map((cell) => inline(cell.trim()));
      const [head, , ...body] = rows;
      html.push(
        `<table><thead><tr>${cells(head)
          .map((c) => `<th>${c}</th>`)
          .join('')}</tr></thead><tbody>${body
          .map(
            (row) =>
              `<tr>${cells(row)
                .map((c) => `<td>${c}</td>`)
                .join('')}</tr>`
          )
          .join('')}</tbody></table>`
      );
    } else {
      const paragraph = [];
      while (i < lines.length && lines[i].trim() && !/^(#|- |\|)/.test(lines[i]))
        paragraph.push(lines[i++].trim());
      html.push(`<p>${inline(paragraph.join(' '))}</p>`);
    }
  }
  return { title, body: html.join('\n') };
}

const { title, body } = render(readFileSync('PRIVACY.md', 'utf8'));
const page = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escape(title)}</title>
<meta name="description" content="How the Bb Atelier browser extension handles your data." />
<style>
  :root { color-scheme: light dark; --text: #1d1a1f; --muted: #5d5660; --line: #e4dfe3; --accent: #a3204a; --bg: #ffffff; --code: #f4f0f3; }
  @media (prefers-color-scheme: dark) { :root { --text: #f4f0f3; --muted: #bcb3ba; --line: #3d3841; --accent: #e07a9d; --bg: #1c1a1e; --code: #2b272e; } }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg); color: var(--text); font: 16px/1.65 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
  main { max-width: 720px; margin: 0 auto; padding: 48px 16px 64px; }
  h1 { font-size: 2rem; line-height: 1.2; margin: 0 0 8px; }
  h2 { font-size: 1.25rem; margin: 40px 0 8px; padding-top: 24px; border-top: 1px solid var(--line); }
  p, ul, table { margin: 0 0 16px; }
  ul { padding-left: 1.3em; }
  li { margin: 6px 0; }
  em { color: var(--muted); }
  a { color: var(--accent); }
  code { padding: 1px 5px; border-radius: 4px; background: var(--code); font-size: 0.9em; }
  table { width: 100%; border-collapse: collapse; font-size: 0.95rem; }
  th, td { padding: 8px 10px; border-bottom: 1px solid var(--line); text-align: left; vertical-align: top; }
  th { font-weight: 600; }
</style>
</head>
<body>
<main>
${body}
</main>
</body>
</html>
`;
mkdirSync('docs', { recursive: true });
writeFileSync('docs/privacy.html', page);
// GitHub Pages: serve docs/ as plain files (no Jekyll processing).
writeFileSync('docs/.nojekyll', '');
console.log('docs/privacy.html written');
