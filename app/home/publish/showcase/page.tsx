import Link from "next/link";

/* import { Section } from "@/components/section"; */
import { Container } from "@/components/container";
import { Heading } from "@/components/heading";
import { showcaseItems } from "@/const/showcase-items";

export default function ShowcasePage() {
  return (
    <div className="mt-12 md:mt-24">
      <Container>
        <Heading
          id="showcase"
          heading="SHOWCASE"
          subheading="What others are creating"
        />
        <div className="mx-auto mb-10 mt-16 grid max-w-2xl grid-cols-1 gap-x-8 gap-y-20  lg:max-w-none lg:grid-cols-2 xl:grid-cols-3">
          {showcaseItems.map((item, index) => {
            return (
              <article
                key={`${index}`}
                className="flex flex-col items-start justify-between"
              >
                <Link href={item.href} className="group relative">
                  <div className="relative w-full">
                    <img
                      alt={item.description}
                      src={item.image}
                      className="aspect-[16/9] w-full rounded-2xl bg-gray-100 object-cover sm:aspect-[2/1] lg:aspect-[3/2]"
                    />
                    <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-gray-900/10" />
                  </div>
                  <div className="max-w-xl">
                    <div className=" relative">
                      <h3 className="mt-3 text-lg font-semibold leading-6 text-gray-900 group-hover:text-gray-600">
                        <span className="absolute inset-0" />
                        {item.description}
                      </h3>
                    </div>
                  </div>
                </Link>
              </article>
            );
          })}
        </div>
      </Container>
    </div>
  );
}
