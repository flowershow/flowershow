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
import { ResourcePreview } from "./resource-preview";
import { FallbackComponentFactory } from "./fallback-component-factory";
import { Site } from "@prisma/client";
import { env } from "@/env.mjs";
import { resolveLink } from "@/lib/resolve-link";

type SiteWithUser = Site & {
  user: {
    gh_username: string | null;
  } | null;
};

interface Props extends React.PropsWithChildren {
  metadata: DatasetPageMetadata;
  siteMetadata: SiteWithUser;
}

class ResourceNotFoundError extends Error {
  constructor(viewName) {
    super(`Resource not found for view ${viewName}`);
    this.name = this.constructor.name;
  }
}

export const DataPackageLayout: React.FC<Props> = ({
  children,
  metadata,
  siteMetadata,
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

  // TODO this is only needed for old sites
  // new sites have links in datapackage resolved in computed-fields lib
  // this should be removed when all sites are migrated or we have a better solution
  // not worth the effort to sync all the sites until we have a clear plan
  // (e.g. probably we'll be implementing an index of all files which can change the way we resolve links)
  const pathToR2SiteFolder = `https://${env.NEXT_PUBLIC_R2_BUCKET_DOMAIN}/${siteMetadata.id}/${siteMetadata.gh_branch}/raw`;

  const _resources = resources
    .filter(
      (resource) => resource.format === "csv" || resource.format === "geojson",
    )
    // TODO this is temporary, related to comment above over pathToR2SiteFolder
    .map((resource) => {
      return {
        ...resource,
        path: resolveLink({
          link: resource.path,
          filePath: metadata._path,
          prefixPath: pathToR2SiteFolder,
        }),
      };
    });

  const View: React.FC<{ view: SimpleView | View }> = ({ view }) => {
    if (!isSimpleView(view)) {
      throw new Error(
        'Only views with `specType: "simple"` are supported at the moment.',
      );
    }
    let resource: Resource | undefined;
    if (isSimpleViewWithResourceName(view)) {
      resource = _resources.find((r) => r.name === view.resourceName);
    } else {
      if (!view.resources || view.resources.length === 0) {
        throw new ResourceNotFoundError(view.name);
      }
      resource = _resources.find((r) => r.name === view.resources[0]);
    }

    if (!resource) {
      throw new ResourceNotFoundError(view.name);
    }
    return (
      <div className="not-prose md:text-base">
        <FrictionlessView view={view} resource={resource} />
      </div>
    );
  };
  View.displayName = "View";

  return (
    <ErrorBoundary
      FallbackComponent={FallbackComponentFactory({
        title: `Error in \`datapackage\` layout:`,
      })}
    >
      <article className="prose-headings:font-headings prose mx-auto max-w-6xl px-6 pt-12 dark:prose-invert lg:prose-lg prose-headings:font-medium prose-a:break-words ">
        <header className="mb-8 flex flex-col gap-y-5">
          <h1 className="!mb-2">{title}</h1>
          <table
            data-testId="dp-metadata-table"
            className="table-auto divide-y divide-gray-300"
          >
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
          <div data-testId="dp-description">
            <p className="text-md">{description}</p>
            {/* Read more link */}
            <a
              className="inline-block text-[#6366F1] no-underline hover:underline"
              href="#readme"
            >
              <div className="flex items-center space-x-1">
                <span>Read more</span>
                <ArrowRightIcon className="inline h-4 w-4" />
              </div>
            </a>
          </div>
        </header>
        {views && (
          <section data-testId="dp-views" className="my-12">
            <h2>Data Views</h2>
            {views.map((view, id) => (
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
        )}
        <section data-testId="dp-files" className="my-12">
          <h2>Data Files</h2>
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
                        href={r.path}
                        className="hover:text-[#6366F1]"
                      >
                        <div className="flex items-center space-x-1 ">
                          <span>{r.name}</span>
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
        {_resources.length > 0 && (
          <section data-testId="dp-previews" className="my-12">
            <h2>Data Previews</h2>
            <div>
              {_resources.slice(0, 5).map((resource) => (
                <ResourcePreview resource={resource} key={resource.name} />
              ))}
            </div>
          </section>
        )}
        <hr />
        <section
          data-testId="dp-readme"
          id="readme"
          className="mx-auto max-w-4xl"
        >
          {children}
        </section>
      </article>
    </ErrorBoundary>
  );
};
