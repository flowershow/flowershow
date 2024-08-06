"use client";
import { Heading } from "@/components/heading";
import chunkArray from "@/lib/chunk-array";
import { ExternalLink } from "lucide-react";
import Link from "next/link";
import React from "react";
import Slider from "react-slick";

const showcaseItems = [
  {
    image: "/datahub-showcase-cross-section-scattering.png",
    description: "Cross Section Scattering",
    href: "https://datahub.io/@LuisVCSilva/cross_section_scattering",
  },
  {
    image: "/datahub-showcase-city-ranking-kz-2022.png",
    description: "City Ranking KZ 2022",
    href: "https://datahub.io/@TyuninaA/city-ranking",
  },
  {
    image: "/datahub-showcase-notes-lifeitself.png",
    description: "Lifeitself notes",
    href: "https://notes.lifeitself.org/",
  },
  {
    image: "/datahub-showcase-press-freedom-2024.png",
    description: "Press Freedom 2024",
    href: "https://datahub.io/@cheredia19/press-freedom-2024",
  },

  {
    image: "/datahub-showcase-finance-vix.png",
    description: "Dataset ( CBOE Volatility Index )",
    href: "https://datahub.io/core/finance-vix",
  },
  {
    image: "/datahub-showcase-oil-prices-this.png",
    description: "Dataset ( Brent and WTI Spot Prices )",
    href: "https://datahub.io/@Daniellappv/oil-prices-this",
  },
  {
    image: "/datahub-showcase-co2-ppm.png",
    description: "Dataset ( Trends in Atmospheric Carbon Dioxide )",
    href: "https://datahub.io/core/co2-ppm",
  },
  {
    image: "/datahub-showcase-bitcoin-coingecko.png",
    description: "3,468 days of Bitcoin history",
    href: "https://datahub.io/@cheredia19/bitcoin-coingecko",
  },
  {
    image: "/datahub-showcase-50-yt-channel-most-subscribers.png",
    description: "50 YouTube channels most subscribers",
    href: "https://datahub.io/@cheredia19/50-yt-channels-most-subscribers",
  },
  {
    image: "/datahub-showcase-yoy-food-prices.png",
    description: "YoY Food prices",
    href: "https://datahub.io/@cheredia19/yoy-food-prices",
  },
  {
    image: "/datahub-showcase-happiness-report.png",
    description: "World Happiness Report 2024",
    href: "https://datahub.io/@cheredia19/happiness2024",
  },
  {
    image: "/datahub-showcase-imprisoned-journalists-2024.png",
    description: "Imprisoned journalists 2024",
    href: "https://datahub.io/@cheredia19/imprisoned-journalists-2024",
  },

  {
    image: "/datahub-showcase-data.qiot.kz.png",
    description: "qiot.kz",
    href: "https://data.qiot.kz/",
  },
  {
    image: "/datahub-showcase-tourist-arrivals-in-nepal.png",
    description: "Tourist arrivals in Nepal",
    href: "https://datahub.io/@sagargg/tourist-arrivals-in-nepal",
  },
  {
    image: "/datahub-showcase-david-handbook.png",
    description: "David's handbook",
    href: "https://datahub.io/@davidgasquez/handbook",
  },
  {
    image: "/datahub-showcase-stratgy.lifeitself.png",
    description: "Lifeitself",
    href: "https://strategy.lifeitself.org/",
  },
];

const Showcase: React.FC = () => {
  const settings = {
    dots: true,
    infinite: true,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    autoplay: false,
  };
  return (
    <div className="showcase-carousel mx-auto mt-16 max-w-6xl px-4">
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
                    <a href={post.href} className="group relative">
                      <div className="relative w-full">
                        <img
                          alt=""
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
                    </a>
                  </article>
                ))}
              </div>
            </div>
          );
        })}
      </Slider>
    </div>
  );
};

export default Showcase;
