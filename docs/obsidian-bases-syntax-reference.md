# Obsidian Bases — Official Syntax Reference + Flowershow Support Status

> Captured from the official Obsidian Help docs on 2026-09-09. This is a faithful
> transcription of the full Bases syntax, **annotated with Flowershow's current
> support status** (audited 2026-09-09).
>
> **Sources (official):**
> - Syntax: https://obsidian.md/help/bases/syntax
> - Functions: https://obsidian.md/help/bases/functions
> - Formulas: https://obsidian.md/help/bases/formulas
> - Views: https://obsidian.md/help/bases/views
>
> **Flowershow implementation audited:**
> - `apps/flowershow/lib/bases-parse.ts` — expression parser (jsep → AST)
> - `apps/flowershow/lib/bases-expr.ts` — AST node types
> - `apps/flowershow/lib/remark-obsidian-bases.ts` — YAML parsing, filtering, formula/summary eval, view node creation
> - `apps/flowershow/components/public/mdx/obsidian-bases-views.tsx` — view switcher
> - `apps/flowershow/components/public/mdx/obsidian-base-{table,cards,list}.tsx` — renderers
>
> Layouts are intentionally excluded per scope.

## Support legend

- ✅ **Supported** — works as documented.
- ⚠️ **Partial** — works with caveats or only in some contexts (see note).
- ❌ **Not supported** — parses/errors/ignored, or produces wrong output.

### Cross-cutting caveats (apply throughout)

