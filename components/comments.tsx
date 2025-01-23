"use client";

import Giscus from "@giscus/react";

interface CommentsProps {
  repo: string;
  enabled: boolean;
  repoId: string | null;
  categoryId: string | null;
}

export default function Comments({
  repo,
  enabled,
  repoId,
  categoryId,
}: CommentsProps) {
  if (!enabled || !repoId || !categoryId) return null;

  // Validate repo format (owner/repo)
  const [owner, repoName] = repo.split("/");
  if (!owner || !repoName) return null;

  const validRepo = `${owner}/${repoName}` as const;

  console.log(repoId, categoryId);

  return (
    <div className="mt-10 w-full border-t pt-10">
      <Giscus
        repo={validRepo}
        repoId={repoId}
        categoryId={categoryId}
        mapping="pathname"
        reactionsEnabled="1"
        emitMetadata="0"
        inputPosition="top"
        theme="light"
        lang="en"
        loading="lazy"
      />
    </div>
  );
}
