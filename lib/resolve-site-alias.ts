export const resolveSiteAlias = (
  s: string,
  direction: "from" | "to" = "to",
) => {
  const aliases = [
    { origin: "/@olayway/blog", alias: "/blog" },
    { origin: "/@olayway/docs", alias: "/docs" },
    { origin: "/@olayway/collections", alias: "/collections" },
    { origin: "/@olayway", alias: "/core" },
    { origin: "/@rufuspollock/data-notes", alias: "/notes" },
  ];

  for (let i = 0; i < aliases.length; i++) {
    const { origin, alias } = aliases[i]!;

    const match = direction === "from" ? alias : origin;
    const replacement = direction === "from" ? origin : alias;

    if (s.includes(match)) {
      return s.replace(match, replacement);
    }
  }

  return s;
};
