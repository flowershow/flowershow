import config from "@/config.json";

export const resolveSiteAlias = (
  s: string,
  direction: "from" | "to" = "to",
) => {
  // NOTE: this is needed for E2E tests so that links don't get resolved to /core/datahub-cloud-test-repo/...
  if (s.startsWith("/@olayway/datahub-cloud-test-repo")) {
    return s;
  }

  const aliases = config.siteAliases || [];

  for (let i = 0; i < aliases.length; i++) {
    const { origin, alias } = aliases[i]!;

    const match = direction === "from" ? alias : origin;
    const replacement = direction === "from" ? origin : alias;

    if (s.startsWith(match)) {
      return replacement + s.slice(match.length);
    }
  }

  return s;
};
