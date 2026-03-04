import clsx from 'clsx';
import Image from 'next/image';

interface HeroProps {
  title?: string;
  description?: string;
  image?: string;
  imageLayout?: 'right' | 'full';
  cta?: Array<{ label: string; href: string }>;
}

export default async function Hero({
  title,
  description,
  image,
  imageLayout,
  cta,
}: HeroProps) {
  const isFullWidthImage = image && imageLayout === 'full';
  return (
    <header className="page-hero-container">
      <div
        className={clsx(
          'page-hero',
          image && 'has-image',
          isFullWidthImage && 'image-full',
        )}
      >
        <div className="page-hero-content-container">
          <div className="page-hero-content">
            <h1 className="page-hero-title">{title ?? ''}</h1>
            <p className="page-hero-description">{description ?? ''}</p>
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
              fetchPriority="high"
            />
          </div>
        )}
      </div>
    </header>
  );
}
