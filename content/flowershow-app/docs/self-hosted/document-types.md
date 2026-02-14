---
title: Document types
---

> [!warning]
> You are viewing documentation for Flowershow Self-Hosted. Flowershow Cloud documentation can be found [[docs/README|here]].

Flowershow enables you to establish and enforce the structure of your Markdown content using the Zod library for schema definitions. This tutorial guides you through the process of defining schemas for a blog post, ensuring a mandatory `date` field. The schemas play a crucial role in error prevention and ensure the predicted structure in Markdown files.

## Define Your Schemas

Create a configuration object and use the Zod library to define your schemas. For more information on defining Zod schemas, visit [Zod Documentation - Basic Usage](https://zod.dev/?id=basic-usage).
In this example, we'll begin by creating a schema for a blog post. For instance:

```md
---
title: blog post
date: 2023-12-05
...

---

Lorem ipsum dolor sit amet, consectetur adipiscing elit.
```

Subsequently, we'll use the `client.indexFolder` method along with the defined schemas to scan and index the folder containing your Markdown files.

> [!note]
> For now we will edit `scripts/mddb.js`!
> This is a temporary fix, later we will edit `config.js` instead.

```javascript
import clientPromise from "../lib/mddb.mjs";
import z from "zod";

// Define the schemas using Zod
const schemas = {
  post: z.object({
    date: z.string().refine((value) => /\d{4}-\d{2}-\d{2}/.test(value), {
      message:
        "Invalid date format. Please use YYYY-MM-DD format for the 'date' field.",
    }),
  }),
};

export default async function mddb() {
  const ignorePatterns = [/Excalidraw/, /\.obsidian/, /DS_Store/];

  const mddb = await clientPromise;

  await mddb.indexFolder({
    folderPath: "./content",
    ignorePatterns: ignorePatterns,
    customConfig: {
      schemas: schemas, // Schemas
    },
  });

  return;
}
```

## How Validation Works

Flowershow automatically validates your Markdown content against the defined schemas using Zod. Here's how the validation process works:

- **Schemas Definition:** The `post` schema is defined using Zod's `object` method, specifying the structure of the content.
- **Validation Errors:** If validation fails, Flowershow throws an error with a detailed message. For example:
  - If the date has an invalid format, it throws an error like this:
    ```
    Error: In 'blog.md' for the 'post' schema. Invalid date format. Please use YYYY-MM-DD format for the 'date' field.
    ```
  - If a required field is missing, it throws an error like this:
    ```
    Error: Missing 'date' field in 'blog.md' for the 'post' schema.
    ```

Now you have robust schemas in place, ensuring the integrity of your Markdown content. Feel free to extend and customize the schemas to meet the specific requirements of your project.
