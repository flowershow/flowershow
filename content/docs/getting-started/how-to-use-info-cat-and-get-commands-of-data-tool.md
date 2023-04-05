---
title: How to use info, cat and get commands of data tool
date: 2018-04-05
excerpt: Learn how to use data tool to extract a dataset summary, preview data and download it.
---

In this tutorial, we explain how you can use `data` tool to extract information about remote datasets, preview tabular data and download it. We assume you already have `data` installed. If not, please, visit this page - https://datahub.io/docs/getting-started/installing-data.

For this tutorial, we'll use Global CO2 Emissions dataset from the DataHub:

https://datahub.io/core/co2-fossil-global

# Extract summary about a dataset

Using `info` command, you can easily extract summary information about the dataset from the given URL:

```
data info https://datahub.io/core/co2-fossil-global
```

which will print out README of the dataset + summary table about available resources:

```cli-output
| Name                  | Format | Size  | Title |
|-----------------------|--------|-------|-------|
| validation_report     | json   | 511   |       |
| global_csv            | csv    | 6714  |       |
| global_json           | json   | 37857 |       |
| co2-fossil-global_zip | zip    | 11080 |       |
| global                | csv    | 6453  |       |
```

You can see that it has `global` CSV file, derived CSV and JSON versions of it, a validation report and ZIP version of the dataset.

>[!info]Read more about derived CSV and JSON of a tabular data and ZIP version of the datasets:
https://datahub.io/docs/features/auto-generated-csv-json-and-zip


# Preview tabular data

Let's preview `global` CSV file so we know how data looks like before downloading it. We can do it by using `cat` command:

>[!info]If you wonder how we constructed the URL, read this docs about "r" links:
https://datahub.io/docs/getting-started/getting-data#perma-urls-for-data.


```
data cat https://datahub.io/core/co2-fossil-global/r/global.csv
```

and it prints out a table so you can see the data.

# Download it

Finally, download the dataset using `get` command:

```
data get https://datahub.io/core/co2-fossil-global
```

which will save all available files in `./core/co2-fossil-global` directory. If you run `tree core/co2-fossil-global/`, you'd see the following output:

```cli-output
core/co2-fossil-global/

├── README.md

├── archive

│   └── global.csv

├── data

│   ├── global_csv.csv

│   ├── global_json.json

│   └── validation_report.json

└── datapackage.json

2 directories, 6 files
```

You can find original data in `archive` directory, while `data` directory contains all derived files. If you don't know what is `datapackage.json`, please, read through this document - https://datahub.io/docs/data-packages#datapackagejson.

# Summary

We hope this tutorial helps you to get the most of the `data` tool. If you experience any bugs or have suggestions on improvements, feel free to open an issue at https://github.com/datahq/datahub-qa/issues.
