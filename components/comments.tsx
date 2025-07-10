"use client";

import Giscus, { GiscusProps } from "@giscus/react";

type CommentsProps = Partial<Omit<GiscusProps, "loading">>;

export default function Comments({
  repo,
  repoId,
  host,
  category = "Announcements",
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
  if (!repo || !repoId) {
    return null;
  }

  return (
    <div className="mt-10 w-full border-t pt-10">
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
    </div>
  );
}
