---
title: Obsidian Bases Syntax (Beta)
description: Detailed reference for Obsidian Bases syntax, including filters, formulas, and view types.
---

> [!important]
> Obsidian Bases blocks are parsed in MDX mode.
> To make them work, use one of these options:
> - Set your site's global syntax mode to `mdx`
> - Set `syntaxMode: mdx` in the page frontmatter
> - Use a `.mdx` file extension (when your global syntax mode is `auto`)
>
> See [[syntax-mode|Syntax Mode Configuration]] for setup details.

## Supported Features

### Core Sections

- ✅ **Filters** - Define conditions to narrow down your dataset with `and`, `or`, and `not` logic. A block with no filters includes every page on your site.
- ✅ **Formulas** - Create computed properties using arithmetic operators and built-in functions
- ✅ **Properties** - Configure display names for your properties
- ✅ **Views** - Display your data in multiple layouts (List, Table, and Cards views)

### Properties

- ✅ **Note Properties** - Access frontmatter properties from your Markdown files
- 🚧 **File Properties** - Support for most file metadata:
  - `file.name`, `file.basename`, `file.path`, `file.folder`, `file.ext`, `file.size`
  - `file.ctime`, `file.mtime` - creation and last-modified times
  - `file.tags` - frontmatter tags (matches nested tags, e.g. `book` matches `book/fiction`)
  - `file.links`, `file.backlinks` - outgoing and incoming links
  - `file.hasProperty()`, `file.inFolder()`, `file.hasTag()`, `file.hasLink()`

  > `file.ctime` / `file.mtime` reflect when the page was last published, not local file timestamps. Tags are read from frontmatter only (inline `#tags` in the body are not indexed).

### Operators

- ✅ **Arithmetic Operators** - `+`, `-`, `*`, `/`, `%`, and parentheses
- ✅ **Comparison Operators** - `==`, `!=`, `>`, `<`, `>=`, `<=`
- ✅ **Boolean Operators** - `!`, `&&`, `||`
- ✅ **Date Arithmetic** - Add/subtract durations from dates (e.g. `date(start) + "2w"`), with `y` / `M` / `w` / `d` / `h` / `m` / `s` units and compound values like `"1y2M3d"`

### Functions

#### Global Functions
- ✅ `escapeHTML()` - Escape special characters for HTML
- ✅ `date()` - Parse date strings
- ✅ `duration()` - Parse duration strings
- ✅ `html()` - Render HTML snippets
- ✅ `if()` - Conditional logic
- ✅ `image()` - Display images
- ✅ `icon()` - Render Lucide icons
- ✅ `list()` - Create or wrap lists
- ✅ `max()` / `min()` - Find extremes
- ✅ `now()` / `today()` - Current date/time
- ✅ `number()` - Type conversion

#### Type-Specific Functions
- ✅ **Any** - `isTruthy()`, `toString()`
- ✅ **Date** - All fields (`year`, `month`, `day`, `hour`, `minute`, `second`, `millisecond`) and functions (`format()`, `relative()`, `time()`, `date()`, `isEmpty()`)
- ✅ **String** - Complete support for all string operations (`contains()`, `lower()`, `replace()`, `split()`, `trim()`, etc.)
- ✅ **Number** - All numeric functions (`abs()`, `ceil()`, `floor()`, `round()`, `toFixed()`, `isEmpty()`)
- 🚧 **List** - Most methods work (`sort()`, `contains()`, `containsAny()`, `join()`, `flat()`, `unique()`, `reverse()`, `slice()`, `isEmpty()`, `length`). `map()`, `filter()`, and `reduce()` are not yet supported (they require per-element expression evaluation).
- ✅ **Object** - `isEmpty()`, `keys()`, `values()`

### View Types

- ✅ **Table View** - Display files as rows with property columns
  - ✅ Built-in summaries (Average, Sum, Min, Max, Median, Stddev, Range)
  - ✅ Date summaries (Earliest, Latest, Range)
  - ✅ Checkbox summaries (Checked, Unchecked)
  - ✅ Generic summaries (Empty, Filled, Unique)

- ✅ **Cards View** - Gallery-like grid layout
  - ✅ Card size configuration
  - ✅ Image properties (local attachments and URLs)
  - ✅ Image fit options (Cover/Contain)
  - ✅ Image aspect ratio control
  - ✅ Use hex color codes as card backgrounds

- ✅ **List View** - Bulleted or numbered list display

## Upcoming Features

The following features are planned for future releases:

### Core Functionality
- ❌ **Custom Summaries** - Define your own summary formulas
- ❌ **`this` Context** - Access properties of the embedding file

### File Properties
- ❌ `file.embeds` - Embedded files
- ❌ `file.properties` - Full file properties object

### Functions
- ❌ `file()` - Get file objects from paths
- ❌ `link()` - Create link objects programmatically
- ❌ File functions: `asLink()`
- ❌ Link functions: `asFile()`, `linksTo()`
- ❌ List functions: `map()`, `filter()`, `reduce()`
- ❌ **Regular Expressions** - `matches()` and regex literals (e.g. `/abc/`)

### View Features
- ❌ **Map View** - Display files as pins on interactive maps
- ❌ **Row Height Control** - Customize table row heights
