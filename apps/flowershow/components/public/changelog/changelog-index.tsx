interface Props extends React.PropsWithChildren {
  title: string;
  intro?: React.ReactNode;
  pagination: React.ReactNode;
}

export function ChangelogIndex({ title, intro, pagination, children }: Props) {
  return (
    <div className="changelog">
      <header className="changelog-header">
        <div>
          <h1 className="changelog-title">{title}</h1>
          {intro && <div className="changelog-intro rendered-mdx">{intro}</div>}
        </div>
      </header>
      <ol className="changelog-entries">{children}</ol>
      {pagination}
    </div>
  );
}
