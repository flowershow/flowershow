---
date: 2023-02-25
---

# Data API Design

When I deploy a dataset (with tabular data) I want to get a data API for it so that I can query the data ...

## Acceptance

* [ ] Pushing data results in a portal/project with an API.

To start with probably only support certain basic data types e.g.:

* a single CSV
* a Frictionless dataset with one or more CSVs 
* a single SQLite

## Tasks

* [ ] Review analysis of Data APIs and nomenclature https://tech.datopian.com/data-api
* [ ] Analyse options for Storage and Service (Read API). Suggest there are 3:
  * [ ] SQLite + datasette
  * [ ] Postgres + Postgrest/Hasura
  * [ ] Cloud e.g. BigQuery etc
* [ ] Analyse options for data load

## Analysis

* (perhaps starting with e.g. datasette and moving from there to a proper DB + Hasura)