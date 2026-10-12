import { loadPostFooter } from '@/lib/post/footer';
import { renderReadMoreCards } from '@/lib/post/render';
import { PostNav, PostReadMore } from './post';

/**
 * Previous/next and read-more for a post. An async server component, so the
 * route streams the post body first (wrap it in <Suspense>); any failure
 * drops the footer, never the post.
 */
export async function PostFooterSection(
  props: Parameters<typeof loadPostFooter>[0],
) {
  const data = await loadPostFooter(props).catch((error) => {
    console.error('Error loading post footer:', error);
    return null;
  });
  if (!data) return null;
  const cards = await renderReadMoreCards({
    items: data.readMore,
    spec: data.spec,
    authors: data.authors,
    locale: props.locale,
  }).catch((error) => {
    console.error('Error rendering read-more cards:', error);
    return null;
  });
  return (
    <>
      <PostNav previous={data.previous} next={data.next} />
      <PostReadMore cards={cards} />
    </>
  );
}
