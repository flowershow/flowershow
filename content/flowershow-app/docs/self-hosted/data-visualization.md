---
title: Visualizing data in FlowerShow
---

> [!warning]
> You are viewing documentation for Flowershow Self-Hosted. Flowershow Cloud documentation can be found [[docs/README|here]].

Flowershow allows you to easily embed data visualization components into your FlowerShow app. There's no need for coding or manual embedding of charts and tables; you can effortlessly include them in your document using a straightforward syntax. Components can be added by either providing inline data or referencing external data files.

For example, a chart like the one below:

```jsx
<LineChart data={ [ ["1850",-0.41765878], ["1851",-0.2333498], ["1852",-0.22939907], ["1853",-0.27035445], ["1854",-0.29163003], ["1855",-0.18050575], ["1856",-0.15524832], ["1857",-0.2417654], ["1858",-0.35097656], ["1859",-0.27654367], ["1860",-0.20564236], ["1861",-0.15032158], ["1862",-0.12354097], ["1863",-0.09876543], ["1864",-0.06789012], ["1865",-0.03578976], ["1866",0.01234567], ["1867",0.04567892], ["1868",0.01890123], ["1869",0.12345678], ["1870",0.16789012], ["1871",0.17789012], ["1871",0.18789012], ] } />
```

will be displayed as:
![[linechart.png]]

To use the `@portaljs/component` in FlowerShow, follow these steps:

1. Run the following command to install the `@portaljs/components` package:

   ```bash
   npm install @portaljs/components
   ```

2. Import the component in the `components/MdxPage.tsx` file using dynamic import:

   ```ts
   import dynamic from "next/dynamic";

   const LineChart = dynamic(
       async () => {
           return (await import("@portaljs/components")).LineChart;
       },
       { ssr: false }
   );
   ```

3. Add the imported component to the `components` constant:

   ```ts
   const components = {
       LineChart: LineChart,
       // Other components
   };
   ```

4. Now, you can use the `LineChart` component in your `.md` file as usual.

For a comprehensive list and API documentation of available data visualization components, please visit [PortalJS Storybook](https://storybook.portaljs.org/?path=/docs/components-table--docs).