1. **Input form.** Flowershow only transforms a fenced ` ```base ` **code block** (`remark-obsidian-bases.ts` matches `node.lang === 'base'`). Embedding a standalone `.base` file via `![[File.base]]` / `![[File.base#View]]` is **❌ not handled** by this plugin.
2. ~~**Empty filters ⇒ no results.**~~ **FIXED (2026-09-09).** No filters now queries the whole vault (`where: { siteId }`), matching the official default. `buildFilterStrategy` is only invoked when filters are present. ✅
3. **Two evaluation paths.** Simple filter statements may compile to a Prisma `where` (DB-level); anything else falls back to a JS `postFilter`/formula evaluator (`evalExpr`). Some functions only exist in one path (noted per item).
4. **Expression parser limits (`bases-parse.ts` / jsep).** The `convertJsep` converter only handles `Literal`, `Identifier`, `Unary`, `Binary`, `Logical`, `Member` (non-computed only), and `Call`. Consequences used below: **array literals** `[1,2,3]` ❌, **object literals** `{...}` ❌, **regex literals** `/abc/` ❌, **computed/index member access** `x[0]` / `note["x"]` ❌ (the converter reads `property.name` and ignores computed access — `bases-parse.ts:54-61`).

---

## 1. Overview

- A base is saved as a `.base` file.
- Bases are usually edited via the app UI, but the syntax can be edited manually and **embedded in a code block**.
- The Bases syntax defines **Views, filters, and formulas**.
- A base file **must be valid YAML** conforming to the schema below.
- By default a base includes **every file in the vault**. There is no `from`/`source` like SQL or Dataview; you narrow the dataset with `filters`.

### Top-level schema keys

| Key | Purpose | Flowershow |
|-----|---------|-----------|
| `filters` | Global conditions that narrow the dataset for all views. | ✅ |
| `formulas` | Calculated properties available across all views. | ✅ |
| `properties` | Per-property display configuration (e.g. display names). | ✅ |
| `summaries` | Custom summary (aggregation) formulas. | ❌ (top-level custom summaries ignored — see §5) |
| `views` | List of view definitions (how data is rendered). | ✅ |

### Full example

```yaml
filters:
  or:
    - file.hasTag("tag")
    - and:
        - file.hasTag("book")
        - file.hasLink("Textbook")
    - not:
        - file.hasTag("book")
        - file.inFolder("Required Reading")
formulas:
  formatted_price: 'if(price, price.toFixed(2) + " dollars")'
  ppu: "(price / age).toFixed(2)"
properties:
  status:
    displayName: Status
  formula.formatted_price:
    displayName: "Price"
  file.ext:
    displayName: Extension
summaries:
  customAverage: 'values.mean().round(3)'
views:
  - type: table
    name: "My table"
    limit: 10
    groupBy:
      property: note.age
      direction: DESC
    filters:
      and:
        - 'status != "done"'
        - or:
            - "formula.ppu > 5"
            - "price > 2.1"
    order:
      - file.name
      - file.ext
      - note.age
      - formula.ppu
      - formula.formatted_price
    summaries:
      formula.ppu: Average
```

> Note: in the example above, Flowershow would **not** render `file.hasTag`/`file.hasLink` filters (❌), would **ignore** `limit` and `groupBy` (❌), and the top-level `summaries.customAverage` (❌). The rest works.

---

## 2. Filters

Two levels of filters exist:

1. **Global filters** (top-level `filters:`) — apply to all views. ✅
2. **View filters** (`filters:` inside a view) — apply only to that view. ✅

The two are **AND-concatenated** when evaluating a view. ✅ (`remark-obsidian-bases.ts:171-186`).

### Structure

The `filters` section contains either:

- a single filter **statement as a string** ✅, or
- a recursively defined **filter object** with exactly one of `and` / `or` / `not` ✅ (`buildFilterStrategy`, recursion supported).

A **filter statement** is a line that evaluates to truthy/falsey. It can be:

- A basic comparison using arithmetic/comparison operators. ✅
- A function call (built-in, or plugin-added). ⚠️ (only the functions listed in §10 as supported; plugin functions ❌).

> The syntax and available functions for filters and formulas are the same.

### Examples

```yaml
# Simple filter:
filters:
  and:
    - file.hasTag("tag")      # ❌ hasTag not implemented

# Complex filter:
filters:
  or:
    - file.hasTag("tag")      # ❌
    - and:
        - file.hasTag("book") # ❌
        - file.hasLink("Textbook") # ❌
    - not:
        - file.hasTag("book") # ❌
        - file.inFolder("Required Reading") # ✅ (top-level filter statement)
```

### Conjunctions (UI semantics)

- **and** — all conditions must be met. ✅
- **or** — any condition must be met. ✅
- **not** — hidden if any condition is met. ⚠️ (supported, but Prisma `NOT` handling of multiple children may not match Obsidian semantics exactly — verify).

Filter groups can be nested. ✅

---

## 3. Formulas

The `formulas` section defines formula properties displayed across all views. ✅ (`remark-obsidian-bases.ts:245-270`, computed per row before post-filtering so formulas are usable in filters and sorts).

```yaml
formulas:
  formatted_price: 'if(price, price.toFixed(2) + " dollars")'
  ppu: "(price / age).toFixed(2)"
```

Rules:

- Formula properties support arithmetic operators and built-in functions. ✅ (subject to per-function support in §10)
- A formula may reference other formula properties, **no circular references**. ⚠️ Referencing other formulas works via the `formula.` proxy (`getComputedProperty`), but there is **no circular-reference guard** — a cycle would recurse until a stack overflow (the docstring claims detection, code does not implement it). ❌ for the guard.
- Formula properties are **stored as strings in YAML**; output type follows the data/functions. ✅
- **Nested quotes required** for text literals inside YAML. ✅ (YAML-level; not Flowershow-specific)

### Referencing properties inside formulas

- **Note properties** — `note.price` ✅, or bare `price` ✅ (bare identifier resolves to `metadata[name]`, `evalExpr` `Identifier` case). `note["price"]` ❌ (computed member).
- **File properties** — `file.size`, `file.ext`. ⚠️ Only a subset resolves (see §7 / §10 File type). Direct object refs like `file.hasLink()` ❌.
- **Formula properties** — `formula.formatted_price`. ✅

### Formula examples (from Formulas page)

| Goal | Formula | Flowershow |
|------|---------|-----------|
| Deadline 2 weeks after start | `start_date + "2w"` | ❌ (date+duration arithmetic; does JS string concat) |
| Overdue status | `if(due_date < now() && status != "Done", "Overdue", "")` | ⚠️ (`if`/`now`/comparison ✅, but `due_date < now()` requires a real Date value in frontmatter; date compare works if both are Dates) |
| Format currency | `if(price, "$" + price.toFixed(2), "")` | ✅ |
| Count list items | `tasks.length` | ✅ |
| Priority score | `(impact * urgency) / effort` | ✅ |
| Combine text | `first_name + " " + last_name` | ✅ |
| Reference other formula | `formula.price_per_unit * 1.1` | ✅ |

---

## 4. Properties (configuration section)

The `properties` section stores per-property configuration; views decide how to use it (e.g. tables use `displayName` for column headers). ✅ — passed through to renderers as `properties` prop; `displayName` consumed by table/cards.

```yaml
properties:
  status:
    displayName: Status
  formula.formatted_price:
    displayName: "Price"
  file.ext:
    displayName: Extension
```

- **Display names are not used in filters or formulas** (display-only). ✅ (matches — they never enter expression eval)
- Other per-property config keys beyond `displayName` are accepted in the type (`[key: string]: any`) but only `displayName` is consumed. ⚠️

---

## 5. Summaries (custom summary formulas)

The **top-level** `summaries` section defines custom summary formulas, in addition to built-in defaults.

```yaml
summaries:
  customAverage: 'values.mean().round(3)'
```

**Flowershow: ❌ not supported.** The top-level `summaries` map is parsed into the `BaseQuery` type but never evaluated. Only the **view-level** `summaries` (property → *named built-in* summary) is handled, via `calculateSummary` which switches on hard-coded names. Custom summary formulas, and the `values` keyword / `values.mean()`, are ❌.

- Inside a summary formula, `values` is the list of all values for that property. ❌
- A summary formula must return a single Value. ❌ (n/a — not evaluated)

### Default summary formulas

| Name | Input Type | Description | Flowershow |
|------|-----------|-------------|-----------|
| Average | Number | Mean of all numbers. | ✅ |
| Min | Number | Smallest number. | ✅ |
| Max | Number | Largest number. | ✅ |
| Sum | Number | Sum of all numbers. | ✅ |
| Range | Number | Difference between Max and Min. | ✅ |
| Median | Number | Median. | ✅ |
| Stddev | Number | Standard deviation. | ✅ |
| Earliest | Date | Earliest date. | ✅ |
| Latest | Date | Latest date. | ✅ |
| Range | Date | Difference between Latest and Earliest. | ❌ (only numeric Range implemented) |
| Checked | Boolean | Count of `true` values. | ✅ |
| Unchecked | Boolean | Count of `false` values. | ✅ |
| Empty | Any | Count of empty values. | ✅ |
| Filled | Any | Count of non-empty values. | ✅ |
| Unique | Any | Count of unique values. | ✅ |

> Additional caveat: `calculateSummary` reads values from `row.metadata?.[column]`, which does **not** resolve `formula.*` columns (those live under `metadata.__formulas`). So **summaries applied to formula properties ⚠️ return null/empty.**

---

## 6. Views

The `views` section is a list; each entry defines a separate view of the same data. ✅ Multiple views render a dropdown switcher (`obsidian-bases-views.tsx`).

```yaml
views:
  - type: table
    name: "My table"
    limit: 10
    groupBy:
      property: note.age
      direction: DESC
    filters:
      and:
        - 'status != "done"'
        - or:
            - "formula.ppu > 5"
            - "price > 2.1"
    order:
      - file.name
      - file.ext
      - note.age
      - formula.ppu
      - formula.formatted_price
    summaries:
      formula.ppu: Average
```

### View keys

| Key | Description | Flowershow |
|-----|-------------|-----------|
| `type` | Selects the view type. | ⚠️ (only table/cards/list — see below) |
| `name` | Display name / default view. | ✅ |
| `filters` | View-scoped filters. | ✅ |
| `groupBy` | `{ property, direction }` — group rows by a property's value. | ❌ (never read; no grouping in any renderer) |
| `order` | List of property names → column/field order. | ✅ |
| `limit` | Max number of results. | ❌ (never read/applied) |
| `summaries` | property → named summary aggregation. | ⚠️ (built-in names only; see §5) |
| `sort` | **(non-standard)** `[{ property, direction }]` sort list. | ⚠️ Flowershow-specific extension; **not** in the official syntax spec, but implemented (`remark-obsidian-bases.ts:208`). Official spec uses `groupBy` + UI sorting. |

> **Sorting note:** the official *syntax* page documents `order` and `groupBy` only; it does not document a per-view `sort` key. Flowershow implements `sort` (array) and falls back to `order` for sort direction. `file.name` sorts at the DB level; everything else sorts in memory.

### `groupBy` shape (❌ unsupported)

```yaml
groupBy:
  property: note.age
  direction: DESC   # ASC | DESC
```

Currently, grouping by only one property is supported (Obsidian). Flowershow: ❌ entirely.

### View-level `summaries` shape

```yaml
summaries:
  formula.ppu: Average   # property -> named summary
```
⚠️ built-in named summaries only; not on formula columns (see §5).

### Built-in view layouts (types)

| Layout | Description | App version | Flowershow |
|--------|-------------|-------------|-----------|
| Table | Files as rows; columns from properties. | 1.9 | ✅ `ObsidianBaseTable` |
| Cards | Grid of cards; gallery with images. | 1.9 | ✅ `ObsidianBaseCards` (supports `cardSize`, `image`, `imageFit`, `imageAspectRatio`) |
| List | Bulleted/numbered list. | 1.10 | ✅ `ObsidianBaseList` |
| Kanban | Cards in columns by grouped property. | 1.14 | ❌ (falls back to table) |
| Map | Pins on a map (Maps plugin). | 1.10 | ❌ (falls back to table) |

> Unknown `type` values fall through to the table renderer (`obsidian-bases-views.tsx:96`).

### Embedding a base / view

- `![[File.base]]` (first view). ❌ not handled by the remark plugin.
- `![[File.base#View]]` (specific view). ❌.

---

## 7. Property kinds

Three kinds of properties:

1. **Note properties** — frontmatter of Markdown files; `note.author` or bare `author`. ✅
2. **File properties** — describe the file; all file types. ⚠️ (limited subset — table below)
3. **Formula properties** — `formula.name`. ✅

### File properties (from Syntax page)

Resolution differs by path. In the **Prisma filter path** (`resolveProperty`) only `ext`, `path`, `size`, `folder`, `name` are mapped. In the **JS eval path** (`getFileProperty`) only `path`, `ext`, `name`, `folder` are returned. So:

| Property | Type | Flowershow | Note |
|----------|------|-----------|------|
| `file.backlinks` | List | ✅ | JS eval path; incoming links' source paths (Link table joined into query) |
| `file.ctime` | Date | ✅ | JS eval path; maps to DB `createdAt` (not filesystem/git time) |
| `file.embeds` | List | ❌ | |
| `file.ext` | String | ✅ | both paths |
| `file.file` | File | ❌ | File object unsupported |
| `file.folder` | String | ✅ | both paths (computed from path; JS post-filter for comparisons) |
| `file.links` | List | ✅ | JS eval path; outgoing link target paths (Link table joined into query) |
| `file.mtime` | Date | ✅ | JS eval path; maps to DB `updatedAt` (not filesystem/git time) |
| `file.name` | String | ✅ | both paths |
| `file.path` | String | ✅ | both paths |
| `file.properties` | Object | ❌ | |
| `file.size` | Number | ✅ | filter/Prisma comparison ✅; JS eval now resolves via the selected `size` field |
| `file.tags` | List | ✅ | JS eval path; normalized frontmatter tags only (inline body `#tags` not indexed) |

> The **Functions page** also lists `file.basename` (✅ as of 2026-09-09 — filename with extension, JS eval path).

### Access properties with `this`

Use `this` to access file properties (base file / embedding file / active file depending on context).

**Flowershow: ❌ not supported.** `this` is not handled in `evalExpr` (`Identifier` case only knows `file`, `formula`, `note`, globals, and bare frontmatter keys). `this.file.*`, active-file queries, and `file.hasLink(this.file)` backlink replication are all ❌.

---

## 8. Operators

### Arithmetic operators — ✅

| Operator | Description | Flowershow |
|----------|-------------|-----------|
| `+` | plus | ✅ |
| `-` | minus | ✅ |
| `*` | multiply | ✅ |
| `/` | divide | ✅ |
| `%` | modulo | ✅ |
| `( )` | parenthesis | ✅ |

### Date arithmetic — ✅ (implemented 2026-09-09)

Dates modified by adding/subtracting **durations** with these units:

| Unit | Duration |
|------|----------|
| `y`, `year`, `years` | year |
| `M`, `month`, `months` | month |
| `d`, `day`, `days` | day |
| `w`, `week`, `weeks` | week |
| `h`, `hour`, `hours` | hour |
| `m`, `minute`, `minutes` | minute |
| `s`, `second`, `seconds` | second |

**Flowershow: ❌.** There is no duration parsing and no Date + duration-string handling. `date + "1M"` evaluates via JS `+` (Date coerced to string + `"1M"`), producing garbage. Related expectations that all ❌:

- `now() + "1 day"`, `today() + "7d"` ❌
- `file.mtime > now() - "1 week"` ❌ (also `file.mtime` ❌)
- `date("2024-12-01") + "1M" + "4h" + "3m"` ❌
- Subtracting two dates for a ms difference ⚠️ (JS `Date - Date` does yield ms, so `now() - file.ctime` would work *if* `file.ctime` were supported — it is ❌)
- `datetime.date()` ✅ (Date method exists), `datetime.format("YYYY-MM-DD")` ⚠️ (subset of tokens — see §10 Date)

### Comparison operators — ✅

| Operator | Description | Flowershow |
|----------|-------------|-----------|
| `==` | equals | ✅ |
| `!=` | not equal | ✅ |
| `>` | greater than | ✅ |
| `<` | less than | ✅ |
| `>=` | greater than or equal | ✅ |
| `<=` | less than or equal | ✅ |

### Boolean operators — ✅

| Operator | Description | Flowershow |
|----------|-------------|-----------|
| `!` | logical not | ✅ |
| `&&` | logical and | ✅ |
| `\|\|` | logical or | ✅ |

---

## 9. Type system

| Type | Flowershow |
|------|-----------|
| Strings (`"message"`, `'x'`) | ✅ |
| Numbers (`1`, `(2.5)`) | ✅ |
| Booleans (`true`/`false`) | ✅ |
| Dates | ✅ construction (`date()`, `now()`, `today()`) and **arithmetic** (Date +/- duration; see §8) |
| Durations | ✅ (`duration()` + unit parsing y/M/w/d/h/m/s, compound; represented as a branded object, applied in Date arithmetic) |
| Lists | ⚠️ `list()` wrapping ✅ and methods on existing array values ✅; **list literals `[1,2,3]` ❌** (parser); index access `x[0]` ❌ |
| Objects | ⚠️ methods on existing objects ✅; **object literals `{...}` ❌**; key access `x["k"]` ❌ (dot access `x.k` ✅) |
| Files | ❌ (File objects unsupported beyond the file-field subset) |
| Links | ❌ (no Link type — see §10 Link) |

---

## 10. Functions

Functions manipulate property data in filters and formulas. **Bases functions follow JavaScript behavior.** Aside from global functions, most depend on the value type.

> General caveat: functions are only usable where the parser can build them. Since regex/array/object literals don't parse (see cross-cutting caveat 4), any function needing those as arguments is unusable even if the method exists.

### Global functions (no type)

| Signature | Description | Flowershow |
|-----------|-------------|-----------|
| `escapeHTML(html): string` | Escape HTML special chars. | ✅ |
| `date(string): date` | Parse `YYYY-MM-DD HH:mm:ss` to a date. | ⚠️ uses JS `new Date()` (looser parsing than the documented format) |
| `duration(value): duration` | Parse a duration string. | ✅ (units y/M/w/d/h/m/s, compound; usable in Date +/- arithmetic) |
| `file(path\|file\|url): file` | File object for a path. | ❌ |
| `html(html): html` | Render string as HTML. | ✅ (returns a marker object) |
| `if(cond, t, f?): any` | Conditional. | ✅ |
| `image(path\|file\|url): image` | Render an image. | ✅ (marker object) |
| `icon(name): icon` | Render a Lucide icon. | ✅ (marker object) |
| `link(path\|file, display?): Link` | Build a Link. | ❌ |
| `list(element): List` | Wrap a value in a list. | ✅ |
| `max(...numbers): number` | Largest. | ✅ |
| `min(...numbers): number` | Smallest. | ✅ |
| `now(): date` | Current datetime. | ✅ |
| `number(any): number` | Coerce to number. | ⚠️ (uses `Number()`; does not special-case dates→ms or booleans→1/0 per docs) |
| `today(): date` | Current date at midnight. | ✅ |
| `random(): number` | Random 0–1. | ❌ |

### Any type

| Signature | Description | Flowershow |
|-----------|-------------|-----------|
| `any.isTruthy(): boolean` | Coerce to boolean. | ✅ |
| `any.isType(type): boolean` | Type check. | ❌ |
| `any.toString(): string` | String representation. | ✅ |

### Date type

**Fields** — all ✅: `date.year`, `date.month` (1–12), `date.day`, `date.hour`, `date.minute`, `date.second`, `date.millisecond`.

| Function | Description | Flowershow |
|----------|-------------|-----------|
| `date.date()` | Date with time removed. | ✅ |
| `date.format(fmt)` | Moment.js-style format. | ⚠️ subset only: `YYYY YY MM M DD D HH H mm m ss s SSS`. No month/day names, no 12-hour/AM-PM, no timezone tokens. |
| `date.time()` | Time portion string. | ✅ |
| `date.relative()` | Human-readable relative time. | ✅ (approximate: months=30d, years=365d) |
| `date.isEmpty()` | Returns false. | ✅ |

### String type

**Fields:** `string.length` ✅.

| Function | Flowershow | Note |
|----------|-----------|------|
| `contains(value)` | ✅ | |
| `containsAll(...values)` | ✅ | |
| `containsAny(...values)` | ✅ | |
| `endsWith(query)` | ✅ | |
| `isEmpty()` | ✅ | |
| `lower()` | ✅ | |
| `replace(pattern, repl)` | ⚠️ | string pattern ✅; regex pattern + `$1` capture groups ❌ (no regex literals) |
| `repeat(count)` | ✅ | |
| `reverse()` | ✅ | |
| `slice(start, end?)` | ✅ | |
| `split(sep, n?)` | ⚠️ | string separator ✅; regex separator ❌ |
| `startsWith(query)` | ✅ | |
| `title()` | ✅ | |
| `trim()` | ✅ | |

### Number type

| Function | Flowershow |
|----------|-----------|
| `abs()` | ✅ |
| `ceil()` | ✅ |
| `floor()` | ✅ |
| `isEmpty()` | ✅ |
| `round(digits?)` | ✅ |
| `toFixed(precision)` | ✅ |

### List type

**Fields:** `list.length` ✅.

| Function | Flowershow | Note |
|----------|-----------|------|
| `contains(value)` | ✅ | |
| `containsAll(...values)` | ✅ | |
| `containsAny(...values)` | ✅ | |
| `filter(expr)` | ❌ | only accepts a JS function; parser never produces one, so `list.filter(value > 2)` is a no-op/ineffective |
| `flat()` | ✅ | |
| `isEmpty()` | ✅ | |
| `join(sep)` | ✅ | |
| `map(expr)` | ❌ | same limitation as `filter` |
| `reduce(expr, acc)` | ❌ | same limitation (`value`/`index`/`acc` context not implemented) |
| `reverse()` | ✅ | |
| `slice(start, end?)` | ✅ | |
| `sort()` | ✅ | |
| `unique()` | ✅ | |

> `filter`/`map`/`reduce` need lambda-style expression evaluation (`value`, `index`, `acc` bound per element). Flowershow's `evalExpr` has no such binding, so these are effectively ❌.

### Link type — ❌ (whole type unsupported)

| Function | Flowershow |
|----------|-----------|
| `link.asFile()` | ❌ |
| `link.linksTo(file)` | ❌ |

### File type

**Fields** (Functions page): see §7 table. Supported subset: `file.name` ✅, `file.path` ✅, `file.folder` ✅, `file.ext` ✅, `file.size` ⚠️. All others (`basename`, `properties`, `tags`, `links`, `ctime`, `mtime`) ❌.

| Function | Description | Flowershow |
|----------|-------------|-----------|
| `file.asLink(display?)` | File → Link. | ❌ |
| `file.hasLink(otherFile)` | True if file links to otherFile. | ✅ (matches loaded outgoing links by basename; JS eval path) |
| `file.hasProperty(name)` | True if property present. | ⚠️ only as a top-level filter statement (compiles to Prisma); not in general formula/`evalExpr` context |
| `file.hasTag(...values)` | True if any tag matches (incl. nested). | ✅ (frontmatter tags only; nested matching; JS eval path) |
| `file.inFolder(folder)` | True if in folder/subfolder. | ⚠️ only as a top-level filter statement (Prisma `startsWith`); not in general `evalExpr` context |

### Object type

| Function | Flowershow |
|----------|-----------|
| `object.isEmpty()` | ✅ |
| `object.keys()` | ✅ |
| `object.values()` | ✅ |

### Regular expression type — ❌ (unusable)

| Function | Flowershow |
|----------|-----------|
| `regexp.matches(value)` | ❌ (method exists in `resolveMemberAccess`, but regex literals `/abc/` don't parse, so a RegExp can never be constructed) |

---

## 11. Support summary (for the gap-closing backlog)

High-impact gaps, roughly ordered by likely user pain:

1. ✅ **DONE (2026-09-09)** **Empty-filter default** — no filters now returns the whole vault.
2. ✅ **DONE (2026-09-09)** **`file.hasTag` / `file.hasLink`** — implemented in the JS eval path (usable in both filters and formulas). `hasTag` matches nested frontmatter tags (`book` matches `book/fiction`); **caveat:** frontmatter tags only — inline body `#tags` are not indexed. `hasLink` matches loaded outgoing links by basename.
3. ✅ **DONE (2026-09-09)** **Date + duration arithmetic** — `date + "1M"`, `now() - "1 week"`, compound `"1y2M3d"`, and the `duration()` global. Calendar-aware month/year math. `date - date` still yields ms.
4. ✅ **DONE (2026-09-09)** **`file.mtime` / `ctime` / `tags` / `basename` / `links` / `backlinks`** — resolved in the JS eval path. **Caveat:** `mtime`/`ctime` map to the Blob record's DB `updatedAt`/`createdAt` (not filesystem/git times — the only per-file time data stored). `links`/`backlinks` come from the `Link` table (now joined into the base query).
5. **`this` object** — active-file / embedding-file queries, backlink panes. ❌
6. **`groupBy`** — grouping is a headline Bases feature. ❌
7. **`limit`** — trivially expected, silently ignored. ❌
8. **Kanban & Map view types** — fall back to table. ❌
9. **list `filter` / `map` / `reduce`** with expressions — need lambda binding. ❌
10. **Custom top-level `summaries`** (+ `values`, `values.mean()`), and **Date `Range`**, and summaries on **formula.*** columns. ❌/⚠️
11. **Parser literals** — array `[...]`, object `{...}`, regex `/.../`, and **index/computed access** `x[0]` / `note["x"]`. ❌ (blocks regex functions and several idioms)
12. **`.base` file embeds** `![[File.base]]` / `#View`. ❌
13. **Global functions** `link()`, `file()`, `random()`; **Link type**; `any.isType()`. ❌
14. **Circular-reference guard** for formulas — claimed but not implemented. ❌
15. **`number()` coercion** and **`date()` format strictness** deviate from spec. ⚠️
16. **`date.format()`** supports only a token subset. ⚠️

What is solid today: top-level schema keys (except `summaries`), and/or/not filter recursion, global+view filter AND-combine, formulas with arithmetic + most String/Number/Date/Object methods, `if`/`now`/`today`/`min`/`max`/`list`/`icon`/`image`/`html`/`escapeHTML`, table/cards/list views, `order`, `displayName`, and the built-in numeric/boolean/most date summaries.
