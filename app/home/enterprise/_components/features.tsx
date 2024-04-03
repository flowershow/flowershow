import { Heading } from "@/components/heading";

export const Feature = ({ title, description, image, align = "left" }) => {
  return (
    <div className="relative my-6 sm:my-8 lg:my-24">
      <div className="justify-items-center lg:grid lg:grid-flow-row-dense lg:grid-cols-2 lg:items-center lg:gap-8">
        <div className={`max-w-lg ${align === "right" && "lg:col-start-2"}`}>
          <h3 className="whitespace-pre-line text-3xl font-semibold tracking-tight sm:text-3xl">
            {title}
          </h3>
          <p className="mt-3 text-lg opacity-75">{description}</p>
        </div>
        <div
          className={`relative -mx-4 mt-10 lg:mt-0 ${
            align === "right" && "lg:col-start-1"
          }`}
        >
          <img
            className="relative mx-auto"
            width="400"
            src={image}
            alt={title}
            title={title}
          />
        </div>
      </div>
    </div>
  );
};

export default function Features() {
  return (
    <>
      <Heading
        id="features"
        heading="Everything you need"
        subheading="Mature, Functional and Polished"
      />
      <p className="mt-4 text-center text-2xl opacity-75">
        Get a head-start on your data project using a mature, feature-rich, open
        solution.
      </p>
      <div className="overflow-hidden">
        <div className="relative mx-auto px-4 sm:px-6 lg:px-8">
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
    description: `Our solution gives you the best of both worlds: the freedom and flexibility of open source with the quality
      and features of an enterprise product. Ready to go “out of the box” with a rich feature-set, fully configured and elegantly themed.`,
    image: "/code-version-control.png",
  },
  {
    title: "Open and Flexible",
    description: `Start immediately with a complete set of features with the knowledge that you aren’t locked in to an expensive, inflexible
      solution as your needs grow and evolve. Our platform’s open-source nature and extensible design mean you have full-freedom to customize
      and extend the solution to fit your current and future needs.`,
    image: "/open-source.png",
  },
  {
    title: "More than a data catalog:\n data infrastructure",
    description: `More than a data catalog: it is a framework for building your data management infrastructure
including storage integration, rich permissioning, ETL integration, data APIs and more.`,
    image: "/git-request.png",
  },
  {
    title: "Let your data team focus on insights not logistics",
    description: `Our platform makes data discoverable and accessible so your data team - whether analysts, data scientists or developers-
      can spend their time analysing and building rather than finding and pipelining.`,
    image: "/pitch-meeting.png",
  },
];
