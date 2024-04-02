const config = {
  author: {
    name: "DataHub",
    url: "https://datahub.io/",
    logo: "/datahub-cube.svg",
  },
  navbarTitle: {
    logo: "/datahub-cube.svg",
    text: "",
  },
  title: "DataHub",
  github: "datopian/datahub",
  description:
    "Turn your markdown into a website in a couple of clicks. Avoid the hassle and complexity of deploying yourself.",
  logo: "/datahub-cube.svg",
  analytics: "G-R6X92HM43Q",
  footerLinks: [
    {
      name: "Links",
      subItems: [
        { href: "/", name: "Home" },
        { href: "/docs/terms-of-service", name: "Terms of Service" },
        // { href: "/docs/privacy", name: "Privacy Policy" },
        { href: "/blog", name: "Blog" },
        { href: "/docs", name: "Docs" },
        { href: "/collections", name: "Collections" },
        // { href: "https://old.datahub.io/", name: "Old DataHub" },
      ],
    },
    {
      name: "Support",
      subItems: [
        { href: "https://discord.com/invite/KrRzMKU", name: "Chat" },
        {
          name: "Discussions",
          href: "https://github.com/datahubio/datahub/discussions",
        },
        // { href: "/docs/faq", name: "FAQ" },
      ],
    },
    {
      name: "Contact",
      subItems: [
        { href: "mailto:support@datahub.io", name: "support@datahub.io" },
      ],
    },
  ],
  navLinks: [
    { name: "BLOG", href: "/blog" },
    { name: "DOCS", href: "/docs" },
    { name: "COLLECTIONS", href: "/collections" },
    { name: "FORUM", href: "https://github.com/datahubio/datahub/discussions" },
    { name: "CHAT", href: "https://discord.com/invite/KrRzMKU" },
    // { name: "FIND DATA", href: "/search" },
    // { name: "TOOLS", href: "/download" },
    // { name: "TOOLKIT", href: "/toolkit" },
  ],
  social: [
    { label: "discord", href: "https://discord.com/invite/KrRzMKU" },
    { label: "linkedin", href: "https://www.linkedin.com/company/10340373" },
    { label: "twitter", href: "https://twitter.com/datopian" },
    { label: "github", href: "https://github.com/datopian" },
  ],
} as any;

export default config;
