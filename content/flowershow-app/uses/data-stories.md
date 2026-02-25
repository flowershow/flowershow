---
title: Tell data-rich stories with Markdown
description: Mix prose with live tables and charts. Flowershow turns your markdown into beautiful, data-driven posts that render local or external CSVs with reusable table and plotting components.
layout: plain
showToc: false
showEditLink: false
showComments: false
---

<div className="py-12 sm:py-24">
  <div className="mx-auto max-w-7xl px-6 lg:px-8">
    <div className="mx-auto max-w-3xl text-center">
      <h1 className="text-balance text-5xl font-semibold tracking-tight text-gray-900 sm:text-6xl">The best way to create markdown-based <span className="bg-clip-text text-transparent bg-gradient-to-r from-amber-500 to-yellow-500">data-rich stories</span></h1>
      <p className="mt-8 text-pretty text-lg font-medium text-gray-500 sm:text-xl/8">Write like you always do—then drop in live tables and charts. Flowershow renders local or external CSV files, so your posts stay readable <em>and</em> explorable.</p>
      <div className="mt-10 flex items-center justify-center gap-x-6">
        <a
          href="https://cloud.flowershow.app/"
          className="rounded-md bg-orange-400 px-3.5 py-2.5 text-sm font-semibold text-white shadow hover:bg-orange-300"
        >Start publishing for free</a>
      </div>
    </div>
    <div className="mt-16 max-w-6xl mx-auto flow-root sm:mt-24">
      <div className="-m-2 rounded-xl bg-gray-900/5 p-2 ring-1 ring-inset ring-gray-900/10 lg:-m-4 lg:rounded-2xl lg:p-4">
        <video width="1920" height="1080" className="w-full rounded-md" controls autoPlay muted loop>
          <source src="/assets/data-rich-demo-2.mp4" type="video/mp4"/>
        </video>
      </div>
    </div>
  </div>
</div>

<div className="bg-white py-12 sm:py-24">
  <div className="mx-auto max-w-7xl px-6 lg:px-8">
    <div className="mx-auto max-w-3xl lg:max-w-5xl">
      <dl className="grid grid-cols-1 gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 lg:gap-y-16">
        <div>
          <dt className="font-semibold text-gray-900">🧩 MDX-first authoring</dt>
          <dd className="mt-2 text-gray-600">Write in markdown; drop in table/plot components where you need them. Keep your content structure and frontmatter.</dd>
        </div>
        <div>
          <dt className="font-semibold text-gray-900">📊 CSV to Table</dt>
          <dd className="mt-2 text-gray-600">Render local or external CSVs as interactive tables with sorting, filtering, and pagination.</dd>
        </div>
        <div>
          <dt className="font-semibold text-gray-900">📈 Quick Charts</dt>
          <dd className="mt-2 text-gray-600">Line, bar, area, scatter—plot directly from CSVs with declarative props. No build steps or notebooks required.</dd>
        </div>
        <div>
          <dt className="font-semibold text-gray-900">🗂 Zero configuration</dt>
          <dd className="mt-2 text-gray-600">Keep your existing folder structure. Flowershow works with any markdown organization.</dd>
        </div>
        <div>
          <dt className="font-semibold text-gray-900">🔁 Always up-to-date</dt>
          <dd className="mt-2 text-gray-600">Point components at a CSV path or URL; update the file and your story updates with it.</dd>
        </div>
        <div>
          <dt className="font-semibold text-gray-900">🔍 SEO-friendly</dt>
          <dd className="mt-2 text-gray-600">Clean markup, meta tags, and social cards so your work is discoverable and shareable.</dd>
        </div>
      </dl>
    </div>
  </div>
</div>

<div className="overflow-hidden bg-white py-8 sm:py-12">
  <div className="mx-auto max-w-7xl px-6 lg:px-8">
    <div className="mx-auto grid max-w-2xl grid-cols-1 gap-x-8 gap-y-16 sm:gap-y-20 lg:mx-0 lg:max-w-none lg:grid-cols-2">
      <div className="lg:pr-8 lg:pt-4">
        <div className="lg:max-w-lg">
          <h2 className="mt-2 text-pretty text-4xl font-semibold tracking-tight text-gray-900 sm:text-5xl">Interactive tables</h2>
          <p className="mt-6 text-lg/8 text-gray-600">Point to a local or remote CSV and render a searchable, sortable table in one line of MDX.</p>
          <pre className="mt-6 overflow-x-auto rounded-lg bg-gray-50 p-4 text-sm leading-6 text-gray-800 ring-1 ring-gray-200">
{`<FlatUiTable
  data={{ url: "/assets/global-co2-emissions.csv" }}
/>`}
          </pre>
        </div>
      </div>
      <FlatUiTable data={{ url: "/assets/global-co2-emissions.csv" }} />
    </div>
  </div>
</div>

