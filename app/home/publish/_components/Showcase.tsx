"use client";
import Link from "next/link";
import Slider from "react-slick";
import chunkArray from "@/lib/chunk-array";

import { Heading } from "@/components/heading";
import { Container } from "@/components/container";
import { showcaseItems } from "@/const/showcase-items";

export function Showcase() {
  const settings = {
    dots: true,
    infinite: true,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    autoplay: false,
  };
  return (
    <Container>
      <Heading
        id="showcase"
        heading="SHOWCASE"
        subheading="What others are creating"
      />

      <Slider {...settings}>
        {chunkArray(showcaseItems, 6).map((chunk, chunkIndex) => {
          return (
            <div key={`slide-item-${chunkIndex}`}>
              <div className="mx-auto mb-10 mt-16 grid max-w-2xl grid-cols-1 gap-x-8 gap-y-20 lg:mx-0 lg:max-w-none lg:grid-cols-2 xl:grid-cols-3">
                {chunk.map((post, index) => (
                  <article
                    key={`${index}`}
                    className="flex flex-col items-start justify-between"
                  >
                    <Link href={post.href} className="group relative">
                      <div className="relative w-full">
                        <img
                          alt={post.description}
                          src={post.image}
                          className="aspect-[16/9] w-full rounded-2xl bg-gray-100 object-cover sm:aspect-[2/1] lg:aspect-[3/2]"
                        />
                        <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-gray-900/10" />
                      </div>
                      <div className="max-w-xl">
                        <div className=" relative">
                          <h3 className="mt-3 text-lg font-semibold leading-6 text-gray-900 group-hover:text-gray-600">
                            <span className="absolute inset-0" />
                            {post.description}
                          </h3>
                        </div>
                      </div>
                    </Link>
                  </article>
                ))}
              </div>
            </div>
          );
        })}
      </Slider>

      {/* <div className="mt-16 text-center">
                <Link
                    href="/publish/showcase"
                    className="text-orange-400 hover:text-orange-500"
                >
                    <span>View all</span>
                </Link>
            </div> */}
    </Container>
  );
}
