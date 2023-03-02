---
title: Data Tables
created: 2022-02-15
---

# Data Tables

Data tables are one of the most basic and important forms of data presentation.

- Data Table features 🚧
- Data Table designs
- Data Table libraries **see below**

## Data Table Libraries

Research and summary of existing JS libraries for presenting data so that one can choose the best one (for a given job).

### Recommendation: Tanstack Table

Based on our research, we recommend (as of 2022):

- For a "headless" library: **Tanstack table - https://tanstack.com/table/v8** (previously react table).
- For a non-headless option:
  - Material UI X: https://mui.com/x/react-data-grid/
  - https://github.com/ag-grid/ag-grid

For our own work, we recommend Tanstack table because it is well designed, full featured and a headless approach makes it much easier to style the grid to the surroundings which we need to do.

### Libraries List

#todo list more of the existing libraries we have come across ...

- tanstack table (react-table v8 became generic) seems to be far the best headless now.
- ag-grid: this seems the next best if you want a "component" (vs headless). recommended by tanstack. Have open source and enterprise version. Open source is pretty good. Enterprise is ~1k.
- material ui is good especially https://mui.com/x/react-data-grid/. We used this for portal.js in 2022. however, it is not headless. Have open source (MIT) and paid version.
- https://jspreadsheets.com
- handsontable is fully closed source since 2019 (no open source option) https://handsontable.com/blog/articles/2019/3/handsontable-drops-open-source-for-a-non-commercial-license

### Acceptance

* [ ] List of JS data table/grid libraries with basic info e.g.
  * [ ] url / github url
  * [ ] name
  * [ ] stars
  * [ ] last updated
  * [ ] brief description
* [ ] Quick pass evaluation notes leading to a shortlisting of 2-4 that we dig into depth
  * [ ] pros and cons of different data table libraries
* [ ] Working demos for each one

Bonus

* [ ] Content/code lives in a public "dataset-like" repo where others can update it over time (an experiment in community driven product evaluation) - like we did with line charts https://datopian.github.io/line-charts/ / https://github.com/datopian/line-charts