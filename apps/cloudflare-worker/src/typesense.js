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

export async function ensureTypesenseCollection(typesense, siteId) {
  if (!typesense) return;
  try {
    const exists = await typesense.collections(siteId).exists();
    if (!exists) {
      await typesense.collections().create({
        name: siteId,
        fields: [
          { name: 'title', type: 'string', facet: false },
          { name: 'content', type: 'string', facet: false },
          { name: 'path', type: 'string', facet: false },
          { name: 'description', type: 'string', facet: false, optional: true },
          { name: 'authors', type: 'string[]', facet: false, optional: true },
          { name: 'date', type: 'int64', facet: false, optional: true },
        ],
      });
    }
  } catch (error) {
    if (error?.httpStatus !== 409) throw error;
  }
}
