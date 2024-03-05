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
  logo: "/datahub-cube.svg",
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
  social: [{ label: "discord", href: "https://discord.com/invite/KrRzMKU" }],
} as any;

export default config;
