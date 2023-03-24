---
title: Data Tables
date: 2022-02-15
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

- tanstack table (react-table v8 became generic) seems to be far the best headless now.
- ag-grid: this seems the next best if you want a "component" (vs headless). recommended by tanstack. Have open source and enterprise version. Open source is pretty good. Enterprise is ~1k.
- material ui is good especially https://mui.com/x/react-data-grid/. We used this for portal.js in 2022. however, it is not headless. Have open source (MIT) and paid version.
- https://jspreadsheets.com
- handsontable is fully closed source since 2019 (no open source option) https://handsontable.com/blog/articles/2019/3/handsontable-drops-open-source-for-a-non-commercial-license

# Data tables 2023 reasearch

## TanStack vs AG Grid

Great overview of AG Grid features just to scroll through and take a look at gifs: https://www.ag-grid.com/javascript-data-grid/grid-features/
Example features implemented using AG Grid and Tanstack table (comparison of amount code needed): https://blog.ag-grid.com/headless-react-table-vs-ag-grid-react-data-grid/
Recent comment on Reddit from AG Grid creator re Tanstack vs AG Grid: https://www.reddit.com/r/webdev/comments/zk01tw/ag_grid_vs_tanstack_table/

**When to use TanStack:**
- for simple tables which support only basic functionalities like searching, sorting, filtering, pagination
- for medium-sized tables **supposedly it can't handle really long data sets well (need to confirm why)**
- for custom designed tables **we don't really need a custom design**
- for ease of extensibility, i.e. if we want to implement some custom feature **can't think of any feature that's not already covered by AG Grid though; yes,some features are in enterprise plan only, but the core already provides a lot of basic functionalities for free**

**When to use AG Grid:**
- for enterprise applications
- when you need powerful data grids (with lots of features)
- for large datasets
- for out of the box horizontal and vertical scroll solution
- when bundle size is not so crucial

> Most Search Engine Websites tend to use TanStack Table.
> Most big organisations writing Enterprise Apps tend to use AG Grid.

**Recommendation:**

Probably go with AG Grid.
 
