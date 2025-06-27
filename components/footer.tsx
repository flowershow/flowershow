import { getConfig } from "@/lib/app-config";

const config = getConfig();

export default function Footer() {
  return (
    <footer className="bg-inherit" aria-labelledby="footer-heading">
      <p id="footer-heading" className="sr-only">
        Footer
      </p>
      <div className="sm:pt-24lg:pt-32 pb-[60px] pt-16 sm:pb-8">
        <div className="mt-8 border-t border-gray-900/10 pt-8 sm:mt-10 lg:mt-12">
          <p className="text-xs leading-5 text-primary-muted">
            <span>&copy; 2025 All rights reserved</span>
            <svg
              viewBox="0 0 2 2"
              aria-hidden="true"
              className="mx-2 inline h-0.5 w-0.5 fill-current"
            >
              <circle r={1} cx={1} cy={1} />
            </svg>
            Built with <strong>{config.title}</strong>
          </p>
        </div>
      </div>
    </footer>
  );
}
