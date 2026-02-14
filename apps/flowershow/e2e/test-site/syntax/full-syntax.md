# Full Syntax Test (CommonMark + GFM) - Markdown rendering


## Text Formatting

```
**Bold**, *italic*, ***bold italic***
Or with underscores: __Bold__, _italic_, ___bold italic___  
~~Strikethrough~~  
==Highlight==  
`Inline code`  
<sub>Subscript</sub> and <sup>Superscript</sup>  
Intraword emphasis: foo_bar_ vs foo__bar__.  
Nested emphasis: *italic **bold** inside*.  
```

**Bold**, *italic*, ***bold italic***  
Or with underscores: __Bold__, _italic_, ___bold italic___  
~~Strikethrough~~  
==Highlight==  
`Inline code`  
<sub>Subscript</sub> and <sup>Superscript</sup>  
Intraword emphasis: foo_bar_ vs foo__bar__. ❌  
Nested emphasis: *italic **bold** inside*.  

## Paragraphs & Line Breaks

```
This line ends with two spaces to create a hard line break.  
New paragraph starts here.
```

This line ends with two spaces to create a hard line break.  
New paragraph starts here.

```
This line ends with \ to create a hard line break.\
New paragraph starts here.
```

This line ends with \ to create a hard line break.\
New paragraph starts here.

```
This line ends with regular line break to create a hard soft break.
New paragraph starts here.
```

This line ends with regular line break to create a hard soft break.
New paragraph starts here.

## Blockquotes

```
> Quote level 1
>> Quote level 2
```

> Quote level 1  
>> Quote level 2  

## Thematic breaks

```
---
***
___
```

---
***
___

## Lists

### Unordered

* Item 1
* Item 2
  * Nested item 2.1  
  * Nested item 2.2
* Item 3

### Ordered

1. First
2. Second  
   1. Nested 2.1  
   2. Nested 2.2  
3. Third

### Task Lists (GFM)

- [x] Completed task
- [ ] Incomplete
- [ ] Another
  - [x] Nested done
  - [ ] Nested incomplete

## Code

### Inline

`console.log("Hello")`

### Indented code blocks ❌

```
    a simple indented code block
```

    a simple indented code block

### Fenced code blocks

```
Plain code block with no language
```

js
```js
function greet(name) {
  return `Hello, ${name}!`;
}
console.log(greet("world"));
```

bash
```bash
echo "shell test"
```

## Links

```
Standard: [Flowershow](https://flowershow.app)
```

Standard: [Flowershow](https://flowershow.app)

```
With title: [Flowershow](https://flowershow.app "Title")
```

With title: [Flowershow](https://flowershow.app "Title")

```
Autolink (GFM auto-linking): https://flowershow.app
```

Autolink (GFM auto-linking): https://flowershow.app

Email: ola@example.com

```
Reference link style:  
[Example][ref-1]

[ref-1]: https://flowershow.app "Flowershow Site"
```

Reference link style:  
[Example][ref-1]

[ref-1]: https://flowershow.app "Flowershow Site"

```
Images:  
![Flowershow logo](/logo.jpg "Test image")
```

Images:  
![Flowershow logo](/logo.jpg "Test image")

## Tables (GFM)

| Column A | Column B | Column C |
|---|:---:|---:|
| left | center | right |
| a | b | c |

## Footnotes (GFM)

```
Here is a footnote reference.[^1]

[^1]: This is the footnote text.
```

Here is a footnote reference.[^1]

[^1]: This is the footnote text.

## HTML Blocks

```
<button style="background: blue; color: white; padding: 8px 14px; border: none; border-radius: 4px; cursor: pointer;">
  Click me
</button>
```

<button style="background: blue; color: white; padding: 8px 14px; border: none; border-radius: 4px; cursor: pointer;">
  Click me
</button>

## Escape Characters

```
\*Not italic\*  
\# Not heading  
Backslash test: \\
```

\*Not italic\*  
\# Not heading  
Backslash test: \\

## Emojis (GFM)

👍 🎉 ✅

## Obsidian comments

### Inline comments

```
This %%word%% is invisible
```

This %%word%% is invisible

### Multi-line

```
%%
This paragraph is not visible
%%
```

%%
This paragraph is not visible
%%

## YouTube Link Autodetect

https://youtu.be/ZbQRlNm2dww

## Headings

### ATX Headings

```
# Heading 1
## Heading 2
### Heading 3
#### Heading 4
##### Heading 5
###### Heading 6
```

# Heading 1
## Heading 2
### Heading 3
#### Heading 4
##### Heading 5
###### Heading 6

### Setext Headings

```
Heading 1
===============

Heading 2
---------------
```

Heading 1
===============

Heading 2
---------------


| Input | Output | Notes                                         |
| ----- | ------ | --------------------------------------------- |
| `>`   | >      | Greater than                                  |
| `<`   | <      | Less-than                                     |
| `=>`  | =>     | Greater-than-or-equal                         |
| `<=`  | <=     | Less-than-or-equal                            |

