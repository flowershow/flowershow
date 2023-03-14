# Data Projects Database

This is a list of interesting data projects that might be of interest to the Datopian community.

## Related Projects

Each project is listed within the category that's closer to the Datahub [Data Management System (DMS)][dms] but might have interesting ideas on other categories as well.

[dms]: /docs/dms

### Data Factory

- [Kamu](https://docs.kamu.dev/cli/). A command-line tool for managing, transforming, and collaborating on structured data.
- [Bacalhau](https://www.bacalhau.org/). A platform for fast, cost efficient, and secure computation by running jobs where the data is generated and stored.
  - At the moment is a free volunteer network.
  - You can run arbitrary computations on the data (e.g. [a simple image processing pipeline](https://docs.bacalhau.org/examples/data-engineering/image-processing/)).

### Package Management

- [Open Data Fabric](https://github.com/open-data-fabric/open-data-fabric). Open protocol specification for decentralized exchange and transformation of semi-structured data, that aims to holistically address many shortcomings of the modern data management systems and workflows.
  - The protocol takes care of some interesting aspect of data like reproducibility, complete historical account (all history is preserved), veriability (data is immutable), and provenance (data is linked to its source).
  - It also has some strong opinions on the [nature of data and transformations](https://docs.kamu.dev/odf/spec/#nature-of-data). The entire specification is worth reading.
  - Dataset and transformations [are defined in YAML files](https://github.com/kamu-data/kamu-contrib/blob/master/com.github/stargazers/open-data-fabric.yaml).
- [Qri](https://qri.io/). Was a project to help with dataset syncing, versioning, storing and collaboration. Sadly, [it came to an end early in 2022](https://qri.io/winding_down).
- [Datalad](https://www.datalad.org/). Distributed data management system that keeps track of your data, creates structure, ensures reproducibility, supports collaboration, and integrates with widely used data infrastructure.
  - Uses Git Annex (distributed binary object tracking layer on top of git) to provide a decentralized dataset management system.
  - Can be [extended to IPFS](https://kinshukk.github.io/posts/gsoc-summary-and-future-thoughts/).
- [Quilt](https://github.com/quiltdata/quilt).
  - Works on top of S3.
- [Oxen](https://github.com/Oxen-AI/Oxen).
- [LakeFS](https://lakefs.io/blog/git-for-data/). More like Git for Data.
- [DVC](https://github.com/iterative/dvc).
- [XVC](https://github.com/iesahin/xvc).
- [Xetdata](https://xetdata.com/).
- [Dud](https://github.com/kevin-hanselman/dud).
- [Deep Lake](https://github.com/activeloopai/deeplake).
- [Dim](https://github.com/c-3lab/dim).
- [Juan Benet's data](https://github.com/jbenet/data).
- [Colah's data](https://github.com/colah/data).
- [Dolt](https://docs.dolthub.com/).
  - They also [do data bounties](https://www.dolthub.com/repositories/dolthub/us-businesses)!
- [Ocean Protocol Market](https://market.oceanprotocol.com/).

### Frontend

- [Evidence.dev](https://evidence.dev/).
- [Malloy Notebooks](https://github.dev/lloydtabb/auto_recalls/blob/main/auto_recalls.malloynb).
  - Install recommended extension, `malloydata.malloy-vscode`, and open the notebook. Everything runs on the browser.

#### Visualizations and Dashboards

- [Rath](https://github.com/kanaries/rath).
- [Rill Developer](https://github.com/rilldata/rill-developer)

### Data APIs

- [Splitgraph Data Delivery Network](https://www.splitgraph.com/connect/query).
- [Seafowl](https://github.com/splitgraph/seafowl).
  - [Seafowl + Edge + CDN](https://bostadsbussen.se/sold/query).
- [Datasette Lite](https://lite.datasette.io/).
- [ROAPI](https://github.com/roapi/roapi).
- [Dozer](https://github.com/getdozer/dozer).
- [Huggingface Datasets](https://huggingface.co/docs/datasets).
  - Integrates with the Arrow ecosystem.
  - Automatically exposes datasets as Parquet files.
