import config from "@/config.json";

export default function Footer() {
  return (
    <footer className="bg-background" aria-labelledby="footer-heading">
      <p id="footer-heading" className="sr-only">
        Footer
      </p>
      <div className="mx-auto px-6 pb-[60px] pt-16 sm:pb-8 sm:pt-24 lg:px-8 lg:pt-32">
        <div className="mt-8 border-t border-gray-900/10 pt-8 sm:mt-10 lg:mt-12">
          <p className="text-xs leading-5 text-gray-500">
            <span>&copy; 2024 All rights reserved</span>
            <svg
              viewBox="0 0 2 2"
              aria-hidden="true"
              className="mx-2 inline h-0.5 w-0.5 fill-current"
            >
              <circle r={1} cx={1} cy={1} />
            </svg>
            Built with{" "}
            <span className="text-gray-600 hover:text-gray-900">
              {config.title}
            </span>
          </p>
        </div>
      </div>
    </footer>
  );
}
