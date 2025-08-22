import Link from "next/link";
import { getConfig } from "@/lib/app-config";

const config = getConfig();

export default function Footer() {
  return (
    <footer className="site-footer" aria-labelledby="footer">
      <div className="site-footer-inner">
        <p id="footer" className="sr-only">
          Footer
        </p>
        <div className="site-footer-copyright">
          <span>&copy; 2025 All rights reserved</span>
          <svg
            viewBox="0 0 2 2"
            aria-hidden="true"
            className="site-footer-copyright-icon"
          >
            <circle r={1} cx={1} cy={1} />
          </svg>
        </div>
        <div className="site-footer-built-with">
          Built with <Link href={config.landingPageUrl}>{config.title}</Link>
        </div>
      </div>
    </footer>
  );
}
