export const Feature = ({ title, description, image, align = "left" }) => {
  return (
    <div className="relative my-6 sm:my-8 lg:my-24">
      <div className="lg:grid lg:grid-flow-row-dense lg:grid-cols-2 lg:gap-8 lg:items-center justify-items-center">
        <div className={`max-w-lg ${align === "right" && "lg:col-start-2"}`}>
          <h3 className="text-3xl font-extrabold text-gray-900 tracking-tight sm:text-3xl whitespace-pre-line">
            {title}
          </h3>
          <p className="mt-3 text-lg text-gray-500">{description}</p>
        </div>
        <div
          className={`mt-10 -mx-4 relative lg:mt-0 ${
            align === "right" && "lg:col-start-1"
          }`}
        >
          <img
            className="relative mx-auto"
            width="400"
            src={image}
            alt={title}
          />
        </div>
      </div>
    </div>
  );
};

export default function Features() {
  return (
    <>
      <div
        id="features"
        className="max-w-7xl mx-auto pt-16 pb-8 px-4 sm:px-6 lg:pt-24 lg:pb-12 lg:px-8 lg:grid lg:gap-x-8 text-center"
      >
        <h2 className="text-base font-semibold text-theme-orange uppercase tracking-wide">
          Everything you need
        </h2>
        <h3 className="mt-2 text-4xl font-extrabold text-gray-900 whitespace-pre-line">
          Mature, Functional and Polished
        </h3>
        <p className="mt-4 text-2xl text-gray-500">
          Get a head-start on your data project using a mature, feature-rich,
          open solution.
        </p>
      </div>
      <div className="overflow-hidden">
        <div className="relative max-w-xl mx-auto px-4 sm:px-6 lg:px-8 lg:max-w-7xl">
          {features.map((val, i) => (
            <Feature
              key={i}
              align={i % 2 === 0 ? "right" : "left"}
              title={val.title}
              description={val.description}
              image={val.image}
            />
          ))}
        </div>
      </div>
    </>
  );
}

const features = [
  {
    title: "Works out of the box.\n Fully customizable.\n Pick two.",
    description: `DataHub Toolkit gives you the best of both worlds: the freedom and flexibility of open source with the quality 
      and features of an enterprise product. Ready to go “out of the box” with a rich feature-set, fully configured and elegantly themed.`,
    image: "/static/img/next/code-version-control.png",
  },
  {
    title: "Open and Flexible",
    description: `Start immediately with a complete set of features with the knowledge that you aren’t locked in to an expensive, inflexible 
      solution as your needs grow and evolve. Our platform’s open-source nature and extensible design mean you have full-freedom to customize 
      and extend the solution to fit your current and future needs.`,
    image: "static/img/next/open-source.png",
  },
  {
    title: "More than a data catalog:\n data infrastructure",
    description: `More than a data catalog: DataHub Toolkit is a framework for building your data management infrastructure 
			including storage integration, rich permissioning, ETL integration, data APIs and more.`,
    image: "static/img/next/git-request.png",
  },
  {
    title: "Let your data team focus on insights not logistics",
    description: `Our platform makes data discoverable and accessible so your data team - whether analysts, data scientists or developers- 
      can spend their time analysing and building rather than finding and pipelining.`,
    image: "static/img/next/pitch-meeting.png",
  },
  // {
  //   title: "Open-source sometimes means “assemble yourself”. We’re different.",
  //   description: `Open-source sometimes means “assemble yourself”. That’s not us. We provide a mature, polished product that’s working
  // 		out the box. Deploy on-cloud at the click of button or deploy on-premise with our dedicated team. Get guaranteed, professional
  // 		support and maintenance 24/7.`,
  //   image: "",
  // },
  // {
  //   title: "Incrementally integrate what you already have",
  //   description: `We don’t force you to throw out your existing data, tooling or processes. Instead, our open, extensible platform
  // 		provides a reliable, scalable way to gradually structure and integrate your existing data, tools and processes into a coherent whole.`,
  //   image: "",
  // },
  // {
  //   title: "One person to call",
  //   description: `Get the benefits of open-source with the assurance and simplicity of a company-backed product. We provide a single
  // 		point of contact along with enterprise-grade support, warranties and anything else you need to make your implementation hassle-free.`,
  //   image: "",
  // },
  // {
  //   title: "Here for the long-term",
  //   description: `As one of the oldest providers of data portals and catalogs we’ve seen a lot of projects and companies come and go.
  // 		We built the first public data portals, we built some of the first enterprise data catalogs. We’re a successful, substantial company
  // 		that’s passionate about data. We’re here for the long-term.`,
  //   image: "",
  // },
];
