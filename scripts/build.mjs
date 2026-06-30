import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const siteDir = path.join(rootDir, "site");
const registry = JSON.parse(fs.readFileSync(path.join(rootDir, "registry.json"), "utf8"));

let codeBlockCounter = 0;

fs.rmSync(siteDir, { recursive: true, force: true });
fs.mkdirSync(siteDir, { recursive: true });
copyDir(path.join(rootDir, "assets"), path.join(siteDir, "assets"));

const articleSections = registry.pages.map((page, index) => {
  const sourcePath = path.join(rootDir, page.source);
  const markdown = stripFirstHeading(stripFrontmatter(fs.readFileSync(sourcePath, "utf8")));
  const { html, toc } = renderMarkdown(markdown, page.id);
  return { page, index, html, toc };
});

fs.writeFileSync(path.join(siteDir, "index.html"), renderLayout(articleSections), "utf8");

fs.writeFileSync(
  path.join(siteDir, "llms.txt"),
  `${registry.site.title}\n\n${registry.site.description}\n\nSource: ${registry.site.repoUrl}\n`,
  "utf8",
);

console.log(`Built one scrollable cookbook page to ${path.relative(rootDir, siteDir)}`);

function stripFrontmatter(markdown) {
  return markdown.replace(/^---\n[\s\S]*?\n---\n/, "");
}

function stripFirstHeading(markdown) {
  return markdown.replace(/^# .+\n+/, "");
}

function renderMarkdown(markdown, pageId) {
  const lines = markdown.split(/\r?\n/);
  const html = [];
  const toc = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      i += 1;
      continue;
    }

    if (line.startsWith("```")) {
      const fence = line.slice(3).trim();
      const [language = "text", ...titleParts] = fence.split(/\s+/);
      const title = titleParts.join(" ");
      const code = [];
      i += 1;
      while (i < lines.length && !lines[i].startsWith("```")) {
        code.push(lines[i]);
        i += 1;
      }
      i += 1;
      html.push(renderCodeBlock(code.join("\n"), language, title));
      continue;
    }

    const image = /^!\[([^\]]*)\]\((\S+)(?:\s+"([^"]+)")?\)$/.exec(line.trim());
    if (image) {
      html.push(renderImage(image[2], image[1], image[3]));
      i += 1;
      continue;
    }

    if (isTableStart(lines, i)) {
      const tableLines = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        tableLines.push(lines[i]);
        i += 1;
      }
      html.push(renderTable(tableLines));
      continue;
    }

    const heading = /^(#{1,4})\s+(.+)$/.exec(line);
    if (heading) {
      const sourceLevel = heading[1].length;
      const level = Math.min(sourceLevel + 1, 4);
      const text = heading[2].trim();
      const id = `${pageId}-${slugify(text)}`;
      if (sourceLevel === 2 || sourceLevel === 3) {
        toc.push({ id, level, text: stripMarkdown(text) });
      }
      html.push(`<h${level} id="${id}">${inlineMarkdown(text)}</h${level}>`);
      i += 1;
      continue;
    }

    if (line.startsWith("> ")) {
      const quote = [];
      while (i < lines.length && lines[i].startsWith("> ")) {
        quote.push(lines[i].slice(2));
        i += 1;
      }
      html.push(`<blockquote>${quote.map(inlineMarkdown).join("<br>")}</blockquote>`);
      continue;
    }

    if (/^-\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^-\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^-\s+/, ""));
        i += 1;
      }
      html.push(`<ul>${items.map((item) => `<li>${inlineMarkdown(item)}</li>`).join("")}</ul>`);
      continue;
    }

    if (/^\d+\.\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s+/, ""));
        i += 1;
      }
      html.push(`<ol>${items.map((item) => `<li>${inlineMarkdown(item)}</li>`).join("")}</ol>`);
      continue;
    }

    const paragraph = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !lines[i].startsWith("```") &&
      !/^(#{1,4})\s+/.test(lines[i]) &&
      !/^-\s+/.test(lines[i]) &&
      !/^\d+\.\s+/.test(lines[i]) &&
      !lines[i].startsWith("> ") &&
      !isTableStart(lines, i)
    ) {
      paragraph.push(lines[i].trim());
      i += 1;
    }
    html.push(`<p>${inlineMarkdown(paragraph.join(" "))}</p>`);
  }

  return { html: html.join("\n"), toc };
}

