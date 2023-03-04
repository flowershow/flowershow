---
title: Data Tables
created: 2022-03-03
authors: [Ola Rubaj]
---

🚧 WIP 75%

## Table of contents

## TL;DR

There seem to be two major players among data table libraries: AG Grid (component-based) and Tanstack table (headless).

Great overview of AG Grid features: https://www.ag-grid.com/javascript-data-grid/grid-features/
Example features implemented using AG Grid and Tanstack table (comparison): https://blog.ag-grid.com/headless-react-table-vs-ag-grid-react-data-grid/

**Recommendation:**
AG Grid seems to be a robust, feature-rich and customizable (to an extent, but I don't think we need sth fully tailored with some crazy UX or design) solution used for many enterprise solutions (reportedly). The free version includes most of the really valuable features that will just work out of the box and look good. I think even the enterprise version is much cheaper than designing, developing and maintaining costum UI. So, I'd start with the basic plan for now, and once we need really need sth from the enterprise plan, I'd probably just buy it.

## Data table libraries comparison

### Tanstack Table

- Summary:
	- **headless** UI for building powerful tables & datagrids
 - GH stars (TanStack/table): 20k
 - Bundle size (react-table): 10-15kb
 - Weekly downloads (react-table): ~390k 
- Pros:
	- Full control over markup and styles (e.g. with Tailwind)
		 - "nothing is stopping you from customizing and overriding literally everything to your liking."
	- Smaller bundle-sizes (probably, but writing all the ui components ourselves increases the bundle size too)
- Cons:
	- More setup required
	- No markup, styles or themes provided

### AG Grid

- Summary:
	- feature-packed, component-based datagrid library 
	- "Over 1.2 million monthly downloads of AG Grid Community and over 80% of the Fortune 500 using AG Grid Enterprise."
 - GH stars (ag-grid/ag-grid): 10k
 - Bundle size (ag-grid-community + ag-grid-react): ~218kb+15kb
- Pros:
	- Ships with ready-to-use markup/styles
	- Little setup required
	- Complete solution
	- Lots of features
	- Recommended by Tanstack for a component-based solution 
	- no 3rd party dependencies
	- looks professional (which doesn't have to be the case when we try styling the tables on our own without a good design; but also: what for if this looks really good)
- Cons:
	- Less control over markup/styles
	- Larger bundle-size (but probably not as huge as it seems, as we'd have to add all the missing features and styles ourselves; also the bundle size can be decreased by only installing the features we use; see [this article](https://blog.ag-grid.com/minimising-bundle-size/))

## Features

### Column filtering: text, date, num comparisons [10/10]

![[Pasted image 20230303170557.png]]
![[Pasted image 20230303170636.png]]
- value:
	- (Ola): 10/10
		- basic, essential functionality
- cost:
	- AG Grid: FREE

### Aggregation (count, max, mix etc.) [8/10]

![[Pasted image 20230304005625.png]]

- value:
	- (Ola): 8/10
		- very useful, aggregation allows for quickly getting rough understanding of the data
- cost:
	- AG Grid: enterprise subscription

### Column filtering: set filtering [7/10]

Like in excel, checkboxes to select values from a set.

![[Pasted image 20230303163649.png]]

- value:
	- (Ola) 7/10
		- pretty useful and rather basic functionality; but in free AG plan text filters can be used instead (although the UX is not as good)
- cost:
	- AG Grid: enterprise subscription

### Excel export [2/10]

Export to xlsx with extensive customisation to the values exported, layout, value formatting and styling of the exported spreadsheets.

- value:
	- (Ola): 2/10
		- cool but rather not important atm; users can always export to csv (free)
- cost:
	- AG Grid: enterprise subscription

### Rows grouping

- value:
- cost:
	- AG Grid: enterprise subscription

### Status bar

The Status Bar appears on the bottom of the grid and shows aggregations (sum, min, max etc.) when you select a range of cells using range selection. This is similar to what happens in Excel.

![[Pasted image 20230303163850.png]]

- value:
- cost:
	- AG Grid: enterprise subscription
	- Tanstack:

### Pivot tables

- value:
- cost:
	- AG Grid: enterprise subscription
	- Tanstack:

### Show, hide columns

- value:
- cost:
	- AG Grid: enterprise subscription
	- Tanstack:

### Tree data

Use Tree Data to display data that has parent / child relationships where the parent / child relationships are provided as part of the data. For example, a folder can contain zero or more files and other folders.

![[Pasted image 20230303164116.png]]

- value:
- cost:
	- AG Grid: enterprise subscription
	- Tanstack:

### Context menu
???

### Accessibility
- value:
- cost: 
	- AG Grid: FREE (support in all core components)
	- Tanstack: we'd need to add support ourselves

### Aligned grids

Have one or more grids horizontally Aligned so that any column changes in one grid impact the other grid. This allows two grids with different data to be kept horizontally in sync.

![[Pasted image 20230303164456.png]]

- value: 1/10
	- (Ola) cool but what't the use case?
- cost:
	- AG Grid: FREE
	- Tanstack: 

### Editing

Users can update data in cells.

![[Pasted image 20230303164825.png]]

- value: 1/10
	- (Ola) cool but what't the use case?
- cost:
	- AG Grid: FREE
	- Tanstack: 

### Column groups

Expandable column groups.

![[Pasted image 20230303170907.png]]
![[Pasted image 20230303170945.png]]- value:
- cost:
	- AG Grid: free

### Column moving (drag n' drop)

Columns can be reorganized by dragging and dropping.

- value:
- cost:
	- AG Grid: free

### Column pinning

Use Column Pinning to pin one or more columns to the left or to the right. Pinned columns are always present and not impacted by horizontal scroll.

- value:
- cost:
	- AG Grid: free

### Column resizing

Resize columns by dragging the edge of the column header, Auto Fill to fill the grid width, or Auto Size columns to fit their content.

- value:
- cost:
	- AG Grid: FREE
	- Tanstack: 

### CSV Export

Use CSV Export to take data out of the grid and into another application for further processing such as Excel.

- value:
- cost:
	- AG Grid: FREE
	- Tanstack: 

### Custom filters

- value:
- cost:
	- AG Grid: FREE
	- Tanstack: 

### Keyboard navigation

With Keyboard Navigation users can use cursor keys and tab keys to navigate between cells.

- value:
- cost:
	- AG Grid: FREE
	- Tanstack: 

### Printing

Remove all scrolling in the grid to make it ready for printing.

- value:
- cost:
	- AG Grid: FREE
	- Tanstack: 

### Pagination

![[Pasted image 20230303171856.png]]

- value:
- cost:
	- AG Grid: FREE
	- Tanstack: 

### Quick filter

Quick Filter filters all columns simultaneously with a simple text search, just like how you filter your Gmail.

![[Pasted image 20230303172033.png]]

- value:
- cost:
	- AG Grid: FREE
	- Tanstack: 

### Row selection

Row Selection to select rows. Choose between click selection or checkbox selection. Selecting groups will select children. Then, do sth with selected items.

- value:
- cost:
	- AG Grid: FREE
	- Tanstack: 

### Row sorting

Row Sorting will sort the data by given column.

- value:
- cost:
	- AG Grid: FREE
	- Tanstack: yes

### Row dragging

Row Dragging allows you to re-arrange rows by dragging them.

- value:
- cost:
	- AG Grid: FREE
	- Tanstack: 

### Touch support

User can navigate the features of the grid on a touch device with the built-in Touch Support.

- value:
- cost:
	- AG Grid: FREE, works out of the box
	- Tanstack: 

### Animations

Rows in the grid will Animate into place after the user sorts or filters.

- value:
- cost:
	- AG Grid: FREE
	- Tanstack: 

### Cell values other than text

Use Cell Rendering to have cells rendering values other than simple strings. For example, put country flags beside country names, or push buttons for actions.

![[Pasted image 20230303213330.png]]

- value:
- cost:
	- AG Grid: FREE
	- Tanstack: 

### Cell styling

Use CSS rules to define Cell Style based on data content, e.g. put a red background onto cells that have negative values, and green on values greater than 100.

![[Pasted image 20230303213427.png]]

- value:
- cost:
	- AG Grid: FREE
	- Tanstack: 

### Column spanning

Column Spanning allows cells to span columns, similar to cell span in Excel

![[Pasted image 20230303213533.png]]

- value:
- cost:
	- AG Grid: FREE
	- Tanstack: 

### Custom icons

All the icons in the grid can be replaced with your own Custom Icons. You can either use CSS or provide your own images.

- value:
- cost:
	- AG Grid: FREE
	- Tanstack: 

### Full width rows

Full Width Rows allow you to have one cell that spans the entire width of the tables. This allows a card layout to work alongside the normal cells.

![[Pasted image 20230303213728.png]]

- value:
- cost:
	- AG Grid: FREE
	- Tanstack: 

### Localisation

Support for different languages.

![[Pasted image 20230303213837.png]]

- value:
- cost:
	- AG Grid: FREE
	- Tanstack: 

### Overlays

Full control of Overlays to display messages to the user on top of the grid.

![[Pasted image 20230303213934.png]]

### Customizable row height

Rows can have different Row Height. You can even change the row height dynamically at run time.

- value:
- cost:

### Row pinning

Use Pinned Rows to pin one or more rows to the top or the bottom. Pinned rows are always present and not impacted by vertical scroll.

### Integrated charts (AG Grid)

**User created charts:**

![[Pasted image 20230303223811.png]]

![[Pasted image 20230303223846.png]]

A user creates a chart using the grid's UI by selecting a range of cells or entering pivot mode and then creating a chart via the context menu.

**Application charts:**

The application requests the grid to create a chart through the grid's charting API.

![[Pasted image 20230303223910.png]]

- value:
- cost:
	- AG Grid: enterprise plan

### Sparklines (mini in-cell charts)

Mini charts that are optimised for grid cells that can be used to provide insights into data trends at a glance.

![[Pasted image 20230303224227.png]]
![[Pasted image 20230303224248.png]]


- value:
- cost:
	- AG Grid: enterprise plan

### Standalone charts (AG Grid)

Standalone chart library.

- value:
- cost:
	- AG Grid: free

### Copy to clipboard [ 1/10]

- value:
	- (Ola): 1/10
		- cool, but rather not the top priority, maybe if some use cases emerge
- cost:
	- AG Grid: enterprise subscription
