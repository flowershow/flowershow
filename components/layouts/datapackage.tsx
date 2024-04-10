import dynamic from "next/dynamic";
import { ErrorBoundary } from "react-error-boundary";
import { ArrowRightIcon } from "@heroicons/react/20/solid";
import { DocumentArrowDownIcon } from "@heroicons/react/24/outline";
import prettyBytes from "pretty-bytes";

import {
  type SimpleView,
  type Resource,
  type View,
  isResourceWithPath,
  isSimpleViewWithResourceName,
  isSimpleView,
} from "./datapackage-types";
import { FrictionlessView } from "@/components/frictionless-view";
import { ErrorMessage } from "@/components/error-message";
import { DatasetPageMetadata } from "@/server/api/types";

interface Props extends React.PropsWithChildren {
  metadata: DatasetPageMetadata;
}

const FlatUiTable = dynamic(() =>
  import("@portaljs/components").then((mod) => mod.FlatUiTable),
);

export const DataPackageLayout: React.FC<Props> = ({ children, metadata }) => {
  const {
    _rawUrlBase,
    title,
    description,
    resources,
    views,
    created,
    updated,
    licenses,
    sources,
  } = metadata;

  if (!resources) {
    return (
      <>
        <ErrorMessage
          title="Error in `datapackage` layout:"
          message="No resources found in the Data Package."
        />
      </>
    );
  }

  // exclude resources inline data
  const resourceFiles = resources.filter(isResourceWithPath);
  const resourceFilesCount = resourceFiles.length;
  const resouceFilesExtensions = Array.from(
    new Set(resourceFiles.map((r) => r.format)),
  ).join(", ");
  const resourceFilesSize = resourceFiles.reduce(
    (acc, r) => acc + (r.size ?? 0),
    0,
  );
  const resourceFilesSizeHumanReadable = resourceFilesSize
    ? prettyBytes(resourceFilesSize)
    : undefined;

  const View: React.FC<{ view: SimpleView | View }> = ({ view }) => {
    if (!isSimpleView(view)) {
      throw new Error(
        'Only views with `specType: "simple"` are supported at the moment.',
      );
    }
    let resource: Resource | undefined;
    if (isSimpleViewWithResourceName(view)) {
      resource = resources.find((r) => r.name === view.resourceName);
    } else {
      resource = resources.find((r) => r.name === view.resources[0]);
    }
    if (!resource) {
      throw new Error(`Resource not found for view ${view.name}`);
    }
    return (
      <FrictionlessView
        view={view}
        resource={resource}
        dataUrlBase={_rawUrlBase}
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
        <header>{title && <h1>{title}</h1>}</header>
        <section className="my-12">
          <table className="table-auto divide-y divide-gray-300">
            <thead>
              <tr>
                <th>Files</th>
                <th>Size</th>
                <th>Format</th>
                <th>Created</th>
                <th>Updated</th>
                <th>License</th>
                <th>Source</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{resourceFilesCount}</td>
                <td>{resourceFilesSizeHumanReadable}</td>
                <td>{resouceFilesExtensions}</td>
                <td>{created}</td>
                <td>{updated}</td>
                <td>
                  <a
                    target="_blank"
                    href={licenses ? licenses[0]?.path : "#"}
                    className="mb-2 block hover:text-[#6366F1]"
                  >
                    {licenses ? licenses[0]?.title : ""}
                  </a>
                </td>
                <td>
                  <a
                    target="_blank"
                    href={sources ? sources[0]?.path : "#"}
                    className="mb-2 block hover:text-[#6366F1]"
                  >
                    {sources ? sources[0]?.title : ""}
                  </a>
                </td>
              </tr>
            </tbody>
          </table>
        </section>
        <section className="my-12">
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
        </section>
        <section className="my-12">
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
        </section>
        <section className="my-12">
          <h2>Data files</h2>
          <table className="table-auto divide-y divide-gray-300">
            <thead>
              <tr>
                <th>File</th>
                <th>Description</th>
                <th>Size</th>
                <th>Last modified</th>
                <th>Download</th>
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
                      <a href={`#${r.name}`} className="hover:text-[#6366F1]">
                        <div className="flex items-center space-x-1 ">
                          <span>{r.name}</span>
                        </div>
                      </a>
                    </td>
                    <td>{r.description || ""}</td>
                    <td>{r.size ? prettyBytes(r.size) : ""}</td>
                    <td>{r.lastModified || ""}</td>
                    <td>
                      <a
                        target="_blank"
                        href={`${_rawUrlBase}/${r.path}`}
                        className="hover:text-[#6366F1]"
                      >
                        <div className="flex items-center space-x-1 ">
                          <span>{r.path}</span>
                          <DocumentArrowDownIcon className="inline h-4 w-4" />
                        </div>
                      </a>
                    </td>
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
                  <h3 id={r.name}>{r.title || r.name || r.path}</h3>

                  <ErrorBoundary
                    FallbackComponent={FallbackComponentFactory({
                      title: `Error in resource preview \`${r.name}\`:`,
                    })}
                  >
                    {/* @ts-expect-error */}
                    <FlatUiTable url={`${_rawUrlBase}/${r.path}`} />
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
