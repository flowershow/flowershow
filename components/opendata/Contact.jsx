export default function Contact() {
  return (
    <section
      className="py-20 md:py-28 bg-white"
      style={{
        backgroundImage: `url("/static/img/opendata/flex-ui-assets/elements/pattern-white.svg")`,
      }}
    >
      <div className="container px-4 mx-auto">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="mb-4 text-3xl md:text-4xl font-heading font-bold text-[#2A3342]">
            Data Management is complex. We make it easy.{" "}
          </h2>
          <p className="mb-6 text-lg md:text-xl font-heading font-medium text-[#556987] ">
            Get the answers you need today. Join thousands of happy customers.
          </p>
          <a
            href="https://calendar.app.google/SXtsM5uoWvQuZgbB8"
            target="_blank"
            className="inline-block py-3 px-7 w-full md:w-auto text-lg leading-7 text-green-50 bg-orange-400 hover:bg-orange-600 font-medium text-center focus:ring-2 focus:ring-orange-400 focus:ring-opacity-50 border border-transparent rounded-md shadow-sm"
          >
            Schedule a free call
          </a>
        </div>
      </div>
    </section>
  );
}
