/**
 * parse-markdown-to-json.js
 * Parses all Section markdown files and updates corresponding JSON files
 * with 100% of the text content preserved.
 *
 * Run: node parse-markdown-to-json.js
 */

const fs = require('fs');
const path = require('path');

const SECTIONS_DIR = path.join(__dirname, 'Sections');

function padNum(n) {
  return String(n).padStart(2, '0');
}

// Strip markdown formatting, keep plain readable text
function stripMd(text) {
  return text
    .replace(/\*\*\*(.+?)\*\*\*/g, '$1')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/_(.+?)_/g, '$1')
    .replace(/`(.+?)`/g, '$1')
    .replace(/\[(.+?)\]\([^)]+\)/g, '$1')
    .replace(/\{#[^}]+\}/g, '')         // remove {#anchor} tags
    .replace(/\\\[/g, '[').replace(/\\\]/g, ']')
    .replace(/\\([*_#\[\]()\\.!|])/g, '$1')
    .replace(/\*+/g, '')                // remove any leftover asterisks
    .replace(/\s+/g, ' ')
    .trim();
}

// Clean header line to plain title text
function cleanHeader(raw) {
  // Remove leading #+ markers
  const noHash = raw.replace(/^#+\s*/, '');
  // Strip markdown formatting
  return stripMd(noHash);
}

// Is line a bullet item?
function isBullet(line) {
  return /^\s*[\*\-]\s+/.test(line);
}

// Is line a numbered item?
function isNumbered(line) {
  return /^\s*\d+[\.\)]\s+/.test(line);
}

// Is line a table row?
function isTableRow(line) {
  return /^\s*\|/.test(line);
}

// Is line a table separator (|---|)?
function isTableSep(line) {
  return /^\s*\|[\s\-:|]+\|/.test(line);
}

// Extract text from a bullet or numbered item
function extractItemText(line) {
  // Remove leading whitespace + bullet/number marker
  const stripped = line.replace(/^\s*(?:[\*\-]|\d+[\.\)])\s+/, '');
  return stripMd(stripped);
}

// Parse consecutive table lines into {headers, rows}
function parseTable(tableLines) {
  const dataRows = tableLines.filter(l => isTableRow(l) && !isTableSep(l));
  if (dataRows.length < 1) return null;

  const parseRow = (line) =>
    line
      .replace(/^\s*\|/, '')
      .replace(/\|\s*$/, '')
      .split('|')
      .map(cell => stripMd(cell.trim()));

  const headers = parseRow(dataRows[0]);
  const rows = dataRows.slice(1).map(parseRow);
  return { headers, rows };
}

// Convert an array of content lines + optional blockTitle into content item(s)
function linesToContentItems(lines, blockTitle) {
  const nonEmpty = lines.filter(l => l.trim() !== '');
  if (nonEmpty.length === 0) return [];

  const items = [];
  let i = 0;
  let pendingText = [];
  let usedTitle = false;

  const applyTitle = (item) => {
    if (blockTitle && !usedTitle) {
      item.title = blockTitle;
      usedTitle = true;
    }
    return item;
  };

  const flushText = () => {
    if (pendingText.length === 0) return;
    const combined = pendingText
      .map(l => stripMd(l.trim()))
      .filter(Boolean)
      .join(' ');
    if (combined) {
      items.push({ type: 'text', text: combined });
    }
    pendingText = [];
  };

  while (i < nonEmpty.length) {
    const line = nonEmpty[i];

    // Table block
    if (isTableRow(line)) {
      flushText();
      const tableLines = [];
      while (i < nonEmpty.length && (isTableRow(nonEmpty[i]) || isTableSep(nonEmpty[i]))) {
        tableLines.push(nonEmpty[i++]);
      }
      const parsed = parseTable(tableLines);
      if (parsed && parsed.headers.some(h => h.length > 0)) {
        items.push(applyTitle({ type: 'table', headers: parsed.headers, rows: parsed.rows }));
      }
      continue;
    }

    // Bullet list block
    if (isBullet(line)) {
      flushText();
      const bulletItems = [];
      while (i < nonEmpty.length) {
        const l = nonEmpty[i];
        if (isBullet(l)) {
          bulletItems.push(extractItemText(l));
          i++;
        } else if (/^\s{2,}/.test(l) && !isTableRow(l) && !isNumbered(l)) {
          // continuation indent
          if (bulletItems.length > 0) {
            bulletItems[bulletItems.length - 1] += ' ' + stripMd(l.trim());
          }
          i++;
        } else {
          break;
        }
      }
      if (bulletItems.length > 0) {
        items.push(applyTitle({ type: 'list', items: bulletItems }));
      }
      continue;
    }

    // Numbered list block
    if (isNumbered(line)) {
      flushText();
      const steps = [];
      while (i < nonEmpty.length) {
        const l = nonEmpty[i];
        if (isNumbered(l)) {
          steps.push(extractItemText(l));
          i++;
        } else if (/^\s{2,}/.test(l) && !isTableRow(l) && !isBullet(l) && !isNumbered(l)) {
          if (steps.length > 0) {
            steps[steps.length - 1] += ' ' + stripMd(l.trim());
          }
          i++;
        } else {
          break;
        }
      }
      if (steps.length > 0) {
        items.push(applyTitle({ type: 'process', steps }));
      }
      continue;
    }

    // Regular text
    pendingText.push(line);
    i++;
  }

  flushText();

  // If blockTitle was never applied (e.g. only plain text), apply to first item
  if (blockTitle && !usedTitle && items.length > 0) {
    items[0].title = blockTitle;
  }

  return items;
}

// Parse a full markdown file into an array of subsection objects
function parseMarkdownFile(mdContent) {
  const lines = mdContent.split('\n');
  const subsections = [];

  let inContent = false;
  let currentSub = null;   // { id, title, contentItems }
  let currentGroup = null; // { title, lines }

  const flushGroup = () => {
    if (!currentSub || !currentGroup) return;
    const items = linesToContentItems(currentGroup.lines, currentGroup.title || null);
    currentSub.contentItems.push(...items);
    currentGroup = null;
  };

  const flushSub = () => {
    flushGroup();
    if (currentSub) {
      subsections.push({
        id: currentSub.id,
        title: currentSub.title,
        content: currentSub.contentItems
      });
    }
    currentSub = null;
  };

  // Matches ## X.Y or ## X.Y.Z (with optional bold markers)
  const subHeaderRe = /^##\s+\**\s*(\d+\.\d+(?:\.\d+)*)\s*(.*)/;

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const trimmed = raw.trim();

    // Skip image references
    if (/^!\[\]/.test(trimmed)) continue;

    // Skip lines that are just # markers with no content
    if (/^#{1,6}\s*$/.test(trimmed)) continue;

    // Skip ToC link lines: [text](#anchor) or **[text](#anchor)**
    if (/^\**\[.+\]\(#.+\)\**$/.test(trimmed)) continue;

    // Detect subsection header (## X.Y ...)
    const subMatch = trimmed.match(subHeaderRe);
    if (subMatch) {
      inContent = true;
      flushSub();
      const subId = subMatch[1];
      const subTitle = cleanHeader(subMatch[2]);
      currentSub = { id: subId, title: subTitle, contentItems: [] };
      currentGroup = { title: null, lines: [] };
      continue;
    }

    if (!inContent) continue;
    if (!currentSub) continue;

    // ### content group header (not ####)
    if (/^###[^#]/.test(trimmed)) {
      flushGroup();
      const gTitle = cleanHeader(trimmed);
      currentGroup = { title: gTitle || null, lines: [] };
      continue;
    }

    // #### sub-group header
    if (/^####[^#]/.test(trimmed)) {
      flushGroup();
      const gTitle = cleanHeader(trimmed);
      currentGroup = { title: gTitle || null, lines: [] };
      continue;
    }

    // Main # section header (not ##)
    if (/^#[^#]/.test(trimmed)) continue;

    // Add line to current group
    if (currentGroup) {
      currentGroup.lines.push(raw);
    }
  }

  flushSub();
  return subsections;
}

// Extract section title from markdown filename
function getTitleFromFilename(filename) {
  // "Section 15 - Risk Management, Emergency Preparedness, and Business Continuity.md"
  const m = filename.match(/^Section\s+\d+\s*[-–]\s*(.+?)\.md$/i);
  if (m) return m[1].trim().replace(/_/g, ':');
  return null;
}

// Main
function main() {
  const files = fs.readdirSync(SECTIONS_DIR);
  const mdFiles = files
    .filter(f => f.endsWith('.md') && /^Section\s+\d+/.test(f))
    .sort((a, b) => {
      const na = parseInt(a.match(/\d+/)[0]);
      const nb = parseInt(b.match(/\d+/)[0]);
      return na - nb;
    });

  const results = { updated: [], failed: [] };

  for (const mdFile of mdFiles) {
    const numMatch = mdFile.match(/^Section\s+(\d+)/);
    if (!numMatch) continue;

    const sectionNum = parseInt(numMatch[1]);
    const jsonFileName = `Section ${padNum(sectionNum)}.json`;
    const jsonPath = path.join(SECTIONS_DIR, jsonFileName);
    const mdPath = path.join(SECTIONS_DIR, mdFile);

    const mdContent = fs.readFileSync(mdPath, 'utf8');
    const parsedSubs = parseMarkdownFile(mdContent);

    if (parsedSubs.length === 0) {
      console.warn(`⚠️  No subsections parsed in ${mdFile}`);
      results.failed.push(mdFile);
      continue;
    }

    // Preserve existing metadata (lastUpdated etc.) if available
    let existing = null;
    try { existing = JSON.parse(fs.readFileSync(jsonPath, 'utf8')); } catch {}

    const mdTitle = getTitleFromFilename(mdFile);

    const newJson = {
      id: padNum(sectionNum),
      title: mdTitle || (existing ? existing.title : `Section ${sectionNum}`),
      lastUpdated: existing ? existing.lastUpdated : '2025-07-30',
      subsections: parsedSubs
    };

    fs.writeFileSync(jsonPath, JSON.stringify(newJson, null, 2), 'utf8');
    console.log(`✅  Section ${padNum(sectionNum)} — ${parsedSubs.length} subsections`);
    results.updated.push(jsonFileName);
  }

  console.log(`\n✅  Done: ${results.updated.length}/23 files updated`);
  if (results.failed.length > 0) {
    console.log(`⚠️  Failed: ${results.failed.join(', ')}`);
  }
}

main();
