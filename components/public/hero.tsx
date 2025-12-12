import clsx from "clsx";
import { api } from "@/trpc/server";
import Image from "next/image";

interface HeroProps {
  siteId?: string;
  title?: string;
  description?: string;
  image?: string;
  cta?: Array<{ label: string; href: string }>;
}

export default async function Hero({
  siteId,
  title,
  description,
  image,
  cta,
}: HeroProps) {
  // Try to fetch custom hero
  let customHeroContent: string | null = null;

  if (siteId) {
    try {
      const customHeroBlob = await api.site.getBlobByPath.query({
        siteId,
        path: "_flowershow/components/Hero.html",
      });

      if (customHeroBlob) {
        customHeroContent = await api.site.getBlobContent.query({
          id: customHeroBlob.id,
        });
      }
    } catch (error) {
      // Custom hero doesn't exist, will use default
    }
  }

  // If custom hero exists, render it as HTML
  if (customHeroContent) {
    return (
      <>
        <p id="hero" className="sr-only">
          Hero
        </p>
        <div
          id="customhero"
          dangerouslySetInnerHTML={{ __html: customHeroContent }}
        />
      </>
    );
  }

  // Default hero
  return (
    <header className="page-hero-container">
      <div className={clsx("page-hero", image && "has-image")}>
        <div className="page-hero-content-container">
          <div className="page-hero-content">
            <h1 className="page-hero-title">{title ?? ""}</h1>
            <p className="page-hero-description">{description ?? ""}</p>
            {cta && (
              <div className="page-hero-ctas-container">
                {cta.map((ctaItem) => (
                  <a
                    key={ctaItem.label}
                    href={ctaItem.href}
                    className="page-hero-cta"
                  >
                    {ctaItem.label}
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
        {image && (
          <div className="page-hero-image-container">
            <Image
              alt="Hero Image"
              width={1200}
              height={800}
              src={image}
              className="page-hero-image"
            />
          </div>
        )}
      </div>
    </header>
  );
}
