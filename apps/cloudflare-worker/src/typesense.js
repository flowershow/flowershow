export async function indexInTypesense({ typesense, siteId, blobId, path, body, metadata }) {
  if (!typesense) return;
  try {
    const document = {
      title: metadata.title,
      content: body,
      path,
      description: metadata.description,
      authors: metadata.authors,
      date: metadata.date ? new Date(metadata.date).getTime() / 1000 : null,
      id: `${blobId}`,
    };
    await typesense.collections(siteId).documents().upsert(document);
  } catch {
    console.error(`Failed indexing document: ${`${siteId} - ${path}`}`);
  }
}