**Why?**
- AG Grid is a robust, feature-rich and customizable (probably enough for our needs) solution
- used for many enterprise solutions (reportedly)
- I don't think we need a custom, fancy UX/UI that e.g. TanStack would allow for
- the free version includes most of the really essential features that will just work out of the box and look good and professional
- I think even the enterprise version is cheaper than designing, developing and maintaining custom UI and functionalities 
	- This also depends on how many and how complex/fancy features we need (e.g. if there is only one we care about and it's not hard to implement, then probably buying enterprise plan only to support it is not worth it)

**But first:**
- let's decide on what features do we want to support from the list below (and any others?)
- decide on how large datasets we want to support
	- if large, like in e.g. kaggle, probably AG Grid would be better
- quickly test AG Grid vs TanStack for:
	- bundle size (when we use AG Grid's scoped packages instead of installing full ag-grid-community and ag-grid-react packages)
	- performance with large datasets


## About Tanstack Table

- Summary:
	- **headless** UI for building powerful tables & datagrids
 - GH stars (TanStack/table): 20k
 - Bundle size (react-table): 10-15kb
 - Weekly downloads (react-table): ~390k 
- Pros:
	- Full control over markup and styles (e.g. with Tailwind)
		 - "nothing is stopping you from customizing and overriding literally everything to your liking."
	- Smaller bundle-size
		- which means higher page download speed
- Cons:
	- More setup required
		- More code to implement the features ourselves (and so it will increase the total cost of design, development and maintenance = it's not really free)
	- No markup, styles or themes provided
	- Users seem to be discontent over the docs
		- "the documentation can be painfully lacking in a lot of places. The docs are 90% a dump of the api and examples, with very little explaining of why, how, or when you’d want to use something in said API"

## About AG Grid

- Summary:
	- feature-packed, component-based datagrid library 
	- "Over 1.2 million monthly downloads of AG Grid Community and over 80% of the Fortune 500 using AG Grid Enterprise."
 - GH stars (ag-grid/ag-grid): 10k
 - Bundle size (ag-grid-community + ag-grid-react): ~218kb+15kb
 - Weekly downloads (ag-grid-community): ~560k
- Pros:
	- Ships with ready-to-use markup/styles
	- Little setup required
	- Less code required
	- Broader set of features (pivoting and integrated charting), and more polished basic features (detailed grouping functionality)
	- Recommended by Tanstack for a component-based solution 
	- no 3rd party dependencies
	- looks professional (which doesn't have to be the case when we try styling the tables on our own without a good design; but also: what for if this looks really good)
- Cons:
	- Less control over markup/styles
	- Larger bundle-size (altough the bundle size can be decreased by only installing the features we need; see [this article](https://blog.ag-grid.com/minimising-bundle-size/))
		- which means longer page down


## Data table features

A list of the key features you can find in data tables or data grids.

### Sorting

Row Sorting will sort the data by given column.

![[Pasted image 20230304191113.png]]

- TanStack:
		- example: https://tanstack.com/table/v8/docs/api/features/filters
	- API: https://tanstack.com/table/v8/docs/api/features/sorting
- value:
	- (Ola): essential functionality from the user perspective
- cost:
	- AG Grid: FREE

### Filtering: text, date, num comparisons

![[Pasted image 20230303170557.png]]
![[Pasted image 20230303170636.png]]

- TanStack:
		- example: https://tanstack.com/table/v8/docs/examples/react/filters
	- API: https://tanstack.com/table/v8/docs/api/features/filters
- value:
	- (Ola): essential functionality from the user perspective
- cost:
	- AG Grid: FREE
 
### Filtering: set filtering

Like in excel, checkboxes to select values from a set.

![[Pasted image 20230303163649.png]]

- value:
	- (Ola) pretty useful and rather essentail functionality; but in free AG plan text filters can be used instead (although the UX is not as good)
- cost:
	- AG Grid: enterprise subscription

### Cell styling

Use CSS rules to define Cell Style based on data content, e.g. put a red background onto cells that have negative values, and green on values greater than 100.

![[Pasted image 20230303213427.png]]

- value:
	- (Ola): pretty useful; makes it easier for authors to refer to some data in the dataset in the content of the article
- cost:
	- AG Grid: FREE

### Row and column freezing

Use Pinned Rows to pin one or more rows to the top or the bottom. Pinned rows are always present and not impacted by vertical scroll.

- value:
	- (Ola): pretty useful for large datasets
- cost:
	- AG Grid: FREE

### Aggregation (count, max, mix etc.)

![[Pasted image 20230304005625.png]]

- value:
	- (Ola): pretty both from the user and from the author perspective, aggregation allows for quickly getting rough understanding of a large dataset
- cost:
	- AG Grid: enterprise subscription

### Rows grouping

![[Pasted image 20230304170809.png]]

- value:
	- (Ola): probably pretty useful for datasets including categeorical data
- cost:
	- AG Grid: enterprise subscription

### Column grouping

Expandable column groups.

![[Pasted image 20230303170907.png]]

![[Pasted image 20230303170945.png]]

- value:
	- (Ola):  pretty useful functionality from the author perspective; as an author I'd want my dataset to be as readable as possible and for some datasets it may be good to be 
- cost:
	- AG Grid: free


### Show, hide columns

- value:
	- (Ola): may be useful for datasets with many columns
- cost:
	- AG Grid: enterprise subscription

### Sparklines (mini in-cell charts)

Mini charts that are optimised for grid cells that can be used to provide insights into data trends at a glance.

![[Pasted image 20230303224227.png]]
![[Pasted image 20230303224248.png]]

- value:
	- (Ola): not a must have but awesome feature, especially for for datasets with time series data; probably a good selling point as well as it enhances the content visually
- cost:
	- AG Grid: enterprise plan

### Integrated charts (AG Grid)

**User created charts:**

![[Pasted image 20230303223811.png]]

![[Pasted image 20230303223846.png]]

A user creates a chart using the grid's UI by selecting a range of cells or entering pivot mode and then creating a chart via the context menu.

**Application charts:**

The application requests the grid to create a chart through the grid's charting API.

![[Pasted image 20230303223910.png]]

- value:
	- (Ola): awesome feature I'd certainly want to use it both as an author (application charts) and as a user (user created charts); also, depending on the variety and robustnes of the available graphs, maybe an extra charting library wouldn't be needed at all if we used this
- cost:
	- AG Grid: enterprise plan

### Status bar & range selection

The Status Bar appears on the bottom of the grid and shows aggregations (sum, min, max etc.) when you select a range of cells using range selection. This is similar to what happens in Excel.

![[Pasted image 20230303163850.png]]

- value:
	- (Ola):  nice to have; facilitates basic analysis of the data by the user
- cost:
	- AG Grid: enterprise subscription

### Pivot tables

![[Pasted image 20230304173330.png]]

- value:
	- (Ola): probably pretty useful from the perspective of the article author in some cases
- cost:
	- AG Grid: enterprise subscription

### Floating filters

Floating Filters are an additional row under the column headers where the user will be able to see and optionally edit the filters associated with each column.

![[Pasted image 20230304175756.png]]

- value:
	- (Ola): nice to have, you can see exactly what filters are currently set
- cost:
	- AG Grid: FREE

### Column resizing

Resize columns by dragging the edge of the column header, Auto Fill to fill the grid width, or Auto Size columns to fit their content.

- value:
	- (Ola): may be pretty useful for columns with long content
- cost:
	- AG Grid: FREE

### Column ordering (api and drag n' drop)

Columns can be reorganized by dragging and dropping.

- value:
	- (Ola): probably mostly useful for large datasets
- cost:
	- AG Grid: free

### Touch support

User can navigate the features of the grid on a touch device with the built-in Touch Support.

- value:
	- (Ola): rather essential functionality
- cost:
	- AG Grid: FREE, works out of the box

### CSV Export

Use CSV Export to take data out of the grid and into another application for further processing such as Excel.

- value:
	- (Ola): very useful, no need to implement it ourselves
- cost:
	- AG Grid: FREE

### Cell values other than text (cell renderers)

Use Cell Rendering to have cells rendering values other than simple strings. For example, put country flags beside country names, or push buttons for actions.

![[Pasted image 20230303213330.png]]

![[Pasted image 20230304191625.png]]

- value:
	- (Ola): nice to have
- cost:
	- AG Grid: FREE

### Printing support

Remove all scrolling in the grid to make it ready for printing.

- value:
	- (Ola): pretty nice, you can easily print the article or save it as pdf incl. the whole datagrid, even if on the rendered website the grid component will have limited height and will have scroll
- cost:
	- AG Grid: FREE

### Pagination

![[Pasted image 20230303171856.png]]

- value:
	- (Ola): nice to have for really long datasets
- cost:
	- AG Grid: FREE

### Quick filter

Quick Filter filters all columns simultaneously with a simple text search, just like how you filter your Gmail.

![[Pasted image 20230303172033.png]]

- value:
	- (Ola): nice to have
- cost:
	- AG Grid: FREE

### Animations

Rows in the grid will Animate into place after the user sorts or filters.

- value:
	- not really needed, but looks really nice in AG Grid
- cost:
	- AG Grid: FREE

### Localisation

Support for different languages.

![[Pasted image 20230303213837.png]]

- value:
	- (Ola): kinda nice as the author of the article written in a different language could also adjust the table labels
- cost:
	- AG Grid: FREE

### Tree data

Use Tree Data to display data that has parent / child relationships where the parent / child relationships are provided as part of the data. For example, a folder can contain zero or more files and other folders.

![[Pasted image 20230303164116.png]]

- value:
	- (Ola): rather not a frequent use case
- cost:
	- AG Grid: enterprise subscription
	- Tanstack:

### Editing

Users can update data in cells.

![[Pasted image 20230303164825.png]]

- value:
	- (Ola) may be nice, if e.g. combined with status bar = changes in cells would update the aggregate numbers, so in some cases (esp. when the article revolves around e.g. outlier numbers in the datasets) it may be nice for the users to check for themselves how a single change could change the overall dataset stats
- cost:
	- AG Grid: FREE
	- Tanstack: 

### Excel export

Export to xlsx with extensive customisation to the values exported, layout, value formatting and styling of the exported spreadsheets.

- value:
	- (Ola): cool but rather not important atm; users can always export to csv (free)
- cost:
	- AG Grid: enterprise subscription

### Custom filters

Filter components allow you to add your own filter types to AG Grid.

![[Pasted image 20230304180129.png]]

- value:
	- (Ola): cool, but probably will rarely be used; can't think of a good use case
- cost:
	- AG Grid: FREE

### Keyboard navigation

The grid responds to keyboard interactions from the user as well as emitting events when key presses happen on the grid cells.

- value:
	- (Ola): probably useful for an excel like app
- cost:
	- AG Grid: FREE


### Copy to clipboard

- value:
	- (Ola): 1/10
		- cool, but rather not the top priority, maybe if some use cases emerge
- cost:
	- AG Grid: enterprise subscription

### Aligned grids

Have one or more grids horizontally Aligned so that any column changes in one grid impact the other grid. This allows two grids with different data to be kept horizontally in sync.

![[Pasted image 20230303164456.png]]

- value: 1/10
	- (Ola) nice but probably not a frequent use case
- cost:
	- AG Grid: FREE
	- Tanstack: 

### Row selection

Row Selection to select rows. Choose between click selection or checkbox selection. Selecting groups will select children. Then, do sth with selected items.

- value:
	- (Ola): probably not needed for our use case, as we don't want to allow any actions on selected rows
- cost:
	- AG Grid: FREE

### Row dragging

Row Dragging allows you to re-arrange rows by dragging them.

- value:
	- (Ola): probably not needed for our use case = a dataset showcase in an article
- cost:
	- AG Grid: FREE

### Overlays

Full control of Overlays to display messages to the user on top of the grid.

![[Pasted image 20230303213934.png]]

- value:
	- (Ola): not sure
- cost:
	- AG Grid: free

### Column spanning

Column Spanning allows cells to span columns, similar to cell span in Excel

![[Pasted image 20230303213533.png]]

- value:
	- (Ola): probably not needed; not sure what's the use case
- cost:
	- AG Grid: FREE

### Custom icons

All the icons in the grid can be replaced with your own Custom Icons. You can either use CSS or provide your own images.

- value:
	- (Ola): default ones are good enough imo (in AG Grid)
- cost:
	- AG Grid: FREE

### Full width rows

Full Width Rows allow you to have one cell that spans the entire width of the tables. This allows a card layout to work alongside the normal cells.

![[Pasted image 20230303213728.png]]

- value:
	- (Ola): probably not needed; not sure what's the use case
- cost:
	- AG Grid: FREE

### Standalone charts (AG Grid)

Standalone chart library.

- value:
	- (Ola): not sure, don't know this lib, would need to do some research
- cost:
	- AG Grid: free
