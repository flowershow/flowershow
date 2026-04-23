---
title: Mermaid diagrams
description: Create diagrams and visualizations using a popular, text-based syntax.
---

> [!note]
> Mermaid diagrams currently only work with MDX rendering. See how to enable it globally or per page: https://flowershow.app/blog/announcing-syntax-mode-configuration

## How to use

To create a mermaid diagram you embed inside a special code block with the type of `mermaid` i.e.

````md
```mermaid

MERMAID DIAGRAM CODE GOES HERE

```
````

## Examples

### Simple example

````md
```mermaid
graph LR

a --> b
```
````

This renders like this:

```mermaid
graph LR

a --> b
```

### Sequence example

Here's a more complex example of a sequence diagram:

````md
```mermaid
sequenceDiagram
    Alice->>+John: Hello John, how are you?
    Alice->>+John: John, can you hear me?
    John-->>-Alice: Hi Alice, I can hear you!
    John-->>-Alice: I feel great!
```
````

This renders like this:

```mermaid
sequenceDiagram
    Alice->>+John: Hello John, how are you?
    Alice->>+John: John, can you hear me?
    John-->>-Alice: Hi Alice, I can hear you!
    John-->>-Alice: I feel great!
```

You can read more about Mermaid diagrams on the [Mermaid website](https://mermaid.js.org/)..