function renderLayout(articleSections) {
  const repo = registry.site.repoUrl;
  const overview = registry.pages[0];

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(registry.site.title)}</title>
    <meta name="description" content="${escapeHtml(registry.site.description)}">
    <link rel="stylesheet" href="assets/styles.css">
  </head>
  <body>
    <div class="mobile-topbar">
      <strong>${escapeHtml(registry.site.shortTitle)}</strong>
      <button type="button" data-mobile-nav>Menu</button>
    </div>
    <div class="shell">
      ${renderSidebar()}
      <main class="main-wrap">
        <div class="article-frame">
          <article class="article" id="top">
            <header class="article-header">
              <div class="meta-row">
                <span>Cookbook</span>
                <span>June 2026</span>
              </div>
              <h1>${escapeHtml(registry.site.title)}</h1>
              <p class="description">${escapeHtml(overview.description)}</p>
              <div class="article-actions">
                <button class="button" type="button" data-copy-page>Copy page</button>
                <a class="button" href="${repo}">View on GitHub</a>
                <a class="button" href="${repo}/tree/main/examples">Browse examples</a>
              </div>
            </header>
            <div class="markdown">
              ${articleSections.map(renderArticleSection).join("\n")}
            </div>
          </article>
          <aside class="right-rail">
            <div class="rail-card">
              <h2>On This Page</h2>
              ${articleSections.map(({ page }) => `<a class="toc-link" href="#${page.id}">${escapeHtml(page.title)}</a>`).join("")}
            </div>
          </aside>
        </div>
      </main>
    </div>
    <script src="assets/site.js"></script>
  </body>
</html>`;
}

function renderArticleSection({ page, html }) {
  return `<section class="doc-section" id="${page.id}">
    <div class="section-kicker">${escapeHtml(page.section)}</div>
    <h2>${escapeHtml(page.title)}</h2>
    <p class="section-description">${escapeHtml(page.description)}</p>
    ${html}
  </section>`;
}

function renderSidebar() {
  const sections = [];
  for (const page of registry.pages) {
    let section = sections.find((item) => item.name === page.section);
    if (!section) {
      section = { name: page.section, pages: [] };
      sections.push(section);
    }
    section.pages.push(page);
  }

  return `<aside class="sidebar">
    <a class="brand" href="#top">
      <span class="brand-mark">E</span>
      <span class="brand-title">${escapeHtml(registry.site.title)}</span>
      <span class="brand-subtitle">${escapeHtml(registry.site.description)}</span>
    </a>
    <input class="nav-search" type="search" placeholder="Search" aria-label="Search pages" data-nav-search>
    ${sections.map((section) => `
      <div class="nav-section">${escapeHtml(section.name)}</div>
      ${section.pages.map((page) => `
        <a data-nav-item class="nav-link" href="#${page.id}">${escapeHtml(page.title)}</a>
      `).join("")}
    `).join("")}
  </aside>`;
}

function renderCodeBlock(code, language, title) {
  const id = `code-${++codeBlockCounter}`;
  const label = title || language || "text";
  return `<div class="code-card">
    <div class="code-toolbar">
      <span class="code-title">${escapeHtml(label)}</span>
      <button class="copy-button" type="button" data-copy="${id}">Copy</button>
    </div>
    <pre><code id="${id}" class="language-${escapeHtml(language)}">${escapeHtml(code)}</code></pre>
  </div>`;
}

function renderImage(src, alt, caption) {
  return `<figure class="diagram-figure">
    <img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}">
    ${caption ? `<figcaption>${escapeHtml(caption)}</figcaption>` : ""}
  </figure>`;
}

function isTableStart(lines, index) {
  return (
    lines[index]?.trim().startsWith("|") &&
    lines[index + 1]?.trim().startsWith("|") &&
    /^\|?[\s:-]+\|[\s|:-]+$/.test(lines[index + 1].trim())
  );
}

function renderTable(lines) {
  const rows = lines.map((line) => line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((cell) => cell.trim()));
  const [head, , ...body] = rows;
  return `<div class="table-wrap"><table>
    <thead><tr>${head.map((cell) => `<th>${inlineMarkdown(cell)}</th>`).join("")}</tr></thead>
    <tbody>${body.map((row) => `<tr>${row.map((cell) => `<td>${inlineMarkdown(cell)}</td>`).join("")}</tr>`).join("")}</tbody>
  </table></div>`;
}

function copyDir(source, target) {
  fs.mkdirSync(target, { recursive: true });
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const sourcePath = path.join(source, entry.name);
    const targetPath = path.join(target, entry.name);
    if (entry.isDirectory()) copyDir(sourcePath, targetPath);
    else fs.copyFileSync(sourcePath, targetPath);
  }
}

function inlineMarkdown(text) {
  let value = escapeHtml(text);
  value = value.replace(/`([^`]+)`/g, "<code>$1</code>");
  value = value.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  value = value.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, label, href) => {
    return `<a href="${escapeHtml(href)}">${label}</a>`;
  });
  return value;
}

function stripMarkdown(text) {
  return text.replace(/`([^`]+)`/g, "$1").replace(/\*\*/g, "");
}

function slugify(text) {
  return stripMarkdown(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
