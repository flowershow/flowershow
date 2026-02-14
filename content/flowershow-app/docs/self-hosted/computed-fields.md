---
title: Computed Fields
---

> [!warning]
> You are viewing documentation for Flowershow Self-Hosted. Flowershow Cloud documentation can be found [[docs/README|here]].

Computed Fields is a powerful feature in Flowershow that allows you to define custom functions to compute additional fields based on the content of your Markdown files. In this tutorial, we'll walk through the steps of creating and using computed fields, using a practical example of extracting the first heading from a Markdown file.

### Step 1: Define the Computed Field Function

The first step is to define a function that computes the additional field you want to include. In this example, we'll create a function called `addTitle` that extracts the title from the first heading in the Abstract Syntax Tree (AST) of a Markdown file.

```javascript
const addTitle = (fileInfo, ast) => {
  // Find the first header node in the AST
  const headerNode = ast.children.find((node) => node.type === "heading");

  // Extract the text content from the header node
  const title = headerNode
    ? headerNode.children.map((child) => child.value).join("")
    : "";

  // Add the title property to the fileInfo
  fileInfo.title = title;
};
```

### Step 2: Indexing the Folder with Computed Fields

> [!note]
> For now we will edit `scripts/mddb.js`!
> This is a temporary fix, later we will edit `config.js` instead.

Now, let's edit the `client.indexFolder` in `scripts/mddb.js` method to scan and index the folder containing your Markdown files. Pass the `addTitle` function in the `computedFields` option array to include the computed title in the database.

```javascript
import clientPromise from "../lib/mddb.mjs";

const addTitle = (fileInfo, ast) => {
  // Find the first header node in the AST
  const headerNode = ast.children.find((node) => node.type === "heading");

  // Extract the text content from the header node
  const title = headerNode
    ? headerNode.children.map((child) => child.value).join("")
    : "";

  // Add the title property to the fileInfo
  fileInfo.title = title;
};

export default async function mddb() {
  const ignorePatterns = [/Excalidraw/, /\.obsidian/, /DS_Store/];

  const mddb = await clientPromise;

  await mddb.indexFolder({
    folderPath: "./content",
    ignorePatterns: ignorePatterns,
    customConfig: {
      computedFields: [addTitle],
    },
  });

  return;
}
```

The `computedFields` option accepts an array of functions, and in this case, we only have one function (`addTitle`).

### Step 3: Querying the Database

Once the folder is indexed with the computed field, you can query the database to retrieve the information, including the computed title. The possibilities are limitless with computed fields, as you can define functions to compute any additional information you need.

```javascript
const results = client.query({
  /* Your query parameters here, e.g., select title from files */
});
console.log(results);
```

In your query results, you will find the `title` property populated with the extracted title from the first heading of each Markdown file.

### Conclusion

Computed Fields in Flowershow provide a flexible and extensible way to enrich your database with custom information extracted from your Markdown files. By defining your own functions, you can tailor the indexing process to suit your specific needs, making your data more meaningful and accessible. The example provided here demonstrates the basic steps to get you started, but the true power of computed fields lies in your ability to define functions that suit your unique use case.
