import Link from "next/link";

export default function CaseStudies() {
  const caseStudy = {
    tag: "CASE STUDY",
    title:
      "An Open Data Platform for Vital Strategies - a global public health organization",
    eta: "6min read",
    description:
      "We worked with Vital Strategies - an international nonprofit that assists governments by designing easily scalable solutions to address the many challenges found in—and around—public health to building an Open Data Portal with the right tools to help users easily access and visualize public health data.",
    imgUrl: "/static/img/opengov/case-bg.png",
  };
  return (
    <section className="flex justify-center mt-24">
      <div>
        <article className="xl:max-w-7xl lg:max-w-5xl md:max-w-3xl sm:max-w-2xl max-w-md">
          <h2 className="text-4xl font-bold text-center font-['Poppins'] py-8">
            CASE STUDIES
          </h2>
          <div className="xl:w-[84rem] relative flex-col">
            <div className="w-fit">
              <img
                src={caseStudy.imgUrl}
                alt="Case Study Logo"
                className="object-fill rounded-lg"
              />
            </div>
            <div className="leading-relaxed lg:absolute top-40 inset-y-0 right-0 xl:w-[48rem] lg:w-[40rem] bg-white rounded-tl- lg">
              <div className="p-12 flex flex-col justify-between h-full">
                <div className="flex items-center gap-4 lg:mb-0 mb-8">
                  <p className="text-[#457EFF]">{caseStudy.tag}</p>
                  <p className="bg-[#EBEEF2] max-h-8 fit text-[#495367] px-3">
                    {caseStudy.eta}
                  </p>
                </div>
                <div className="font-['Poppins'] text-[#1A202E] lg:mb-0 mb-8">
                  <h2 className="text-4xl font-bold mb-8">{caseStudy.title}</h2>
                  <p className="py-3 text-justify">{caseStudy.description}</p>
                </div>
                <div classname="my-3">
                  <Link
                    href="/collections"
                    className="py-4 px-6 rounded-lg text-white bg-[#22C55E] font-['Poppins'] text-xl font-extrabold hover:bg-green-700 hover:underline"
                  >
                    SEE MORE CASE STUDIES
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}
