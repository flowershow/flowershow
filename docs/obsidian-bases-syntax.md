# Obsidian Bases Syntax

https://help.obsidian.md/bases/syntax

Here's an example of a base file.

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
  customAverage: "values.mean().round(3)"
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

## Sections

### Filters (`filters`) ✅

By default a base includes every file in the vault. There is no `from` or `source` like in SQL or Dataview. The `filters` section lets you define conditions to narrow down the dataset.

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
```

There are two opportunities to apply filters:

1.  At the global `filters` level (shown above) where they apply to all views in the base. ✅
2.  At the `view` level where apply only to a specific view. ✅

These two sections are functionally equivalent and when evaluating for a view they will be concatenated with an `AND`.

The `filters` section contains either a single filter statement as a string, or a recursively defined filter object. Filter objects may contain one of `and`, `or`, or `not`. These keys are a heterogeneous list of other filter objects or filter statements in strings. A filter statement is a line which evaluates to truthy or falsey when applied to a note. It can be one of the following:

- A basic comparison using standard arithmetic operators.
- A function. A variety of [Functions](https://help.obsidian.md/bases/functions) are built-in, and plugins can add additional functions.

The syntax and available functions for filters and formulas are the same.

### Formulas (`formulas`) ✅

The `formulas` section defines **formula properties** that can be displayed across all views in the base file.

```yaml
formulas:
  formatted_price: 'if(price, price.toFixed(2) + " dollars")'
  ppu: "(price / age).toFixed(2)"
```

Formula properties support basic arithmetic operators and a variety of built-in [Functions](#functions). In the future, plugins will be able to add functions for use in formulas.

You can reference properties in different ways depending on their type:

- **Note properties** are properties defined in the note’s frontmatter. For example `note.price` or `note["price"]`.
  If no prefix is specified, the property is assumed to be a `note` property.
- **File properties** describe the file itself.
  For example `file.size` or `file.ext`. You can also reference the file object directly, e.g., `file.hasLink()`.
- **Formula properties** are other formulas in the base.  
  Example `formula.formatted_price`.

A formula can use values from other formula properties, as long as there’s no circular reference.

Formula properties are always stored as strings in YAML, but their actual **output data type** is determined by the type of the underlying data and the return value of any functions used.

Note the use of nested quotes is necessary to include text literals in the YAML field. Text literals must be enclosed in single or double quotes.

### Properties (`properties`) ✅

The `properties` section allows storing configuration information about each property. It is up to the individual view how to use these configuration values. For example, in tables the display name is used for the column headers.

```yaml
properties:
  status:
    displayName: Status
  formula.formatted_price:
    displayName: "Price"
  file.ext:
    displayName: Extension
```

Display names are not used in filters or formulas.

### Summaries (`summaries`) ❌

The `summaries` section can be used to define custom summary formulas. In addition to defining summary formulas here, there are several default summary formulas available.

```yaml
summaries:
  customAverage: "values.mean().round(3)"
