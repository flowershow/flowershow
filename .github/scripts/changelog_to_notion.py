#!/usr/bin/env python3
"""
Called by the changelog-to-notion GitHub Action.
Reads a changelog file and creates a Content Idea entry in Notion.

Usage: python3 changelog_to_notion.py <path-to-changelog-file>
"""

import os
import sys
import yaml
from notion_client import Client

NOTION_TOKEN = os.environ["NOTION_TOKEN"]
CONTENT_CALENDAR_DB = "32f93ae3f9b280189d9dd10aaf8998de"

# Default platforms for changelog entries
DEFAULT_PLATFORMS = [
    "X", "Bluesky", "Discord",
    "r/ObsidianMD", "r/PKM", "r/selfhosted", "r/Markdown", "r/flowershow",
    "Obsidian Forum", "Newsletter"
]

notion = Client(auth=NOTION_TOKEN)


def _data_source_id(database_id: str) -> str:
    """Resolve the first data source ID for a Notion database (2025-09-03 API)."""
    db = notion.databases.retrieve(database_id)
    sources = db.get("data_sources", [])
    if not sources:
        raise RuntimeError(f"No data sources on database {database_id}")
    return sources[0]["id"]


CONTENT_CALENDAR_DS = _data_source_id(CONTENT_CALENDAR_DB)


def parse_changelog_file(path: str) -> tuple[str, str, str]:
    """Returns (title, description, full_content)."""
    with open(path, "r") as f:
        raw = f.read()

    title = os.path.basename(path).replace(".md", "")
    description = ""
    content = raw

    if raw.startswith("---"):
        parts = raw.split("---", 2)
        if len(parts) >= 3:
            try:
                fm = yaml.safe_load(parts[1])
                title = fm.get("title", title)
                description = fm.get("description", "")
                content = parts[2].strip()
            except yaml.YAMLError:
                pass

    return title, description, raw


REPO_RAW_URL = "https://github.com/flowershow/flowershow/blob/main"


def _chunk_text(text: str, size: int = 1900) -> list[str]:
    """Split text into chunks of at most `size` chars, breaking on newlines when possible."""
    chunks = []
    while text:
        if len(text) <= size:
            chunks.append(text)
            break
        cut = text.rfind("\n", 0, size)
        if cut == -1:
            cut = size
        chunks.append(text[:cut])
        text = text[cut:].lstrip("\n")
    return chunks


def _content_to_blocks(content: str) -> list[dict]:
    """Render the changelog file as a single fenced code block of markdown."""
    blocks = []
    for chunk in _chunk_text(content):
        blocks.append({
            "object": "block",
            "type": "code",
            "code": {
                "rich_text": [{"type": "text", "text": {"content": chunk}}],
                "language": "markdown",
            },
        })
    return blocks


def create_notion_entry(title: str, description: str, content: str, source_file: str):
    source_url = f"{REPO_RAW_URL}/{source_file}"

    notion.pages.create(
        parent={"data_source_id": CONTENT_CALENDAR_DS},
        properties={
            "Content Title": {
                "title": [{"text": {"content": title}}]
            },
            "Type": {
                "select": {"name": "Changelog"}
            },
            "Source": {
                "rich_text": [{
                    "type": "text",
                    "text": {"content": source_url, "link": {"url": source_url}},
                }]
            },
            "Target Platforms": {
                "multi_select": [{"name": p} for p in DEFAULT_PLATFORMS]
            },
            "Status": {
                "status": {"name": "Idea"}
            },
        },
        children=_content_to_blocks(content),
    )
    print(f"Created Notion entry: {title}")


def main():
    if len(sys.argv) < 2:
        print("Usage: changelog_to_notion.py <path-to-file>")
        sys.exit(1)

    path = sys.argv[1]
    title, description, content = parse_changelog_file(path)
    create_notion_entry(title, description, content, path)


if __name__ == "__main__":
    main()
