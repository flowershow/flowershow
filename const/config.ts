import { ExtendedSiteConfig } from "@/components/types";

const config: ExtendedSiteConfig = {
  title: "DataHub",
  description:
    "Turn your markdown into a website in a couple of clicks. Avoid the hassle and complexity of deploying yourself.",
  logo: "/datahub-cube.svg",
  navbarTitle: {
    logo: "/datahub-cube.svg",
    text: "",
  },
  author: {
    name: "",
    url: "https://datahub.io/",
    logo: "/datahub-cube.svg",
  },
  github: "https://github.com/datopian/datahub",
  discord: "https://discord.com/invite/KrRzMKU",
  footerLinks: [
    {
      name: "Links",
      subItems: [
        { href: "/", name: "Home" },
        { href: "/docs/terms-of-service", name: "Terms of Service" },
        { href: "/blog", name: "Blog" },
        { href: "/docs", name: "Docs" },
        { href: "/collections", name: "Collections" },
        { href: "/opensource", name: "Open Source" },
        { href: "/enterprise", name: "Enterprise" },
      ],
    },
    {
      name: "Support",
      subItems: [
        { href: "https://discord.com/invite/KrRzMKU", name: "Chat" },
        {
          name: "Discussions",
          href: "https://github.com/datopian/datahub/discussions",
        },
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
    { name: "OPENSOURCE", href: "/opensource" },
    { name: "ENTERPRISE", href: "/enterprise" },
    { name: "PRICING", href: "/pricing" },
    { name: "FORUM", href: "https://github.com/datahubio/datahub/discussions" },
    { name: "CHAT", href: "https://discord.com/invite/KrRzMKU" },
  ],
  social: [
    { label: "discord", href: "https://discord.com/invite/KrRzMKU" },
    { label: "linkedin", href: "https://www.linkedin.com/company/10340373" },
    { label: "twitter", href: "https://twitter.com/datopian" },
    { label: "github", href: "https://github.com/datopian" },
  ],
};

export default config;
