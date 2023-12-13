export default {
  title: "DataRich",
  description: "Markdown on steroids for data-driven documents",
  author: "Datopian",
  logo: "/datopian-logo-black.png",
  navbarTitle: {
    text: "DataRich Documents",
    version: "Alpha",
  },
  navLinks: [
    // { href: "/#quick-start", name: "Quickstart" },
    // { href: "/blog/basic-tutorial", name: "Docs" },
    // { href: "/#features", name: "Features" },
    // { href: "/#roadmap", name: "Roadmap" },
    { href: "/docs/data-rich", name: "About data-rich-documents" }
    // {
    //   href: "https://github.com/datopian/markdowndb/discussions",
    //   name: "Forum",
    // },
    // { href: "/_all", name: "All" },
  ],
  social: [
    { label: "github", href: "https://github.com/datopian/datahub" },
    { label: "discord", href: "https://discord.gg/EeyfGrGu4U" },
  ],
  nextSeo: {
    titleTemplate: "%s | DataRich",
    description: "Markdown on steroids for data-driven documents",
    canonical: "https://datarich.dev",
    openGraph: {
      title: "DataRich",
      images: [
        {
          url: "https://datarich.dev/og-image.png",
          alt: "DataRich",
          width: 1600,
          height: 900,
          type: "image/jpg",
        },
      ],
    },
    twitter: {
      handle: "@datopian",
      site: "https://datarich.dev",
      cardType: "summary_large_image",
    },
  },
};
