export const PlainLayout: React.FC<React.PropsWithChildren> = ({
  children,
}) => {
  return (
    <article>
      <section className="prose prose-lg mt-12 max-w-none dark:prose-invert lg:prose-xl prose-headings:font-bold prose-headings:tracking-tight prose-a:break-words">
        {children}
      </section>
    </article>
  );
};
