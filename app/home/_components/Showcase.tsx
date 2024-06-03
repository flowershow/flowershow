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
  };

  return (
    <div className="mx-auto mt-16 max-w-6xl px-4">
      <Heading
        id="showcase"
        heading="SHOWCASE"
        subheading="What others are creating"
      />
      <Slider {...settings}>
        {showcaseItems.map((item, index) => (
          <div key={index} className="px-2">
            <div className="overflow-hidden rounded-lg border border-dashed border-gray-300 p-4">
              <Link target="_blank" href={item.href}>
                <img
                  src={item.image}
                  alt={`Showcase ${index + 1}`}
                  className="w-full object-contain"
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
                  <div className="text-lg font-bold text-orange-400 dark:text-primary-dark">
                    {item.description} <ExternalLink className="inline-flex" />
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
