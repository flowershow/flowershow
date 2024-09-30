import { ExtendedSiteConfig } from "@/components/types";

const config: ExtendedSiteConfig = {
  title: "DataHub",
  description:
    "At Datahub, we provide various solutions to Publish and Deploy your Data with power and simplicity. Datahub is the fastest way for individuals, teams and organizations to publish, deploy and share their data.",
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
        { href: "/blog", name: "Blog" },
        { href: "/docs", name: "Docs" },
        { href: "/collections", name: "Collections" },
        { href: "/publish", name: "Publish" },
        { href: "/showcase", name: "Showcase" },
        { href: "/opensource", name: "Open Source" },
        { href: "/pricing", name: "Pricing" },
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
        { href: "/docs/terms-of-service", name: "Terms of Service" },
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
    { name: "Blog", href: "/blog" },
    { name: "Docs", href: "/docs" },
    { name: "Collections", href: "/collections" },
    { name: "Publish", href: "/publish" },
    { name: "Showcase", href: "/showcase" },
    { name: "Opensource", href: "/opensource" },
    { name: "Pricing", href: "/pricing" },
    { name: "Forum", href: "https://github.com/datahubio/datahub/discussions" },
    { name: "Chat", href: "https://discord.com/invite/KrRzMKU" },
  ],
  social: [
    { label: "discord", href: "https://discord.com/invite/KrRzMKU" },
    { label: "linkedin", href: "https://www.linkedin.com/company/10340373" },
    { label: "twitter", href: "https://twitter.com/datopian" },
    { label: "facebook", href: "https://www.facebook.com/datopianltd/" },
    { label: "github", href: "https://github.com/datopian" },
  ],
};

export default config;
