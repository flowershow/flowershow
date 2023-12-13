# Tutorial 2: Publishing datasets made simple with DataHub

In this tutorial we are going to cover how you can publish a Frictionless Dataset on DataHub.

> [!note]
> If you haven't already, we highly recommend first checking [[datarich-tutorial|Tutorial 1: Publishing DataRich Documents on DataHub]]

## What is a Frictionless dataset

A Frictionless dataset, in this context, is a Data Package as specified in the Frictionless specification. This means we will create a dataset using the battle-tested Data Package specification, push it to GitHub, and render an impressive presentation for it on Datahub. You can read more about the specification [here](https://specs.frictionlessdata.io/guides/data-package/).

Without further ado, let's start building the Datahub project.

## Steps

### Create a GitHub repository

In order to render the Frictionless Dataset on Datahub, we first have to create a GitHub repo for it. You can give it the name you want, just make sure that the repo is public.

You can also use a repository your created in the [[datarich-tutorial|previous tutorial]].)

### Create a markdown file with Frictionless Data Package yaml in the frontmatter

Create a new markdown file in your repo and add the `frictionless` field with the following value to it:

```md
---
frictionless:
  name: dataset-abc
  title: Dataset ABC
  resources:
    - dpp:streaming: true
      encoding: utf-8
      format: csv
      mediatype: text/csv
      name: dataset-abc
      path: data/dataset-abc.csv
      profile: tabular-data-resource
      title: Dataset ABC
      schema:
        fields:
          - format: any
            name: Date
            type: date
          - format: default
            name: Value
            type: number
        missingValues:
          - ""
  views:
    - name: graph
      spec:
        group: Date
        series:
          - Value
        type: line
      specType: simple
      title: Dataset ABC
---
```

### Add a dataset csv file

In the Frictionless Data Package yaml we are specifying a resource file `data/dataset-abc.csv`. Let's create this file in the `/data` folder of the repository with the following content:

```csv
Date,Value
2018-09-10,10
2018-09-11,11
2018-09-12,13
2018-09-13,14
2018-09-14,8
2018-09-17,9
2018-09-18,7
2018-09-19,11
2018-09-20,18
```

### Visualise the data wit a FrictionlessView component

Let's add some content below our frontmatter as well as a `FrictionlessView` component to plot the dataset.

```markdown
---
frictionless:
  name: dataset-abc
  title: Dataset ABC
  ...
---

## Chart ABC

<FrictionlessView viewId={0} />

Some more content here...
```

This data component renders views specified on the in the DataPackage `views` filed by index.

You can read more about Frictionless Views [here](https://specs.frictionlessdata.io/views/#specification). Currently, DataHub supports only line charts with the "simple" specType, but you can add other visualisations to the document in the README section using the LineChart, Vega, VegaLite, and Table components.

### ...or use the built-in layout for the document

You can also use a built-in `datapackage` layout to render Data Package resources previews and basic charts from Data Package views. To use it, add the following fields to the frontmatter:

```markdown
---
layout: datapackage
excerpt: Optional dataset description
frictionless: ...
---
```

The `datapackage` layout will use all the data defined in the frontmatter to create a page with the following structure:

```md
{frictionless title}
{excerpt}

<graph from frictionless view 1>
<graph from frictionless view 1>
...

## Data files

{a table with all the resources listed in frictionless resources field}

<table with frictionless resource 1 data>
<table with frictionless resource 2 data>
...
```

Of course you can combine use both the `datapackage` layout and extend it by adding other data visualisation components and content below the frontmatter, in the markdown body.

```markdown
---
layout: datapackage
excerpt: Optional dataset description
frictionless: ...
---

## Chart ABC

<FrictionlessView viewId={0} />

Some more content here...

## Some table

<Table data={[...]} />
```

### Optional steps

You can add as many markdown files to your GitHub repository as you like, and you can freely nest them in subdirectories. You can also enhance your content with other DataRich components and markdown features.

For a full list of supported markdown features visit https://flowershow.app/docs/syntax

For a full list and API of available data visualisation components visit [https://storybook.portaljs.org](https://storybook.portaljs.org/)

### Publish with DataHub

1. Sign in to https://cloud.flowershow.app/
2. Click on "Create new site".
3. Select your GitHub user/organisation.
4. Select the repository you've just created and the branch you want to build your site off of.
5. Click on "Create Site".
6. Done! Now visit your site by clicking on the URL at the top of the site settings page.

[[story2|👀 See an example dataset rendered with DataHub]]

---

Cool, isn't it? Get in contact with us and let us know what you think!
