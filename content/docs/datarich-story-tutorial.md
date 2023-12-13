# Tutorial 1: Publish data-rich stories with DataHub

Hi, welcome to DataHub. In this tutorial, we are going to cover the basics of creating and publishing data-rich documents.

## Steps

### Create a GitHub repo

First, create a repo under your organisation or user in GitHub. DataHub currently does not support private repos, so make sure this new repo is public.

### Push a `README.md` file to the repo

Now, let's start with creating a `README.md` file. In this file, feel free to use anything that markdown has to offer. For this tutorial, we are going to use the following basic structure:

```markdown
# DataRich Tutorial

## Table

## Chart
```

### Add a table

Let's add a table to the `README.md` file. Under the `## Table` header in your file, add the following snippet:

```mdx
<FlatUiTable
  data={[
    {
      age: 35,
      firstName: "Jon",
      id: 1,
      lastName: "Snow",
    },
    {
      age: 42,
      firstName: "Cersei",
      id: 2,
      lastName: "Lannister",
    },
    {
      age: 45,
      firstName: "Jaime",
      id: 3,
      lastName: "Lannister",
    },
    {
      age: 16,
      firstName: "Arya",
      id: 4,
      lastName: "Stark",
    },
  ]}
/>
```

Here's what it's going to look like:

<FlatUiTable
data={[
{
age: 35,
firstName: "Jon",
id: 1,
lastName: "Snow",
},
{
age: 42,
firstName: "Cersei",
id: 2,
lastName: "Lannister",
},
{
age: 45,
firstName: "Jaime",
id: 3,
lastName: "Lannister",
},
{
age: 16,
firstName: "Arya",
id: 4,
lastName: "Stark",
},
]}
/>

### Add a chart

Now, let's add a graph to the README file. To keep it simple, we are going to use the LineChart component in this tutorial. Add the following snippet to your README file under the `## Chart` header:

```mdx
<LineChart
  data={[
    ["1850", -0.41765878],
    ["1851", -0.2333498],
    ["1852", -0.22939907],
    ["1853", -0.27035445],
    ["1854", -0.29163003],
  ]}
/>
```

This is what it will look like when rendered:

<LineChart
data={[
[
'1850',
-0.41765878
],
[
'1851',
-0.2333498
],
[
'1852',
-0.22939907
],
[
'1853',
-0.27035445
],
[
'1854',
-0.29163003
]
]}
/>

### Final document

At this point, your document should look like this:

```mdx
# DataRich Tutorial

## Table

<FlatUiTable
  data={[
    {
      age: 35,
      firstName: "Jon",
      id: 1,
      lastName: "Snow",
    },
    {
      age: 42,
      firstName: "Cersei",
      id: 2,
      lastName: "Lannister",
    },
    {
      age: 45,
      firstName: "Jaime",
      id: 3,
      lastName: "Lannister",
    },
    {
      age: 16,
      firstName: "Arya",
      id: 4,
      lastName: "Stark",
    },
  ]}
/>

## Chart

<LineChart
  data={[
    ["1850", -0.41765878],
    ["1851", -0.2333498],
    ["1852", -0.22939907],
    ["1853", -0.27035445],
    ["1854", -0.29163003],
  ]}
/>
```

We now have a README file ready to be published with DataHub!

### Optional steps

You can add as many markdown files to your GitHub repository as you like, and you can freely nest them in subdirectories. You can also enhance your content with other data visualisation components and markdown features.

For a full list of supported markdown features visit https://flowershow.app/docs/syntax

For a full list and API of available data visualisation components visit [https://storybook.portaljs.org](https://storybook.portaljs.org/)

### Publish with DataHub

1. Sign in to https://cloud.flowershow.app/
2. Click on "Create new site".
3. Select your GitHub user/organisation.
4. Select the repository you've just created and the branch you want to build your site off of.
5. Click on "Create Site".
6. Done! Now visit your site by clicking on the URL at the top of the site settings page.

---

Cool, isn't it? Get in contact with us and let us know what you think!