```

In this example, the `customAverage` formula is the same as the default `Average`, except the value is rounded to a different number of places. In summary formulas, the `values` key word is a list containing all of the values for that property across every note in the result set. The summary formula should return a single `Value`.

Note that this `summaries` section is different from the `summaries` section in the view config (explained below) where summary formulas as assigned to specific properties.

#### Default Summary Formulas

| Name      | Input Type | Description                                                   |
| --------- | ---------- | ------------------------------------------------------------- |
| Average   | Number     | The mathematical mean of all numbers from the input values.   |
| Min       | Number     | The smallest number from the input values.                    |
| Max       | Number     | The largest number from the input values.                     |
| Sum       | Number     | The sum of all numbers in the input.                          |
| Range     | Number     | The difference between `Max` and `Min`.                       |
| Median    | Number     | The mathematical median of all numbers from the input values. |
| Stddev    | Number     | The standard deviation of all numbers from the input values.  |
| Earliest  | Date       | The earliest date from the input values.                      |
| Latest    | Date       | The latest date from the input values.                        |
| Range     | Date       | The difference between `Latest` and `Earliest`.               |
| Checked   | Boolean    | The number of `true` values.                                  |
| Unchecked | Boolean    | The number of `false` values.                                 |
| Empty     | Any        | The number of values in the input that are empty.             |
| Filled    | Any        | The number of values in the input that are not empty.         |
| Unique    | Any        | The number of unique values in the input.                     |

### Views (`views`) 🚧

The `views` section defines how the data can be rendered. Each entry in the `views` list defines a separate view of the same data, and there can be as many different views as needed.

Example:

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

- `type` selects from the built-in and plugin-added view types.
- `name` is the display name, and can be used to define the default view.
- `filters` are exactly the same as described above, but apply only to the view.
- `groupBy` specifies a property and sort direction. The value of the specified property for each row is used to place the row into groups.
- `summaries` maps property names to a named summary. Summaries perform an aggregation on the property across all rows.

[Views](https://help.obsidian.md/bases/views) can add additional data to store any information needed to maintain state or properly render, however plugin authors should take care to not use keys already in use by the core Bases plugin. As an example, a table view may use this to limit the number of rows or to select which column is used to sort rows and in which direction. A different view type such as a map could use this for mapping which property in the note corresponds to the latitude and longitude and which property should be displayed as the pin title.

In the future, API will allow views to read and write these values, allowing the view to build its own interface for configuration.

## Properties

There are three kinds of properties used in bases:

1.  **Note properties**, stored in frontmatter of Markdown files.
2.  **File properties**, accessible for all file types.
3.  **Formula properties**, defined in the `.base` file itself (see above).

### Note properties ✅

[Note properties](https://help.obsidian.md/properties) are only available for Markdown files, and are stored in the YAML frontmatter of each note. These properties can be accessed using the format `note.author` or simply `author` as a shorthand.

### File properties

File properties refer to the file currently being tested or evaluated. File properties are available for all [file types](https://help.obsidian.md/file-formats), including attachments.

For example, a filter `file.ext == "md"` will be true for all Markdown files and false otherwise.

| Property          | Type   | Description                                                                                                                                                                                 |
| ----------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `file.backlinks`  | List   | List of backlink files. Note: This property is performance heavy. When possible, reverse the lookup and use `file.links`. Does not automatically refresh results when the vault is changed. |
| `file.ctime`      | Date   | Created time                                                                                                                                                                                |
| `file.embeds`     | List   | List of all embeds in the note                                                                                                                                                              |
| `file.ext`        | String | File extension                                                                                                                                                                              |
| `file.file`       | File   | File object, only usable in specific functions                                                                                                                                              |
| `file.folder`     | String | Path of the file folder                                                                                                                                                                     |
| `file.links`      | List   | List of all internal links in the note, including frontmatter                                                                                                                               |
| `file.mtime`      | Date   | Modified time                                                                                                                                                                               |
| `file.name`       | String | File name                                                                                                                                                                                   |
| `file.path`       | String | Path of the file                                                                                                                                                                            |
| `file.properties` | Object | All properties on the file. Note: Does not automatically refresh results when the vault is changed.                                                                                         |
| `file.size`       | Number | File size                                                                                                                                                                                   |
| `file.tags`       | List   | List of all tags in the file content and frontmatter                                                                                                                                        |

### Access properties with `this` ❌

Use the `this` object to access file properties. What `this` refers to, will depend on where the base is displayed.

When the base is opened in main content area, `this` points to properties of the base file itself. For example, using `this.file.folder` returns the folder path where the base is located.

When the base is embedded in another file, `this` points to properties of the _embedding_ file (the note or Canvas that contains the base). For example, using `this.file.name` returns the name of the embedding file, not the base.

When the base is in a sidebar, `this` refers to the active file in the main content area. This lets you create queries based on the active file. For example, you can use `file.hasLink(this.file)` to replicate the backlinks pane.

## Operators ✅

### Arithmetic operators ✅

Arithmetic operators perform arithmetic on numbers. For example, `radius * (2 * 3.14)`.

| Operator | Description |
| -------- | ----------- |
| `+`      | plus        |
| `-`      | minus       |
| `*`      | multiply    |
| `/`      | divide      |
| `%`      | modulo      |
| `( )`    | parenthesis |

### Date arithmetic ❌

Dates can be modified by adding and subtracting durations. Duration units accept multiple formats:

| Unit                     | Duration |
| ------------------------ | -------- |
| `y`, `year`, `years`     | year     |
| `M`, `month`, `months`   | month    |
| `d`, `day`, `days`       | day      |
| `w`, `week`, `weeks`     | week     |
| `h`, `hour`, `hours`     | hour     |
| `m`, `minute`, `minutes` | minute   |
| `s`, `second`, `seconds` | second   |

To modify or offset Date objects, use the `+` or `-` operator with a duration string. For example, `date + "1M"` adds 1 month to the date, while `date - "2h"` subtracts 2 hours from the date.

The global [function](https://help.obsidian.md/bases/functions) `today()` can be used to get the current date, and `now()` can be used to get the current date with time.

- `now() + "1 day"` returns a datetime exactly 24 hours from the time of execution.
- `file.mtime > now() - "1 week"` returns `true` if the file was modified within the last week.
- `date("2024-12-01") + "1M" + "4h" + "3m"` returns a Date object representing `2025-01-01 04:03:00`.
- Subtract two dates to get the millisecond difference between the two, for example, `now() - file.ctime`.
- To get the date portion of a Date with time, use `datetime.date()`.
- To format a Date object, use the `format()` function, for example `datetime.format("YYYY-MM-DD")`.

### Comparison operators ✅

Comparison operators can be used to compare numbers, or Date objects. Equal and not equal can be used with any kind of value, not just numbers and dates.

| Operator | Description              |
| -------- | ------------------------ |
| `==`     | equals                   |
| `!=`     | not equal                |
| `>`      | greater than             |
| `<`      | less than                |
| `>=`     | greater than or equal to |
| `<=`     | less than or equal to    |

### Boolean operators ✅

Boolean operators can be used to combine or invert logical values, resulting in a true or false value.

| Operator | Description |
| -------- | ----------- |
| `!`      | logical not |
| `&&`     | logical and |
| \|       | logical or  |

## Functions 🚧

### Global 🚧 [12/15]

#### `escapeHTML()` ✅

`escapeHTML(html: string): string`

Escapes special characters in a string to make it safe for inclusion in HTML.

#### `date()` ✅

`date(date: string): date`

- `date(string): date` parses the provided string and returns a date object.
- The `date` string should be in the format `YYYY-MM-DD HH:mm:ss`.

#### `duration()` ❌

`duration(value: string): duration`

- Parse a string as a duration. See the [date arithmetic section](https://help.obsidian.md/bases/syntax#Date arithmetic) for the `value` string format.
- Durations do not need to be explicitly parsed when performing date arithmetic (for example, `now() + '1d'`), but the do when performing arithmetic on durations (for example, `now() + (duration('1d') * 2)`).
- When performing arithmetic on durations with scalars, the duration must be on the left. For example `duration('5h') * 2`, instead of `2 * duration('5h')`.

#### `file()` ❌

`file(path: string | file | url): file`

- Returns a file object for the given file or path.
- Example: `file(link("[[filename]]"))` or `file("path to file")`.

#### `html()` ✅

`html(html: string): html`

- Converts a string into a code snippet that renders as HTML.

#### `if()` ✅

`if(condition: any, trueResult: any, falseResult?: any): any`

- `condition` is the condition to be evaluated.
- `trueResult` is the output if condition is true.
- `falseResult` is the optional output if the condition is false. If it is not given, then it is assumed to be `null`.
- Returns the `trueResult` if `condition` is true, or is a truthy value, or `falseResult` otherwise.
- Example: `if(isModified, "Modified", "Unmodified")`

#### `image()` ✅

`image(path: string | file | url): image`

- Returns an image object which will render the image in the view.
- Example: `image(image-property)` or `image("https://obsidian.md/images/obsidian-logo-gradient.svg")`

#### `icon()` ✅

`icon(name: string): icon`

- Returns a value that will render as an icon in a view. The icon name must match a supported Lucide icon.
- Example: `icon("arrow-right")`.

#### `link()` ❌

`link(path: string | file, display?: value): Link`

- Parses a string `path` and returns a Link object that renders as a link to the path given.
- Optionally provide the `display` parameter to change what text the link says.

#### `list()` ✅

`list(element: any): List`

- If the provided element is a list, return it unmodified.
- Otherwise, wraps the provided `element` in a list, creating a list with a single element.
- This function can be helpful when a property contains a mixture of strings or lists across the vault.
- Example: `list("value")` returns `["value"]`.

#### `max()` ✅

`max(value1: number, value2: number...): number`

- Returns the largest of all the provided numbers.

#### `min()` ✅

`min(value1: number, value2: number...): number`

- Returns the smallest of all the provided numbers.

#### `now()` ✅

`now(): date`

- `now()` returns a date object representing the current moment.

#### `number()` ✅

`number(input: any): number`

- Attempt to return the provided value as a number.
- Date objects will be returned as milliseconds since the unix epoch.
- Booleans will return a 1 or 0.
- Strings will be parsed into a number and return an error if the result is invalid.
- Example, `number("3.4")` returns `3.4`.

#### `today()` ✅

`today(): date`

- `today()` returns a date object representing the current date. The time portion is set to zero.

### Any ✅

Functions you can use with any value. This includes strings (e.g. `"hello"`), numbers (e.g. `42`), lists (e.g. `[1,2,3]`), objects, and more.

Functions you can use with any value. This includes strings (e.g. `"hello"`), numbers (e.g. `42`), lists (e.g. `[1,2,3]`), objects, and more.

#### `isTruthy()` ✅

`any.isTruthy(): boolean`

- Return the value coerced into a boolean.
- Example: `1.isTruthy()` returns `true`.

#### `toString()` ✅

`any.toString(): string`

- Returns the string representation of any value.
- Example: `123.toString()` returns `"123"`.

### Date ✅

Functions you can use with a date and time such as `date("2025-05-27")`. Date comparisons can be done using [date arithmetic](https://help.obsidian.md/bases/syntax#Date arithmetic).

| Field                 | Type     | Description                  |
| --------------------- | -------- | ---------------------------- |
| `date.year` ✅        | `number` | The year of the date         |
| `date.month` ✅       | `number` | The month of the date (1–12) |
| `date.day` ✅         | `number` | The day of the month         |
| `date.hour` ✅        | `number` | The hour (0–23)              |
| `date.minute` ✅      | `number` | The minute (0–59)            |
| `date.second` ✅      | `number` | The second (0–59)            |
| `date.millisecond` ✅ | `number` | The millisecond (0–999)      |

#### `date()` ✅

`date.date(): date`

- Returns a date object with the time removed.
- Example: `now().date().format("YYYY-MM-DD HH:mm:ss"` returns a string such as "2025-12-31 00:00:00"

#### `format()` ✅

`date.format(format: string): string`

- `format` is the format string (e.g., `"YYYY-MM-DD"`).
- Returns the date formatted as specified by a Moment.js format string.
- Example: `date.format("YYYY-MM-DD")` returns `"2025-05-27"`.

#### `time()` ✅

`date.time(): string`

- Returns the time.
- Example: `now().time()` returns a string such as "23:59:59"

#### `relative()` ✅

`date.relative(): string`

- Returns a readable comparison of the date to the current datetime.
- Example: `file.mtime.relative()` returns a value such as `3 days ago`.

#### `isEmpty()` ✅

`date.isEmpty(): boolean`

- Returns false.

### String ✅

Functions you can use with a sequence of characters such as `"hello".`

| Field           | Type     | Description                            |
| --------------- | -------- | -------------------------------------- |
| `string.length` | `number` | The number of characters in the string |

#### `contains()` ✅

`string.contains(value: string): boolean`

- `value` is the substring to search for.
- Returns true if the string contains `value`.
- Example: `"hello".contains("ell")` returns `true`.

#### `containsAll()` ✅

`string.containsAll(...values: string): boolean`

- `values` are one or more substrings to search for.
- Returns true if the string contains all of the `values`.
- Example: `"hello".containsAll("h", "e")` returns `true`.

#### `containsAny()` ✅

`string.containsAny(...values: string): boolean`

- `values` are one or more substrings to search for.
- Returns true if the string contains at least one of the `values`.
- Example: `"hello".containsAny("x", "y", "e")` returns `true`.

#### `endsWith()` ✅

`string.endsWith(query: string): boolean`

- `query` is the string to check at the end.
- Returns true if this string ends with `query`.
- Example: `"hello".endsWith("lo")` returns `true`.

#### `isEmpty()` ✅

`string.isEmpty(): boolean`

- Returns true if the string has no characters, or is not present.
- Example: `"Hello world".isEmpty()` returns `false`.
- Example: `"".isEmpty()` returns `true`.

#### `lower()` ✅

`string.lower(): string`

- Returns the string converted to lower case.

#### `replace()` ✅

`string.replace(pattern: string | Regexp, replacement: string): string`

- `pattern` is the value to search for in the target string.
- `replacement` is the value to replace found patterns with.
- If `pattern` is a string, all occurrences of the pattern will be replaced.
- If `pattern` is a Regexp, the `g` flag determines if only the first or if all occurrences are replaced.
- Example: `"a,b,c,d".replace(/,/, "-")` returns `"a-b,c,d"`, where as `"a,b,c,d".replace(/,/g, "-")` returns `"a-b-c-d"`.

#### `repeat()` ✅

`string.repeat(count: number): string`

- `count` is the number of times to repeat the string.
- Example: `"123".repeat(2)` returns `"123123"`

#### `reverse()` ✅

`string.reverse(): string`

- Reverses the string.
- Example: `"hello".reverse()` returns `"olleh"`.

#### `slice()` ✅

`string.slice(start: number, end?: number): string`

- `start` is the inclusive start index.
- `end` is the optional exclusive end index.
- Returns a substring from `start` (inclusive) to `end` (exclusive).
- Example: `"hello".slice(1, 4)` returns `"ell"`.
- If `end` is omitted, slices to the end of the string.

#### `split()` ✅

`string.split(separator: string | Regexp, n?: number): list`

- `separator` is the delimiter for splitting the string.
- `n` is an optional number. If provided, the result will have the first `n` elements.
- Returns an list of substrings.
- Example: `"a,b,c,d".split(",", 3)` or `"a,b,c,d".split(/,/, 3)` returns `["a", "b", "c"]`.

#### `startsWith()` ✅

`string.startsWith(query: string): boolean`

- `query` is the string to check at the beginning.
- Returns true if this string starts with `query`.
- Example: `"hello".startsWith("he")` returns `true`.

#### `title()` ✅

`string.title(): string`

- Converts the string to title case (first letter of each word capitalized).
- Example: `"hello world".title()` returns `"Hello World"`.

#### `trim()` ✅

`string.trim(): string`

- Removes whitespace from both ends of the string.
- Example: `" hi ".trim()` returns `"hi"`.

### Number ✅

Functions you can use with numeric values such as `42`, `3.14`.

#### `abs()` ✅

`number.abs(): number`

- Returns the absolute value of the number.
- Example: `(-5).abs()` returns `5`.

#### `ceil()` ✅

`number.ceil(): number`

- Rounds the number up to the nearest integer.
- Example: `(2.1).ceil()` returns `3`.

#### `floor()` ✅

`number.floor(): number`

- Rounds the number down to the nearest integer.
- Example: `(2.9).floor()` returns `2`.

#### `isEmpty()` ✅

`number.isEmpty(): boolean`

- Returns true if the number is not present.
- Example: `5.isEmpty()` returns `false`.

#### `round()` ✅

`number.round(digits: number): number`

- Rounds the number to the nearest integer.
- Optionally, provided a `digits` parameter to round to that number of decimal digits.
- Example: `(2.5).round()` returns `3`, and `(2.3333).round(2)` returns `2.33`.

#### `toFixed()` ✅

`number.toFixed(precision: number): string`

- `precision` is the number of decimal places.
- Returns a string with the number in fixed-point notation.
- Example: `(3.14159).toFixed(2)` returns `"3.14"`.

### List ✅

Functions you can use with an ordered list of elements such as `[1, 2, 3]`.

| Field         | Type     | Description                        |
| ------------- | -------- | ---------------------------------- |
| `list.length` | `number` | The number of elements in the list |

#### `contains()` ✅

`list.contains(value: any): boolean`

- `value` is the element to search for.
- Returns true if the list contains `value`.
- Example: `[1,2,3].contains(2)` returns `true`.

#### `containsAll()` ✅

`list.containsAll(...values: any): boolean`

- `values` are one or more elements to search for.
- Returns true if the list contains all of the `values`.
- Example: `[1,2,3].containsAll(2,3)` returns `true`.

#### `containsAny()` ✅

`list.containsAny(...values: any): boolean`

- `values` are one or more elements to search for.
- Returns true if the list contains at least one of the `values`.
- Example: `[1,2,3].containsAny(3,4)` returns `true`.

#### `filter()` ✅

`list.filter(value: Boolean): list`

- Filter the elements of this list by calling a filter function, which uses the variables `index` and `value`, and returns a boolean value for whether the element should be kept.
- `value` is the value of an item in the list.
- `index` is the index of the current value.
- Example: `[1,2,3,4].filter(value > 2)` returns `[3,4]`.

#### `flat()` ✅

`list.flat(): list`

- Flattens nested list into a single list.
- Example: `[1,[2,3]].flat()` returns `[1,2,3]`.

#### `isEmpty()` ✅

`list.isEmpty(): boolean`

- Returns true if the list has no elements.
- Example: `[1,2,3].isEmpty()` returns `false`.

#### `join()` ✅

`list.join(separator: string): string`

- `separator` is the string to insert between elements.
- Joins all list elements into a single string.
- Example: `[1,2,3].join(",")` returns `"1,2,3"`.

#### `map()` ✅

`list.map(value: Any): list`

- Transform each element of this list by calling a conversion function, which uses the variables `index` and `value`, and returns the new value to be placed in the list.
- `value` is the value of an item in the list.
- `index` is the index of the current value.
- Example: `[1,2,3,4].map(value + 1)` returns `[2,3,4,5]`.

#### `reduce()` ✅

`list.reduce(expression: Any, acc: Any): Any`

- Reduce the elements of this list into a single value by running an expression for each element. The expression can use the variables `index`, `value`, and `acc` (the accumulator), and should return the next accumulator value.
- `expression` is evaluated for every element in the list.
- `value` is the value of the current item in the list.
- `index` is the index of the current item.
- `acc` is the accumulated value so far.
- Example (sum): `[1,2,3].reduce(acc + value, 0)` returns `6`.
- Example (max): `values.filter(value.isType("number")).reduce(if(acc == null || value > acc, value, acc), null)` returns the largest number, or `null` if none.

#### `reverse()` ✅

`list.reverse(): list`

- Reverses the list in place.
- Example: `[1,2,3].reverse()` returns `[3,2,1]`.

#### `slice()` ✅

`list.slice(start: number, end?: number): list`

- `start` is the inclusive start index.
- `end` is the optional exclusive end index.
- Returns a shallow copy of a portion of the list from `start` (inclusive) to `end` (exclusive).
- Example: `[1,2,3,4].slice(1,3)` returns `[2,3]`.
- If `end` is omitted, slices to the end of the list.

#### `sort()` ✅

`list.sort(): list`

- Sorts list elements from smallest to largest.
- Example: `[3, 1, 2].sort()` returns `[1, 2, 3]`.
- Example: `["c", "a", "b"].sort()` returns `["a", "b", "c"]`.

#### `unique()` ✅

`list.unique(): list`

- Removes duplicate elements.
- Example: `[1,2,2,3].unique()` returns `[1,2,3]`.

### Link 🚧

Functions you can use on a link. Links can be created from a file (`file.asLink()`) or a path (`link("path")`).

#### `asFile()` ❌

`link.asFile(): file`

- Returns a file object if the link refers to a valid local file.
- Example: `link("[[filename]]").asFile()`

#### `linksTo()` ❌

`link.linksTo(file): boolean`

- Returns whether the file represented by the `link` has a link to `file`.

### File 🚧

Functions you can use with file in the vault.

#### `asLink()` ❌

`file.asLink(display?: string): Link`

- `display` optional display text for the link.
- Returns a Link object that renders as a functioning link.
- Example: `file.asLink()`

#### `hasLink()` ❌

`file.hasLink(otherFile: file | string): boolean`

- `otherFile` is another file object or string path to check.
- Returns true if `file` links to `otherFile`.
- Example: `file.hasLink(otherFile)` returns `true` if there’s a link from `file` to `otherFile`.

#### `hasProperty()` ✅

`file.hasProperty(name: string): boolean`

- Returns true if the note has the given file property.

#### `hasTag()` ❌

`file.hasTag(...values: string): boolean`

- `values` are one or more tag names.
- Returns true if the file has any of the tags in `values`.
- Example: `file.hasTag("tag1", "tag2")` returns `true` if the file has tag `#tag1` or `#tag2`. It also includes any [nested tags](https://help.obsidian.md/tags#Nested tags), such as `#tag1/a` or `#tag2/b`.

#### `inFolder()` ✅

`file.inFolder(folder: string): boolean`

- `folder` is the folder name to check.
- Returns true if the file is in the specified folder.
- Example: `file.inFolder("notes")` returns `true`.

#### Object ✅

Functions you can use with a collection of key-value pairs such as `{"a": 1, "b": 2}`.

#### `isEmpty()` ✅

`object.isEmpty(): boolean`

- Returns true if the object has no own properties.
- Example: `{}.isEmpty()` returns `true`.

#### `keys()` ✅

`object.keys(): list`

- Returns a list containing the keys of the object.

#### `values()` ✅

`object.values(): list`

- Returns a list containing the values of the object.

### Regular expression ✅

`regexp.matches(value: string): boolean`

- `value` is the string to test.
- Returns true if the regular expression matches `value`.
- Example: `/abc/.matches("abcde")` returns `true`.

## Types

Bases have a type system which is used by formulas and filters to apply functions to properties.

### Strings, numbers, and booleans

Strings, numbers, and booleans are "primitive" values which do not require a function to create.

- Strings are enclosed in single or double quotes, for example `"message"`.
- Numbers are written as digits, and may optionally be enclosed in parenthesis for clarity. For example, `1` or `(2.5)`.
- Booleans are written as `true` or `false` without quotes.

### Dates and durations

Dates represent a specific date, or a date and time depending on the function used to create them, or that type that has been assigned to the [property](https://help.obsidian.md/properties).

- To construct a date, use the `date` function, for example `date("2025-01-01 12:00:00")`
- To modify a date, add or remove a duration, for example `now() + "1 hour"` or `today() + "7d"`
- Compare dates using comparison operators (e.g. `>` or `<`) and arithmetic operators (for example, `(now() + "1d") - now()` returns `86400000` milliseconds.)
- To extract portions of a date, use the available fields (`now().hour`), or a convenience function (`now.time()`).
- Many other [fields and functions](https://help.obsidian.md/bases/functions) are available on date objects.

### Objects and lists

- Turn a single element into a list using the `list()` function. This is especially helpful for properties which may contain a mixture of lists or single values.
- Access list elements using square brackets, and a 0-based index. For example, `property[0]` returns the first element from the list.
- Access object elements using square brackets and the element name or dot notation. For example, `property.subprop` or `property["subprop"]`.

### Files and links

[Wikilinks](https://help.obsidian.md/link-notes) in [frontmatter properties](https://help.obsidian.md/properties) are automatically recognized as Link objects. Links will render as a clickable link in the [view](https://help.obsidian.md/bases/views).

- To construct a link, use the global `link` [function](https://help.obsidian.md/bases/functions), for example `link("filename")` or `link("https://obsidian.md")`.
- You can create a link from any string, for example, `link(file.ctime.date().toString())`.
- To set the display text, pass in an optional string or icon as a second parameter, for example `link("filename", "display")` or `link("filename", icon("plus"))`.

A File object can be turned into a link using `file.asLink()` with an optional display text.

Links can be compared with `==` and `!=`. They are equivalent as long as they point to the same file, or if the file does not exist when looked up, their link text must be identical.

Links can be compared to files such as `file` or `this`. They will equate if the link resolves to the file. For example, `author == this`.

Links can also be checked in list contains, for example, `authors.contains(this)`.

# Views

Views allow you to organize the information in a [Base](https://help.obsidian.md/bases) in multiple ways. A base can contain several views, and each view can have a unique configuration to display, sort, and filter files.

For example, you may want to create a base called "Books" that has separate views for "Reading list" and "Recently finished".

Toolbar

At the top of a base is a toolbar that lets you interact with views and their results.

- **View menu** — create, edit, and switch views.
- **Results** — limit, copy and export files.
- **Sort** — sort and group files.
- **Filter** — filter files.
- **Properties** — choose properties to display and create [formulas](https://help.obsidian.md/formulas).
- **New** — create a new file in the current view.

## Add and switch views

There are two ways to add a view to a base:

- Click the view name in the top left and select **Add view**.
- Use the [command palette](https://help.obsidian.md/plugins/command-palette) and select **Bases: Add view**.

The first view in your list of views will load by default. Drag views by their icon to change their order.

## View settings

Each view has its own configuration options. To edit view settings:

1.  Click the view name in the top left.
2.  Click the right arrow next to the view you want to configure.

Alternatively _right-click_ the view name in the base's toolbar to quickly access the view settings.

## Layout

Views can be displayed with different layouts including as **table**, **list**, **cards**, and **map**. Additional layouts can be added by [Community plugins](https://help.obsidian.md/community-plugins). Some layouts are still being developed and require [early access versions](https://help.obsidian.md/early-access) of Obsidian.

| Layout                                              | Description                                                                                                                   | App version |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ----------- |
| [Table](https://help.obsidian.md/bases/views/table) | Display files as rows in a table. Columns are populated from [properties](https://help.obsidian.md/properties) in your notes. | 1.9         |
| [Cards](https://help.obsidian.md/bases/views/cards) | Display files as a grid of cards. Lets you create gallery-like views with images.                                             | 1.9         |
| [List](https://help.obsidian.md/bases/views/list)   | Display files as a [list](https://help.obsidian.md/syntax#Lists) with bulleted or numbered markers.                           | 1.10        |
| [Map](https://help.obsidian.md/bases/views/map)     | Display files as pins on an interactive map. Requires the Maps plugin.                                                        | 1.10        |

## Filters

Open the **Filter** menu at the top of a base to add filters.

A base without filters shows all the files in your vault. Filters narrow down the results to only show files that meet specific criteria. For example, you can use filters to only display files with a specific [tag](https://help.obsidian.md/tags) or within a specific folder. Many filter types are available.

Filters can be applied to all views in a base, or just a single view by choosing from the two sections in the **Filter** menu.

- **All views** applies filters to all views in the base.
- **This view** applies filters to the active view.

### Components of a filter

Filters have three components:

1.  **Property** — lets you choose a [property](https://help.obsidian.md/properties) in your vault, including [file properties](https://help.obsidian.md/bases/syntax#File properties).
2.  **Operator** — lets you choose how to compare the conditions. The list of available operators depends on the property type (text, date, number, etc)
3.  **Value** — lets you choose the value you are comparing to. Values can include math and [functions](https://help.obsidian.md/bases/functions).

### Conjunctions

- **All the following are true** is an `and` statement — results will only be shown if _all_ conditions in the filter group are met.
- **Any of the following are true** is an `or` statement — results will be shown if _any_ of the conditions in the filter group are met.
- **None of the following are true** is a `not` statement — results will not be shown if _any_ of the conditions in the filter group are met.

### Filter groups

Filter groups allow you to create more complex logic by creating combinations on conjunctions.

### Advanced filter editor

Click the code button ![lucide-code-xml.svg > icon](https://publish-01.obsidian.md/access/f786db9fac45774fa4f0d8112e232d67/Attachments/icons/lucide-code-xml.svg) to use the **advanced filter** editor. This displays the raw [syntax](https://help.obsidian.md/bases/syntax) for the filter, and can be used with more complex [functions](https://help.obsidian.md/bases/functions) that cannot be displayed using the point-and-click interface.

## Sort and group results

Open the **Sort** menu to sort and group the results in a view.

You can arrange results by one or more properties in ascending or descending order. This makes it easy to list notes by name, last edited time, or any other property — including formulas.

You can also group results by a property to organize similar items into visually distinct sections. Currently, Obsidian supports grouping by only one property.

### Add a sort

1.  Open the **Sort** menu at the top of the view.
2.  Choose the property you want to sort (or group) by.
3.  If you have multiple sorts, drag them up or down using the grip handle to change their priority.

The options for ordering results depend on the property type:

- **Text**: sort _alphabetically_ (A→Z) or in _reverse alphabetical order_ (Z→A).
- **Number**: sort from _smallest to largest_ (0→1) or _largest to smallest_ (1→0).
- **Date and time**: sort by _old to new_, or _new to old_.

### Remove a sort

1.  Open the **Sort** menu at the top of the view.
2.  Click the trash can button next to the sort or group you want to remove.

## Limit, copy, and export results

### Limit results

The _results_ menu shows the number of results in view. Click the results button to limit the number of results, and access additional actions.

### Copy to clipboard

This action copies the view to your clipboard. Once in your clipboard you can paste it into a Markdown file, or into other document apps including spreadsheets like Google Sheets, Excel, and Numbers.

### Export CSV

This action saves a CSV of your current view.

## Embed a view

You can embed base files in [any other file](https://help.obsidian.md/embeds) using the `![[File.base]]` syntax. The first view in the list will be used. You can change the order by dragging views in the view menu.

To specify the default view for an embed use `![[File.base#View]]`.

# Table view

Table is a type of [view](https://help.obsidian.md/bases/views) you can use in [Bases](https://help.obsidian.md/bases).

Select **Table** from the view menu to display files as a table with a row for each file, and columns for [Properties](https://help.obsidian.md/properties) of that file.

![Example of a base showing a table view with a list of books](https://publish-01.obsidian.md/access/f786db9fac45774fa4f0d8112e232d67/Attachments/bases-noshadow.png)

## Settings

Table view settings can be configured in [View settings](https://help.obsidian.md/bases/views#View settings).

### Row height ❌ (currently auto adjusted to fit content)

Row height lets you display more information. Choose between **short**, **medium**, **tall**, and **extra tall**.

## Summaries 🚧

You can add summaries to a table column to quickly calculate values like totals, averages, or counts for the rows currently visible in the view.

Summaries are tied to the view, not the base. Each view can show different summaries for the same column.

### Add a summary ✅

1.  Right-click the column header in a table view.
2.  Select **Summarize…**.
3.  Choose one of the built-in summary functions, or select **Add summary** to define your own.

The summary appears at the bottom of the column. When results are [grouped](https://help.obsidian.md/bases/views#Sort and group results) the summary for each group is displayed at the top of the group.

Once the summary bar is added you can add more summaries for other columns by clicking the summary cell. The summary bar is hidden if all summaries are removed.

### Built-in summaries ✅

The following summaries are available by default. Options may vary depending on the property type.

#### All property types ✅

- **Empty**: count of rows with no value.
- **Filled**: count of rows with a value.
- **Unique**: number of distinct values.

#### Numbers ✅

- **Average**: average of all numeric values.
- **Max**: largest value.
- **Median**: median value.
- **Min**: smallest value.
- **Range**: difference between max and min.
- **Stddev**: standard deviation.
- **Sum**: total of all values.

#### Dates ✅

- **Earliest**: the smallest/oldest date.
- **Latest**: the largest/most recent date.
- **Range**: difference between earliest and latest.

#### Checkbox ✅

- **Checked**: number of rows where the checkbox is on.
- **Unchecked**: number of rows where the checkbox is off.

### Custom summaries ❌

You can define your own summary using a formula:

1.  In the **Summarize…** menu, choose **Add summary**.
2.  Give the summary a name.
3.  Enter a formula. The formula runs over the list of values in that column (for example, using a [function](https://help.obsidian.md/bases/functions) like `values.reduce(...)`).
4.  Save the summary.

Custom summaries are useful when you need a calculation that isn’t covered by the built-in options.

# Cards view

Cards is a type of [view](https://help.obsidian.md/bases/views) you can use in [Bases](https://help.obsidian.md/bases).

Select **Cards** from the view menu to display files as a gallery-like grid layout with optional cover images.

## Settings ✅

List view settings can be configured in [View settings](https://help.obsidian.md/bases/views#View settings).

- Card size ✅
- Image property ✅
- Image fit ✅
- Image aspect ratio ✅

### Card size ✅

Defines the width of a card.

### Image property ✅

Cards support an optional cover image, which is [property](https://help.obsidian.md/properties) that's displayed as an image at the top of the card. The property can be any of the following:

- A link to a local [attachment](https://help.obsidian.md/attachments) `"[[link/to/attachment.jpg]]"` ✅
- An external link (URL) ✅
- A hex color code (`#000000`) ❌

### Image fit ✅

If you have an image property configured, this option will determine how the image should be displayed in the card.

- **Cover:** The image fills the card's content box. If it does not fit, the image will be cropped. ✅
- **Contain:** The image is scaled until it fits within the card's content box. The image will not be cropped. ✅

### Image aspect ratio ✅

The height of the cover image is determined by its aspect ratio. The default aspect ratio is 1:1 meaning all your images will be square. Adjust this option to make the image shorter or taller.
