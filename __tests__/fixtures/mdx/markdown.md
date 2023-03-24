---
test: abc
---

# CommonMark

## Horizontal rules

***
---
___

## Emphasis

**I'm Bold!**

__I'm Bold!__

*I'm Italic!*

_I'm Italic!_


## Blockquotes

> I am a block quote.
> > I am a block quote.

## Code blocks

```
git status
git add
git commit
```

## Lists

1. First item
2. Second item
3. Third item
    - Indented item
    - Indented item
4. Fourth item    

## Inline code

At the command prompt, type `nano`.

## Links

My favorite search engine is [Duck Duck Go](https://duckduckgo.com).

[README for this project](/README.md)

## Images

![tulip](https://images.fineartamerica.com/images/artworkimages/mediumlarge/2/abstract-flowers-rose-sciberras.jpg)

# GFM

## Strikethrough

~~I'm CrossedOut!~~

## Tasks

* [x] one thing to do
* [ ] another thing to do

## Tables

| Left | Center | Right |
| :--- | :----: | ----: |
| 1    |   2    |     3 |
| 4    |   5    |     6 |

## Autolinks

https://flowershow.app

# Other

## Table of contents

## YouTube Embeds

https://www.youtube.com/watch?v=y2eQoYqCyHI

## Math

Lift($L$) can be determined by Lift Coefficient ($C_L$) like the following
equation.

$$
L = \frac{1}{2} \rho v^2 S C_L
$$

## Smartypants

-- en dash

--- em dash

. . . ellipse

## Callouts

> [!note] Note
> Very important note

> [!warning] Warning!
> Very important note


## Mermaid

```mermaid
pie title NETFLIX
         "Time spent looking for movie" : 90
         "Time spent watching it" : 10
```

## Code lines numbers & highlighting

```js {1,3-4} showLineNumbers
function fancyAlert(arg) {
  if (arg) {
    $.facebox({ div: '#foo' })
  }
}
```


## Wiki Links

### Absolute paths:

<div id="wiki-link">
[[_test/example]]
</div>

<div id="wiki-link-alias">
[[_test/example|Example with alias]]
</div>

<div id="wiki-link-heading">
[[_test/example#abcd]]
</div>

<div id="wiki-link-image">
![[Excalidraw/markdown-processing-pipeline-2023-02-23.excalidraw.svg]]
</div>

## Expressions

{/* export const authors = [
   {name: 'Jane', email: 'hi@jane.com'},
   {name: 'John', twitter: '@john2002'}
 ]
export const published = new Date('2022-02-01')
 
Written by: {new Intl.ListFormat('en').format(authors.map(d => d.name))}.
 
Published on: {new Intl.DateTimeFormat('en', {dateStyle: 'long'}).format(published)}. */}

<div id="simple-expression">
Two 🍰 is: {Math.PI * 2}
</div>


