const config = {
  author: {
    name: "Datopian",
    url: "https://www.datopian.com/",
    logo: "/datopian-logo-black.png",
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
  // navLinks: [
  //     { name: "Data-rich documents", href: "https://dev.datahub.io/data-rich" },
  //     { name: "Cloud", href: "https://cloud.datahub.io/" },
  //     { name: "ABOUT", href: "/docs/about" },
  //     { name: "BLOG", href: "/blog" },
  //     { name: "FIND DATA", href: "/search" },
  //     { name: "COLLECTIONS", href: "/collections" },
  //     { name: "DOCS", href: "/docs" },
  //     { name: "TOOLS", href: "/download" },
  //     { name: "TOOLKIT", href: "/toolkit" },
  //     { name: "CHAT", href: "https://discord.com/invite/KrRzMKU" },
  // ],
  social: [{ label: "discord", href: "https://discord.gg/cPxejPzpwt" }],
} as any;

export default config;
