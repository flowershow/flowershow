import { ErrorBoundary } from "react-error-boundary";
import { ArrowRightIcon } from "@heroicons/react/20/solid";
import { DocumentArrowDownIcon } from "@heroicons/react/24/outline";
import { FlatUiTable } from "@portaljs/components";
import prettyBytes from "pretty-bytes";

import {
  isResourceWithPath,
  type DataPackage,
  SimpleView,
} from "./datapackage-types";
import { FrictionlessView } from "@/components/frictionless-view";
import { ErrorMessage } from "@/components/error-message";

interface Props extends React.PropsWithChildren<{}> {
  datapackage: DataPackage;
  dataUrlBase: string;
}

export const DataPackageLayout: React.FC<Props> = ({
  children,
  datapackage,
  dataUrlBase,
}) => {
  const {
    title,
    description,
    resources,
    views,
    created,
    updated,
    licenses,
    sources,
  } = datapackage;

  // exclude resources inline data
  const resourceFiles = resources.filter(isResourceWithPath);
  const resourceFilesCount = resourceFiles.length;
  const resouceFilesExtensions = Array.from(
    new Set(resourceFiles.map((r) => r.format)),
  ).join(", ");
  const resourceFilesSize = resourceFiles.reduce(
    (acc, r) => acc + (r.bytes ?? 0),
    0,
  );
  const resourceFilesSizeHumanReadable = resourceFilesSize
    ? prettyBytes(resourceFilesSize)
    : undefined;

  const View: React.FC<{ view: SimpleView }> = ({ view }) => {
    const resource = resources.find((r) => r.name === view.resourceName);
    if (!resource) {
      throw new Error(`Resource not found for view ${view.name}`);
    }
    return (
      <FrictionlessView
        view={view}
        resource={resource}
        dataUrlBase={dataUrlBase}
      />
    );
  };
  View.displayName = "View";

  return (
    <ErrorBoundary
      FallbackComponent={FallbackComponentFactory({
        title: `Error in \`datapackage\` layout:`,
      })}
    >
      <article className="prose mx-auto mt-20 max-w-6xl px-12 pb-20 text-primary prose-headings:font-medium">
        <header>
          {title && <h1>{title}</h1>}
          {description && (
            <>
              <p className="text-md">{description}</p>
              {/* Read more link */}
              <a
                className="inline-block text-sm text-[#6366F1] no-underline hover:underline"
                href="#readme"
              >
                <div className="flex items-center space-x-1">
                  <span>Read more</span>
                  <ArrowRightIcon className="inline h-4 w-4" />
                </div>
              </a>
            </>
          )}
        </header>
        <section className="my-12">
          <table className="table-auto divide-y divide-gray-300">
            <thead>
              <tr>
                <th>Files</th>
                {resourceFilesSize > 0 ? <th>Size</th> : null}
                <th>Format</th>
                {created && <th>Created</th>}
                {updated && <th>Updated</th>}
                {licenses && <th>Licenses</th>}
                {sources && <th>Sources</th>}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{resourceFilesCount}</td>
                {resourceFilesSize > 0 ? (
                  <td>{resourceFilesSizeHumanReadable}</td>
                ) : null}
                <td>{resouceFilesExtensions}</td>
                {created && <td>{created}</td>}
                {updated && <td>{updated}</td>}
                {licenses && (
                  <td>
                    {licenses.map((l) => {
                      return (
                        <a
                          key={`license-${l.name}`}
                          target="_blank"
                          href={l.path}
                          className="mb-2 block hover:text-[#6366F1]"
                        >
                          {l.title}
                        </a>
                      );
                    })}
                  </td>
                )}
                {sources && (
                  <td>
                    {sources.map((s) => {
                      return (
                        <a
                          key={`source-${s.path}`}
                          target="_blank"
                          href={s.path}
                          className="mb-2 block hover:text-[#6366F1]"
                        >
                          {s.title}
                        </a>
                      );
                    })}
                  </td>
                )}
              </tr>
            </tbody>
          </table>
        </section>
        {/* <section className="my-12">
          {views && <h2>Data Views</h2>}
          {views &&
            views.map((view, id) => (
              <ErrorBoundary
                key={`view-${view.name}`}
                FallbackComponent={FallbackComponentFactory({
                  title: `Error in data view \`${view.name}\`:`,
                })}
              >
                <View view={view} />
              </ErrorBoundary>
            ))}
        </section> */}
        <section className="my-12">
          <h2>Data files</h2>
          <table className="table-auto divide-y divide-gray-300">
            <thead>
              <tr>
                <th>File</th>
                <th>Title</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              {resources.map((r) => {
                return (
                  <tr
                    key={`resources-list-${r.name}`}
                    className="even:bg-gray-50"
                  >
                    <td>
                      <a
                        target="_blank"
                        href={`${dataUrlBase}/${r.path}`}
                        className="hover:text-[#6366F1]"
                      >
                        <div className="flex items-center space-x-1 ">
                          <span>{r.path}</span>
                          <DocumentArrowDownIcon className="inline h-4 w-4" />
                        </div>
                      </a>
                    </td>
                    <td>{r.title || r.name}</td>
                    <td>{r.description || ""}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
        <section className="my-12">
          <h2>Data Previews</h2>
          <div>
            {resources.slice(0, 5).map((r) => {
              return (
                <div key={`resource-preview-${r.name}`} className="mt-10">
                  <h3>{r.title || r.name || r.path}</h3>

                  <ErrorBoundary
                    FallbackComponent={FallbackComponentFactory({
                      title: `Error in resource preview \`${r.name}\`:`,
                    })}
                  >
                    {/* @ts-expect-error */}
                    <FlatUiTable url={`${dataUrlBase}/${r.path}`} />
                  </ErrorBoundary>
                </div>
              );
            })}
          </div>
        </section>
        <hr />
        <section id="readme" className="mx-auto max-w-3xl">
          {children}
        </section>
      </article>
    </ErrorBoundary>
  );
};

const FallbackComponentFactory = ({ title }: { title: string }) => {
  const FallbackComponent = ({ error }: { error: Error }) => {
    return <ErrorMessage title={title} message={error.message} />;
  };
  FallbackComponent.displayName = "FallbackComponent";
  return FallbackComponent;
};
FallbackComponentFactory.displayName = "FallbackComponentFactory";
