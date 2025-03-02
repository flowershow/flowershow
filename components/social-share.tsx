"use client";

import { TwitterIcon, LinkedInIcon, FacebookIcon } from "./icons";
import { useEffect, useState } from "react";

interface SocialShareProps {
  title: string;
}

export const SocialShare = ({ title }: SocialShareProps) => {
  const [currentUrl, setCurrentUrl] = useState<string>("");

  useEffect(() => {
    setCurrentUrl(window.location.href);
  }, []);

  const iconProps = {
    width: 24,
    height: 24,
    className: "w-5 h-5",
  };

  return (
    <div className="mt-8 border-t border-gray-200 pt-6">
      <h3 className="text-xs font-normal uppercase tracking-wider text-primary-muted">
        SHARE THIS POST
      </h3>
      <div className="mt-4 flex space-x-4">
        <a
          href={`https://twitter.com/share?text=${encodeURIComponent(
            title,
          )}&url=${encodeURIComponent(currentUrl)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-primary"
        >
          <TwitterIcon {...iconProps} />
        </a>
        <a
          href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
            currentUrl,
          )}`}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-primary"
        >
          <LinkedInIcon {...iconProps} />
        </a>
        <a
          href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
            currentUrl,
          )}`}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-primary"
        >
          <FacebookIcon {...iconProps} />
        </a>
      </div>
    </div>
  );
};
