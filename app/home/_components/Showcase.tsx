"use client";
import { Heading } from "@/components/heading";
import { ExternalLink } from "lucide-react";
import Link from "next/link";
import React from "react";
import Slider from "react-slick";

const showcaseItems = [
  {
    image: "/datahub-showcase-stratgy.lifeitself.png",
    description: "Lifeitself",
    href: "https://strategy.lifeitself.org/",
  },
  {
    image: "/datahub-showcase-data.qiot.kz.png",
    description: "qiot.kz",
    href: "https://data.qiot.kz/",
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
    image: "/datahub-showcase-press-freedom-2024.png",
    description: "Press Freedom 2024",
    href: "https://datahub.io/@cheredia19/press-freedom-2024",
  },
  {
    image: "/datahub-showcase-cross-section-scattering.png",
    description: "Cross Section Scattering",
    href: "https://datahub.io/@LuisVCSilva/cross_section_scattering",
  },
  {
    image: "/datahub-showcase-tourist-arrivals-in-nepal.png",
    description: "Tourist arrivals in Nepal",
    href: "https://datahub.io/@sagargg/tourist-arrivals-in-nepal",
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
    image: "/datahub-showcase-david-handbook.png",
    description: "David's handbook",
    href: "https://datahub.io/@davidgasquez/handbook",
  },
];

const Showcase: React.FC = () => {
  const settings = {
    dots: true,
    infinite: true,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 3000,
    appendDots: (dots) => <ul className="pt-[20px]"> {dots} </ul>,
  };

  return (
    <div className="showcase-carousel mx-auto mt-16 max-w-6xl px-4">
      <Heading
        id="showcase"
        heading="SHOWCASE"
        subheading="What others are creating"
      />
      <Slider {...settings}>
        {showcaseItems.map((item, index) => (
          <div key={index} className="px-2">
            <div className="overflow-hidden rounded-lg border border-dashed border-gray-300">
              <Link target="_blank" href={item.href}>
                <img
                  src={item.image}
                  alt={`Showcase ${index + 1}`}
                  className="h-80 w-full border object-contain object-center  sm:object-cover md:h-[750px] md:object-left-top"
                />

                <div className="relative">
                  <div
                    className="absolute inset-0 flex items-center"
                    aria-hidden="true"
                  >
                    <div className="w-full border-t border-gray-300"></div>
                  </div>
                </div>

                <div className="p-4 text-center">
                  <div className="flex items-center justify-center gap-1 text-sm font-bold text-orange-400 dark:text-primary-dark sm:text-lg">
                    {item.description}{" "}
                    <ExternalLink className="inline-flex w-[16px] sm:w-[24px]" />
                  </div>
                </div>
              </Link>
            </div>
          </div>
        ))}
      </Slider>
    </div>
  );
};

export default Showcase;
