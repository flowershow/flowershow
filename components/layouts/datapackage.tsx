import FrictionlessViewFactory from "@/components/frictionless";
import { Table } from "@portaljs/components";

/* eslint import/no-default-export: off */
export function DataPackageLayout({ children, frictionless, gh_repository, gh_branch }) {
    const title = frictionless.title;
    const description = frictionless.description;
    const resources = frictionless.resources;
    const views = frictionless.views;

    const FrictionlessView = FrictionlessViewFactory({
        views,
        resources,
        // TODO temporary solution
        dataUrlBase: `https://raw.githubusercontent.com/${gh_repository}/${gh_branch}/`,
    });

    return (
        <article className="docs prose text-primary dark:text-primary-dark dark:prose-invert prose-headings:font-headings prose-a:break-words mx-auto p-6">
            <header>
                {title && <h1 className="mb-4">{title}</h1>}
                <a
                    className="font-semibold mb-4"
                    target="_blank"
                    href={`https://github.com/${gh_repository}/tree/${gh_branch}`}
                >
                    @{gh_repository}
                </a>
                {description && <p className="text-md">{description}</p>}
            </header>
            <section className="mt-10">
                {views.map((view, i) => {
                    return (
                        <div key={`visualization-${i}`}>
                            <FrictionlessView viewId={i} />
                        </div>
                    );
                })}
            </section>
            <section className="mt-10">
                <h2>Data files</h2>
                <table className="table-auto">
                    <thead>
                        <tr>
                            <th>File</th>
                            <th>Title</th>
                            <th>Format</th>
                        </tr>
                    </thead>
                    <tbody>
                        {resources.map((r) => {
                            return (
                                <tr key={`resources-list-${r.name}`}>
                                    <td>
                                        <a
                                            target="_blank"
                                            href={`https://github.com/${gh_repository}/blob/${gh_branch}/${r.path}`}
                                        >
                                            {r.path}
                                        </a>
                                    </td>
                                    <td>{r.title}</td>
                                    <td>{r.format.toUpperCase()}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                {resources.slice(0, 5).map((r) => {
                    return (
                        <div key={`resource-preview-${r.name}`} className="mt-10">
                            <h3>{r.title || r.name || r.path}</h3>
                            <Table url={`https://raw.githubusercontent.com/${gh_repository}/${gh_branch}/${r.path}`} />
                        </div>
                    );
                })}
            </section>
            <hr />
            <section>
                {children}
            </section>
        </article>
    );
}
