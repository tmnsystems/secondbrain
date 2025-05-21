#!/usr/bin/env node

/**
 * Script to catalog Notion-related files and markdown files in the SecondBrain repo.
 * Follows Reviewer Protocol via verifyReviewerApproval.
 */

const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const { verifyReviewerApproval } = require('../utils/reviewer');

;(async () => {
  const changeDescription = 'Catalog Notion and MD files';
  const reviewStatus = await verifyReviewerApproval(changeDescription);
  if (!reviewStatus.approved) {
    console.error(`ERROR: Reviewer approval required: ${reviewStatus.message}`);
    process.exit(1);
  }

  const rootDir = path.resolve(__dirname, '..');
  const outputPath = path.join(rootDir, 'NOTION_AND_MD_CATALOG.md');
  const lines = [];

  // Catalog Notion-related files
  lines.push('# Notion-related files', '');
  try {
    const notionFiles = execSync(`find ${rootDir} -type f \( -iname "*notion*" \)`, { encoding: 'utf8' })
      .trim()
      .split(/\r?\n/)
      .filter(Boolean);
    notionFiles.forEach(file => lines.push(`- ${path.relative(rootDir, file)}`));
  } catch {
    // ignore errors
  }

  // Catalog all markdown files
  lines.push('', '# Markdown files', '');
  try {
    const mdFiles = execSync(`find ${rootDir} -type f -iname "*.md"`, { encoding: 'utf8' })
      .trim()
      .split(/\r?\n/)
      .filter(Boolean);
    mdFiles.forEach(file => lines.push(`- ${path.relative(rootDir, file)}`));
  } catch {
    // ignore errors
  }

  // Catalog all claude.md files specifically
  lines.push('', '# claude.md files', '');
  try {
    const claudeFiles = execSync(`find ${rootDir} -type f -name "claude.md"`, { encoding: 'utf8' })
      .trim()
      .split(/\r?\n/)
      .filter(Boolean);
    claudeFiles.forEach(file => lines.push(`- ${path.relative(rootDir, file)}`));
  } catch {
    // ignore errors
  }

  fs.writeFileSync(outputPath, lines.join('\n') + '\n', 'utf8');
  console.log(`✅ Catalog written to ${outputPath}`);

  // Final verification
  const finalStatus = await verifyReviewerApproval(`${changeDescription} - implementation verified`);
  if (!finalStatus.approved) {
    console.error(`ERROR: Post-implementation approval required: ${finalStatus.message}`);
    process.exit(1);
  }
})();