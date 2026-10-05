import AnnotationsList from '@/components/dashboard/annotations-list';
import { api } from '@/trpc/server';

export default async function SiteAnnotationsPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const siteId = decodeURIComponent(id);
  const annotations = await api.annotation.listForSite.query({ siteId });

  const setStatus = async (
    annotationId: string,
    status: 'open' | 'resolved',
  ) => {
    'use server';
    await api.annotation.setStatus.mutate({ id: annotationId, status });
  };
  const deleteAnnotation = async (annotationId: string) => {
    'use server';
    await api.annotation.delete.mutate({ id: annotationId });
  };
  const deleteAll = async () => {
    'use server';
    await api.annotation.deleteAll.mutate({ siteId });
  };

  return (
    <div className="mt-6 flex flex-col space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-stone-800 dark:text-zinc-100">
          Annotations
        </h2>
        <p className="mt-1 text-sm text-stone-500 dark:text-zinc-400">
          Notes visitors left on your pages. Turn annotations on in Settings →
          Features or with <code>fl publish --annotations</code>; a page can opt
          out with <code>annotations: false</code> in frontmatter. Your AI agent
          can read and resolve them with <code>fl annotations pull</code> and{' '}
          <code>fl annotations resolve</code>.
        </p>
      </div>
      <AnnotationsList
        annotations={annotations}
        setStatus={setStatus}
        deleteAnnotation={deleteAnnotation}
        deleteAll={deleteAll}
      />
    </div>
  );
}
