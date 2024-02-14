const config = {
  title:
    "DataHub - a complete solution for Open Data Platforms, Data Catalogs, Data Lakes and Data Management.",
  description:
    "DataHub is an open source, mature, fully-featured and production ready. Trusted by governments, startups, nonprofits and the Fortune 500.",
  navbarTitle: {
    logo: "/datahub-cube-edited.svg",
    text: "",
  },
  theme: {
    default: "",
  },
  tableOfContents: true,
  analytics: "G-R6X92HM43Q",
  editLinkShow: true,
  contentExclude: ["data-literate-demo.md", "./drd/*", "./Excalidraw/*"],
  author: "Datopian",
  logo: "/datopian-logo.png",
  domain: "https://datopian.com/",
  navLinks: [
    { name: "ABOUT", href: "/docs/about" },
    { name: "BLOG", href: "/blog" },
    { name: "FIND DATA", href: "/search" },
    { name: "COLLECTIONS", href: "/collections" },
    { name: "DOCS", href: "/docs" },
    { name: "TOOLS", href: "/download" },
    { name: "TOOLKIT", href: "/toolkit" },
    { name: "CHAT", href: "https://discord.com/invite/KrRzMKU" },
  ],
  footerLinks: [
    {
      name: "LINKS",
      subItems: [
        { href: "/", name: "Home" },
        { href: "/docs/terms-of-service", name: "Terms of Service" },
        { href: "/docs/privacy", name: "Privacy Policy" },
        { href: "/blog", name: "Blog" },
        { href: "https://old.datahub.io/", name: "Old DataHub" },
      ],
    },
    {
      name: "Support",
      subItems: [
        { href: "https://discord.com/invite/KrRzMKU", name: "Chat" },
        { href: "/docs/faq", name: "FAQ" },
      ],
    },
    {
      name: "Contact",
      subItems: [
        { href: "mailto:support@datahub.io", name: "support@datahub.io" },
      ],
    },
  ],
  nextSeo: {
    openGraph: {
      type: "website",
      title:
        "DataHub - a complete solution for Open Data Platforms, Data Catalogs, Data Lakes and Data Management.",
      description:
        "DataHub is an open source, mature, fully-featured and production ready. Trusted by governments, startups, nonprofits and the Fortune 500.",
      locale: "en_US",
      images: [
        {
          url: "https://datahub.io/static/img/opendata/product.png",
          alt: "DataHub - a complete solution for Open Data Platforms, Data Catalogs, Data Lakes and Data Management.",
          width: 1200,
          height: 627,
          type: "image/jpg",
        },
      ],
    },
    twitter: {
      handle: "@datopian",
      site: "https://datopian.com/",
      cardType: "summary_large_image",
    },
  },
};
export default config;
