import { notFound } from 'next/navigation';

// TODO This is a workaround
// Don't call notFound() here, return minimal layout and allow the NOT_FOUND error to be thrown from within [...slug] page
// so that not-found.tsx in this segment can be triggered. Otherwise Next.js will look in the parent segment, and won't find it there, showing a blank page.
// Why we can't have not-found.js in the parent folder:
// Because we have 2 separate route groups with 2 separate ROOT layouts, and root layout for user sites needs to be
// nested under /[user]/[project] as it's dynamic. This means we can't have any layout in any parent directory - and it is needed for a not-found page
// Note: in Next 15 there is a global-not-found that can be used in /app without a layout, so we should upgrade
// https://github.com/vercel/next.js/discussions/50034
export default function NotFoundDummy() {
  notFound();
}
