const fs = require("fs");
const path = require("path");

const CHANGELOG_SRC = path.join(__dirname, "..", "CHANGELOG.md");
const CHANGELOG_DEST = path.join(
  __dirname,
  "..",
  "content",
  "flowershow-app",
  "changelog.md"
);

const FRONTMATTER = `---
title: Changelog
description: Latest changes and updates to Flowershow
showToc: false
showEditLink: false
---

`;

if (!fs.existsSync(CHANGELOG_SRC)) {
  console.log("No CHANGELOG.md found, skipping sync.");
  process.exit(0);
}

const changelog = fs.readFileSync(CHANGELOG_SRC, "utf-8");
fs.writeFileSync(CHANGELOG_DEST, FRONTMATTER + changelog);
console.log("Synced CHANGELOG.md to content/flowershow-app/changelog.md");
