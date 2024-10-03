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
import { ResourcePreview } from "@/components/resource-preview";
import { Site } from "@prisma/client";
import { resolveLink } from "@/lib/resolve-link";
import Script from "next/script";
import Link from "next/link";
import { Github } from "lucide-react";
import getJsonLd from "./getJsonLd";
import dynamic from "next/dynamic";
import { ResourceSchema } from "../resource-schema";

type SiteWithUser = Site & {
  user: {
    gh_username: string | null;
  } | null;
};

interface Props extends React.PropsWithChildren {
  metadata: DatasetPageMetadata;
  siteMetadata: SiteWithUser;
}

const SocialShareMenu = dynamic(
  () => import("@/components/social-share-menu"),
  { ssr: false },
);

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
      <ErrorMessage
        title="Error in `datapackage` layout:"
        message="No resources found in the Data Package."
      />
    );
  }

  // exclude resources inline data
  const resourceFiles = metadata.resources.filter(isResourceWithPath);
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

  let rawFilePermalinkBase: string;

  // TODO there should be a better way to handle this
  if (siteMetadata.customDomain) {
    rawFilePermalinkBase = `/_r/-`;
    // NOTE: aliases
    // temporary solution for our aliased sites
  } else if (siteMetadata.user?.gh_username === "olayway") {
    if (siteMetadata.gh_repository.startsWith("datasets/")) {
      rawFilePermalinkBase = `/core/${siteMetadata.projectName}/_r/-`;
    } else if (siteMetadata.projectName === "blog") {
      rawFilePermalinkBase = `/blog/_r/-`;
    } else if (siteMetadata.projectName === "docs") {
      rawFilePermalinkBase = `/docs/_r/-`;
    } else if (siteMetadata.projectName === "collections") {
      rawFilePermalinkBase = `/collections/_r/-`;
    } else {
      rawFilePermalinkBase = `/@${siteMetadata.user.gh_username}/${siteMetadata.projectName}/_r/-`;
    }
  } else if (
    siteMetadata.user?.gh_username === "rufuspollock" &&
    siteMetadata.projectName === "notes"
  ) {
    rawFilePermalinkBase = `/notes/_r/-`;
  } else {
    rawFilePermalinkBase = `/@${siteMetadata.user!.gh_username}/${
      siteMetadata.projectName
    }/_r/-`;
  }

  const _resources = resources.map((resource) => {
    return {
      ...resource,
      path: resolveLink({
        link: resource.path,
        filePath: metadata._path,
        prefixPath: rawFilePermalinkBase,
      }),
    };
  });

  const View: React.FC<{ view: SimpleView | View }> = ({ view }) => {
    if (!isSimpleView(view)) {
      return (
        <ErrorMessage
          title="Error in datapackage:"
          message='Only views with `specType: "simple"` are supported at the moment.'
        />
      );
    }

    let resource: Resource | undefined;

    if (isSimpleViewWithResourceName(view)) {
      resource = _resources.find((r) => r.name === view.resourceName);
      // if resource is not csv or geojson skip
      if (
        resource &&
        !["csv", "geojson"].includes(
          resource.format || resource.path.split(".").pop(),
        )
      ) {
        return (
          <ErrorMessage
            title="Error in datapackage:"
            message={`Resource format not supported for view: ${view.name}`}
          />
        );
      }
    } else {
      if (!view.resources || view.resources.length === 0) {
        return (
          <ErrorMessage
            title="Error in datapackage:"
            message={`Resource not found for view: ${view.name}`}
          />
        );
      }
      resource = _resources.find((r) => r.name === view.resources[0]);
    }

    if (!resource) {
      return (
        <ErrorMessage
          title="Error in datapackage:"
          message={`Resource not found for view: ${view.name}`}
        />
      );
    }
    return (
      <div className="not-prose md:text-base">
        <FrictionlessView view={view} resource={resource} />
      </div>
    );
  };
  View.displayName = "View";

  const jsonLd = getJsonLd({ metadata, siteMetadata });

  return (
    <>
      <Script
        id="json-ld-datapackage"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <article className="prose-headings:font-headings lg:prose-md prose mx-auto max-w-full px-6 pt-12 dark:prose-invert prose-headings:font-medium prose-a:break-words ">
        <header className="mb-8 flex flex-col gap-y-5">
          <h1 className="!mb-2">{title}</h1>
          <div className="flex items-center justify-between">
            <div
              className="flex items-center gap-1 "
              data-testid="goto-repository"
            >
              <Github width={18} />
              <Link
                className="flex items-center gap-1 font-normal text-slate-600 no-underline hover:underline"
                href={`https://github.com/${siteMetadata?.gh_repository}`}
                target="_blank"
                rel="noreferrer"
              >
                {siteMetadata.gh_repository}
              </Link>
            </div>
            <div className="flex shrink-0 grow items-center justify-end">
              <SocialShareMenu shareTitle={title} />
            </div>
          </div>
          <table
            data-testid="dp-metadata-table"
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
                <td>{created && created.substring(0, 10)}</td>
                <td>{updated && updated.substring(0, 10)}</td>
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
          <div data-testid="dp-description">
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
          <section data-testid="dp-views" className="my-12">
            <h2 id="data-views">Data Views</h2>
            {views.map((view, id) => (
              <View view={view} key={id} />
            ))}
          </section>
        )}
        <section data-testid="dp-files" className="my-12">
          <h2 id="data-files">Data Files</h2>
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
                    <td>{r.lastModified && r.lastModified.substring(0, 10)}</td>
                    <td>
                      <a
                        target="_blank"
                        href={`${rawFilePermalinkBase}/${r.path}`}
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
          <section data-testid="dp-previews" className="my-12">
            <h2 id="data-previews">Data Previews</h2>
            <div>
              {_resources.slice(0, 5).map((resource) => (
                <div key={resource.name}>
                  <ResourcePreview resource={resource} />
                  {resource.schema && (
                    <ResourceSchema schema={resource.schema} />
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
        <hr />
        <section
          data-testid="dp-readme"
          id="readme"
          className="mx-auto max-w-full"
        >
          {children}
        </section>
      </article>
    </>
  );
};