<div className="overflow-hidden bg-white py-8 sm:py-12">
  <div className="mx-auto max-w-7xl px-6 lg:px-8">
    <div className="mx-auto grid max-w-2xl grid-cols-1 gap-x-8 gap-y-16 sm:gap-y-20 lg:mx-0 lg:max-w-none lg:grid-cols-2">
      <div className="lg:pr-8 lg:pt-4">
        <div className="lg:max-w-lg">
          <h2 className="mt-2 text-pretty text-4xl font-semibold tracking-tight text-gray-900 sm:text-5xl">Line charts</h2>
          <p className="mt-6 text-lg/8 text-gray-600">Visualize trends and continuous changes over time with simple line charts. Pull columns by name and you’re done.</p>
          <pre className="mt-6 overflow-x-auto rounded-lg bg-gray-50 p-4 text-sm leading-6 text-gray-800 ring-1 ring-gray-200">
{`<LineChart 
  data={{ url: "/assets/global-co2-emissions.csv" }}
  title="Global CO2 Emissions from fossil-fuels"
  xAxis="Year"
  yAxis="Total"
/>`}
          </pre>
        </div>
      </div>
      <LineChart 
        data={{ url: "/assets/global-co2-emissions.csv" }}
        title="Global CO2 Emissions from fossil-fuels"
        xAxis="Year"
        yAxis="Total"
      />
    </div>
  </div>
</div>

<div className="overflow-hidden bg-white py-8 sm:py-12">
  <div className="mx-auto max-w-7xl px-6 lg:px-8">
    <div className="mx-auto grid max-w-2xl grid-cols-1 gap-x-8 gap-y-16 sm:gap-y-20 lg:mx-0 lg:max-w-none lg:grid-cols-2">
      <div className="lg:pr-8 lg:pt-4">
        <div className="lg:max-w-lg">
          <h2 className="mt-2 text-pretty text-4xl font-semibold tracking-tight text-gray-900 sm:text-5xl">Bar charts</h2>
          <p className="mt-6 text-lg/8 text-gray-600">Compare discrete data points across different categories or groups with a bar chart.</p>
          <pre className="mt-6 overflow-x-auto rounded-lg bg-gray-50 p-4 text-sm leading-6 text-gray-800 ring-1 ring-gray-200">
{`<PlotlyBarChart
  data={{
    url: '/assets/global-co2-emissions-2010.csv'
  }}
  title="Emissions distribution in 2010"
  xAxis="Type"
  yAxis="Amount"
/>`}
          </pre>
        </div>
      </div>
      <PlotlyBarChart
        data={{
          url: '/assets/global-co2-emissions-2010.csv'
        }}
        title="Emissions distribution in 2010"
        xAxis="Type"
        yAxis="Amount"
      />
    </div>
  </div>
</div>

<div className="overflow-hidden bg-white py-8 sm:py-12">
  <div className="mx-auto max-w-7xl px-6 lg:px-8">
    <div className="mx-auto max-w-3xl lg:text-center">
      <h2 className="mt-2 text-pretty text-4xl font-semibold tracking-tight text-gray-900 sm:text-5xl">And more!</h2>
      <p className="mt-6 text-lg/8 text-gray-600">Check out other available data-rich components and start using them today!</p>
      <div className="mt-10 flex items-center justify-center gap-x-6">
        <a
          href="https://components.flowershow.app/"
          className="rounded-md bg-slate-900 px-3.5 py-2.5 text-sm font-semibold text-white shadow hover:bg-slate-800"
        >See all components</a>
      </div>
    </div>
  </div>
</div>

<div className="py-12 sm:py-24 my-12">
  <div className="mx-auto max-w-7xl px-6 lg:px-8">
      <h2 className="mb-4 text-pretty text-balance text-4xl font-semibold tracking-tight text-gray-900 sm:mb-6 sm:text-5xl">Be the first to know about new features</h2>
      <CustomHtml html={`<iframe data-tally-src="https://tally.so/embed/mYy8k6?alignLeft=1&hideTitle=1&transparentBackground=1&dynamicHeight=1" width="100%" height="157" frameBorder="0" marginHeight="0" marginWidth="0" title="Want product news and updates? Sign up for our newsletter."></iframe><script async src="https://tally.so/widgets/embed.js"></script>`}/>
  </div>
</div>

<div className="bg-slate-900 mt-16 sm:mt-20 md:mt-24">
  <div className="px-6 py-24 sm:px-6 sm:py-32 lg:px-8">
    <div className="mx-auto max-w-2xl text-center">
      <h2 className="text-balance text-4xl font-semibold tracking-tight text-white sm:text-5xl">Start using Flowershow today.</h2>
      <p className="mx-auto mt-6 max-w-xl text-pretty text-lg/8 text-slate-100">Publish an elegant markdown-based website in a breeze.</p>
      <div className="mt-10 flex items-center justify-center gap-x-6">
        <a
          href="https://cloud.flowershow.app/"
          className="rounded-md bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-900 shadow hover:bg-slate-200"
        >Sing up for free</a>
      </div>
    </div>
  </div>
</div>



