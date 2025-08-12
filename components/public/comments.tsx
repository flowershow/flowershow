"use client";

import Giscus, { GiscusProps } from "@giscus/react";

type CommentsProps = Partial<Omit<GiscusProps, "loading">>;

export default function Comments({
  repo,
  repoId,
  host,
  category,
  categoryId,
  mapping = "pathname",
  term,
  theme = "light",
  strict = "1",
  reactionsEnabled = "1",
  emitMetadata = "0",
  inputPosition = "top",
  lang = "en",
}: CommentsProps) {
  if (!repo || !repoId || !categoryId) {
    return null;
  }

  return (
    <Giscus
      id="comments"
      repo={repo}
      repoId={repoId}
      host={host}
      category={category}
      categoryId={categoryId}
      mapping={mapping}
      term={term}
      strict={strict}
      reactionsEnabled={reactionsEnabled}
      emitMetadata={emitMetadata}
      inputPosition={inputPosition}
      theme={theme}
      lang={lang}
      loading="lazy"
    />
  );
}
