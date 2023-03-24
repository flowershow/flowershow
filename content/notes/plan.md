---
date: 2023-02-17
---

# Plan

**Turn Github into a DataHub. Easy, fast, reliable data publishing.**

Taglines

- Publish, organize and find data
- Wrangle, Preview, Deploy

![](/Excalidraw/datahub-next-github-v0.1-20220218.svg)

More complex version with multiple documents, multiple assets

![](/Excalidraw/datahub-next-github-many-files-v0.1-2023-02-27.excalidraw.svg)

# Workstreams

- Showcase: data and content presentation
- Publish: creating data-driven projects from github or via upload.
- Data API: an API to the data. Essential for larger datasets.
- Hub: teams, catalog and more.
- Comms: docs, community evangelism, blog etc 

## Milestones

- [ ] v1: "Publishing":  Publish github README + csv to a showcase with a table and graph
  - [ ] Publish UI working
  - [ ] Updates on each push to git
  - [ ] Dashboard with reporting
  - [ ] Showcase is good
    - [ ] Table
    - [ ] Graph
  - [ ] Tried it out
    - [ ] working for 2+ core datasets
    - [ ] identified issues with our approach e.g. core datasets that don't preview
- [ ] v2: Data API: create a data api for a dataset
  - [ ] Larger data on github or git lfs
  - [ ] On push get a data API

### v1 Sub-steps

(not necessarily ordered)

- [ ] Design
  - [ ] validated cloudflare as platform (e.g. can use for API)
  - [ ] define basic domain model
  - [ ] How to do dev deployment on cloudflare
- [ ] Chore
  - [ ] test framework
  - [ ] dev environment
  - [ ] set up changesets (?)
- [ ] Showcase. NB: at start do not even need to run off github or even our backend (can have Project stored as fixture or similar)
  - [ ] README only (MDX support)
  - [ ] README + inline data (csv or json)
  - [ ] README + external csv
  - [ ] ...
- [ ] Publishing
  - [ ] "Manual" script creating a project
  - [ ] API for creating from github
  - [ ] Publish UI with github hook
- [ ] ? Search

# Roadmap

There are many ways to schedule features into a roadmap. Furthermore, the specific sequence will evolve as we implement. Thus, rather than set out a detailed sequence we provide a backlog of major features by area.

### Publishing

See [[design-publish-ui]]

- [ ] Connect github and go.
  - [ ] Create Project API: create, update etc
  - [ ] Create Project UI
- [ ] Publishing large datasets beyond size for git e.g. use git lfs or using your own storage etc
- [ ] Publish without github
  - [ ] "paste your data" (store your data and content)
  - [ ] From command line e.g. `data deploy` -- see original ideas in [[../docs/dms/datahub/v3]]
* [ ] Preview on command line

### Showcase

See [[design-showcase]]

- [ ] Presentation
  - [ ] Metadata summary/overview
  - [ ] Markdown driven docs for your data (ie, README.md)
  - [ ] Data Explorer
  - [ ] Data Views like charts
- [ ] Document sources
  - [ ] README only (no data)
  - [ ] README with data resource or data package inline as yaml
  - [ ] datapackage.json + README
- [ ] Data (pre)views
  - [ ] xlsx
  - [ ] pdf
  - [ ] images
  - [ ] txt
  - [ ] json
  - [ ] xml
  - [ ] geo(json) etc.

Related:

- [ ] Access control: control who can access your data and share with team mates

### Hub

- [ ] Search / Browse: metadata of all deployed datasets are available for search in the main portal (datahub.io/search)
  - [ ] Search page v0.1
- [ ] Dashboard
  - [ ] Dashboard v0.1: basic dashboard with user profile information and list of portals and their deployments
  - [ ] v0.2: usage information (space used etc)
- [ ] Plans and Billing
- [ ] Org/User page i.e. `/@owner`

### Data APIs

Dedicated page: [[design-data-api]]

- [ ] Data APIs: Get powerful data APIs automatically
  - [ ] Custom APIs (see design thinking done on this in [[/docs/dms/data-api]])
  - [ ] Metrics and user rate limiting (+ pay per use)

Workflows

- [ ] Workflows/Actions e.g. on every deploy do data validation, data summarization
  - [ ] Data validation
  - [ ] Data summary
  - [ ] Custom work flows

### Comms

- [ ] Landing page

### Backlog

- [ ] Import/Export: export to google sheets etc
- [ ] Preview for local datasets prior to deployment. Imagined in [[datahub-v3-2021]]
- [ ] Custom catalogs: Creating and deploying a catalog of multiple specific datasets e.g. I want to curate a set of climate datasets etc