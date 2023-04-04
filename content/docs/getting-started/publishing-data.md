---
title: Publishing ❒ data
date: 2017-09-26
excerpt: This guide walks you through how to put data online using data tool and the DataHub.
---

This guide walks you through how to put data online using **data** tool and the DataHub. By the end of this tutorial you'll have this dataset published: https://datahub.io/examples/sample

Here we focus on tabular data and especially CSV - a universal basic format for structured data.

>[!info]You can read and learn about CSV in:
[This post.](/docs/data-packages/csv)


## Install the data CLI tool

[Download and install the "data" CLI tool](/docs/getting-started/installing-data) using our separate instructions.

## Get some CSV data

We have a sample CSV file for this tutorial. Let's get that file using our `data` tool:

```bash
data get https://datahub.io/examples/sample/r/sample.csv
```

which saves `sample.csv` file in the current working directory. You can preview how it looks like:

```bash
data cat sample.csv
```

## Publish the data

**Note:** *you need to be logged in to publish data on DataHub. It's simple and easy - just type **data login** and follow instructions.*

Putting your data online is now just one simple command: `data push [path]`

```
data push sample.csv
```

It will ask you to name this dataset - you can hit enter to use default name but in our example it'll be "sample":

```cli-output
❒ data push sample.csv

? Please, confirm name for this dataset: sample-lazy-yak-63 (sample-lazy-yak-63) sample
```

Next, you need to confirm title for this dataset - let's hit enter here to use default one:

```cli-output
? Please, confirm title for this dataset: Sample (Sample)
```

The final output will be:

```cli-output
🙌  your data is published!

🔗  https://datahub.io/username/sample/v/1 (copied to clipboard)
```

Here is the GIF of the full process including login:

![](https://raw.githubusercontent.com/datahq/datahub-content/master/assets/img/push-full.gif)

**Note:** *by default, the dataset is **public**. Use **unlisted** flag to hide it in the search results or **private** flag to restrict access.*

```
data push sample.csv --published
```

## Your data's online!

Now you can visit the showcase page of the data you've just published. It'll take few moments to process the data:

![](https://raw.githubusercontent.com/datahq/datahub-content/master/assets/img/processing.gif)

Once your data is online share the link to it with your colleagues or friends so they can use it in their code! You can find more information about how to use data in our Getting Data tutorial - http://datahub.io/docs/getting-started/getting-data.
