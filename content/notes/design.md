---
date: 2023-03-05
---

# Design and Architecture

Design of DataHub Next. Design here means analysis and architecture (not visual design).

# Concepts

- Showcase
- Data rich documents (aka: data literate documents)
- Data Project
- Data API

# Components

MVP components sketch v2023-03-09

![[../Excalidraw/datahub-next-mvp-architecture-2023-03-09.excalidraw.svg]]

## David + Rufus (more expansive)

This is a different take with a focus on naming domains of the application.

![[../Excalidraw/datahub-next-mvp-archictecture-2023-03-14.excalidraw.svg]]

# Domain Model

See [[../docs/dms/dms#Domain Model]] which has a fairly fulsome DMS oriented domain model (structured in graphql format).

  We probably can work with something simpler to start with e.g. we could just start with 2 items:

- Project: a data project corresponding to `/@{owner{/{name}`
- Account corresponding to `/@{owner}`

Over time can image a project having thins like:

- apis
- readme
- files
- datasets
- issues 

Simple typescript schema

```typescript
interface Project {
  id:
  name: 
  title: string
  owner: Account
  github_repo: string[url]
  readme: string
  datapackage: object
}

// TODO: copy datahub v2?
interface Account {
  id: 
  name: string; // username
  fullname: ...
  
}
```

Typesense version:

```js
let project = {
  'name': 'projects',
  'fields': [
    {'name': 'id', 'type': 'string' },
    {'name': 'name', 'type': 'string' },
    {'name': 'title', 'type': 'string' },
    {'name': 'owner_id', 'type': 'string', 'facet': true },
    {'name': 'owner_name', 'type': 'string', 'facet': true },
    {'name': 'github_repo'. 'type': 'string'},
    {'name': 'readme', 'type': 'string' },
    {'name': 'datapackage', 'type': 'object'}
  ],
  'default_sorting_field': 'title'
}
```

## Notes (to process)

### What is the aggregation model? 2023-02-22

- projects: which aggregate those (equivalent to repo or project on gitlab)
- blobs
  - documents: metadata + text stream
  - assets: filepointer + metadata
- [groups of files e.g. a dataset]

Hub

- orgs: which aggregate projects

Presentation/processing of these

- workflows
- views
- apis

# Question tree

- [ ] What is our priority use case?
- [x] Why do we need a datapackage.json in github repos? **✅2023-02-19 - [[#Why do we need a datapackage.json in github repos?]]**
- [x] How do we do stuff in response to updates in source repo? **✅2023-02-19 [[#How do we do stuff in response to updates in source repo?]]**
- [ ] How to do workflows? **🚧2023-02-20 - see below**

### Why do we need a datapackage.json in github repos?

You need something like a `datapackage.json` when:

- descriptions of data files (b/c they are not self-describing)
  - title, nicer name, description
  - schema
- views
- api specs

Things that `datapackage.json` provides that we probably don't want / need:

- general metadata like title and description because we can get that from Github API (assuming people have described their repo) oreven  use the README and its description and title.

### How do we do stuff in response to updates in source repo?

When a user updates material in their github repo they want the associated data project on DataHub to update e.g. showcase page update, data APIs update etc so that their new material is available to others (and themselves)

Assumptions

- user has pushed to a github repo they control

There are two parts to this:

1. Getting notified and triggering some action **✅ (easy) use a webhook i.e. install a trigger on github repo to notify datahub on commit. (NB: for simple cases where processing can be done on fly could do a hacky pull model where you simply request content on each request but not recommended)
2. Taking that action which itself involves two parts
    1. Accessing content in their repo e.g. to import it, to run processing on it, to render it. **✅ as part of the project creation flow user granted access to their repo to DataHub (cf vercel, netlify, cloudflare etc). For other stuff like storage imagine a similar setup.**
    2. Running the action itself (assuming content is accessible) **✅ Assume work required "substantive" e.g. importing content, running an API build or similar. In this case this is an action/workflows. See separate answer on this**

Brainstorm re Simplest possible approach (NB: won't work)

- run live with server i.e. we use github as our "content" API **❌ this will run into issues with github API limits, plus slow. Also how do we do things like have a database of projects for doing catalog on DataHub itself?**
  - direct access github (either b/c public or with token)
- No Data API ⟹ rendering is "data literate" style **❌ problems with larger data, more complexity in frontend etc**

### How to do workflows?

By workflows we mean processing that needs to have "out of band".


- [ ] could we just use workers e.g. cloudflare workers for?
  - [ ] what are cloudflare workers?
  - [ ] how would we monitor tasks and executions? maybe we just wing it to start with or build our own?
    - we don't really have dags at the start - just one task, one action (maybe something on data validate)
  - [ ] would there be an issue with time outs?
    - [ ] how long can workers run for? 
  - [x] can you use workers in cloudflare pages? **✅2023-02-23 yes, they are called functions https://developers.cloudflare.com/pages/platform/functions/**
- Another option could be Next.js ISR with on-demand revalidation?

Notes

- "Is there a fully-OSS control plane for defining, scheduling, and managing serverless (container img) invocations and corresponding dag? With an Airflow-ish UI but using lambda/ cloud functions instead of worker pool? Or anything remotely close" https://twitter.com/aerialfly/status/1599443538990682113