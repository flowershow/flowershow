// import Link from "next/link";
// import dynamic from "next/dynamic";
// import prettyBytes from "pretty-bytes";
// import { formatDistanceToNow } from "date-fns";
// import { ArrowRightIcon, InfoIcon, FileDownIcon } from "lucide-react";
// import { GithubIcon } from "@/components/icons";

// import {
//   type SimpleView,
//   type Resource,
//   type View,
//   isResourceWithPath,
//   isSimpleViewWithResourceName,
//   isSimpleView,
// } from "./datapackage-types";
// import { FrictionlessView } from "@/components/frictionless-view";
// import { ErrorMessage } from "@/components/error-message";
// import { ResourcePreview } from "@/components/resource-preview";
// import { DatasetPageMetadata } from "@/server/api/types";
// import { ResourceSchema } from "../resource-schema";
// import RequestDataButton from "../request-data-button";
// import RequestDataModal from "../modal/request-data";

// const SocialShareMenu = dynamic(
//   () => import("@/components/social-share-menu"),
//   { ssr: false },
// );

// interface Props extends React.PropsWithChildren {
//   metadata: DatasetPageMetadata;
//   resolveAssetUrl: (url: string) => string;
//   ghRepository: string;
// }

// export const DataPackageLayout: React.FC<Props> = async ({
//   children,
//   metadata,
//   resolveAssetUrl,
//   ghRepository,
// }) => {
//   const {
//     title,
//     description,
//     resources,
//     views,
//     created,
//     updated,
//     licenses,
//     sources,
//     collection,
//   } = metadata;

//   if (!resources) {
//     return (
//       <ErrorMessage
//         title="Error in `datapackage` layout:"
//         message="No resources found in the Data Package."
//       />
//     );
//   }

//   const resourceFiles = resources.filter(isResourceWithPath);
//   const resourceFilesCount = resourceFiles.length;
//   const resouceFilesExtensions = Array.from(
//     new Set(resourceFiles.map((r) => r.format)),
//   ).join(", ");
//   const resourceFilesSize = resourceFiles.reduce(
//     (acc, r) => acc + (r.bytes ?? 0),
//     0,
//   );

//   const datasetLastModifiedDate =
//     updated ?? getEarliestResourceModificationTime(resources);

//   const isPremiumDataset = metadata.has_premium;
//   const hideGitRepo = metadata.hide_git_repo;
//   const hasSolutions = metadata.has_solutions;

//   return (
//     <>
//       <article className="lg:prose-md prose max-w-none dark:prose-invert prose-headings:font-title prose-headings:font-medium prose-a:break-words">
//         <header className="mb-8 flex flex-col gap-y-5">
//           <h1 className="mb-2">{title}</h1>
//           {isPremiumDataset && (
//             <div className="rounded-md bg-orange-50 p-4">
//               <div className="flex">
//                 <div className="flex-shrink-0">
//                   <InfoIcon
//                     aria-hidden="true"
//                     className="h-5 w-5 text-orange-400"
//                   />
//                 </div>
//                 <div className="ml-3 flex-1 md:flex md:justify-between">
//                   <p className="my-0 text-sm text-orange-700">
//                     Request access to view and download the premium version of
//                     this dataset.
//                   </p>
//                   <p className="mb-0 mt-3 text-sm md:ml-6 md:mt-0">
//                     <RequestDataButton
//                       style="text"
//                       className="whitespace-nowrap font-medium text-orange-700 hover:text-orange-600"
//                       text="Request &rarr;"
//                     >
//                       <RequestDataModal
//                         description={`I would like to request access to the premium version of this dataset - ${title}`}
//                       />
//                     </RequestDataButton>
//                   </p>
//                 </div>
//               </div>
//             </div>
//           )}
//           {hasSolutions && hasSolutions.length > 0 && (
//             <section data-testid="dp-solutions">
//               {hasSolutions.map((solutionName) => (
//                 <Link
//                   key={solutionName}
//                   href={`/solutions/${solutionName}`}
//                   className="no-underline hover:underline"
//                 >
//                   <button className="rounded-md border border-black px-3.5 py-2.5 text-sm text-slate-600 shadow-sm hover:bg-orange-100">
//                     Explore data solution →
//                   </button>
//                 </Link>
//               ))}
//             </section>
//           )}

//           <div className="flex items-center justify-start gap-x-2">
//             {!hideGitRepo && (
//               <>
//                 <div
//                   className="flex items-center gap-1"
//                   data-testid="goto-repository"
//                 >
//                   <GithubIcon width={18} />
//                   <Link
//                     className="flex items-center gap-1 font-normal text-slate-600 no-underline hover:underline"
//                     href={`https://github.com/${ghRepository}`}
//                     target="_blank"
//                     rel="noreferrer"
//                   >
//                     {ghRepository}
//                   </Link>
//                 </div>
//                 <span>•</span>
//               </>
//             )}
//             <div className="flex items-center">
//               <SocialShareMenu shareTitle={title} />
//             </div>
//           </div>
//           <table
//             data-testid="dp-metadata-table"
//             className="table-auto divide-y divide-gray-300"
//           >
//             <thead>
//               <tr>
//                 <th>Files</th>
//                 <th>Size</th>
//                 <th>Format</th>
//                 <th>Created</th>
//                 <th>Updated</th>
//                 <th>License</th>
//                 <th>Source</th>
//               </tr>
//             </thead>
//             <tbody>
//               <tr>
//                 <td>{resourceFilesCount}</td>
//                 <td>{prettyBytes(resourceFilesSize)}</td>
//                 <td>{resouceFilesExtensions}</td>
//                 <td
//                   className="cursor-default whitespace-nowrap"
//                   title={created ? new Date(created).toLocaleString() : ""}
//                 >
//                   <span>
//                     {created &&
//                       formatDistanceToNow(new Date(created), {
//                         addSuffix: true,
//                       })}
//                   </span>
//                 </td>
//                 <td
//                   className="cursor-default whitespace-nowrap"
//                   title={
//                     datasetLastModifiedDate
//                       ? new Date(datasetLastModifiedDate).toLocaleString()
//                       : ""
//                   }
//                 >
//                   <span>
//                     {datasetLastModifiedDate &&
//                       formatDistanceToNow(new Date(datasetLastModifiedDate), {
//                         addSuffix: true,
//                       })}
//                   </span>
//                 </td>
//                 <td>
//                   <a
//                     target="_blank"
//                     href={licenses ? licenses[0]?.path : "#"}
//                     className="mb-2 block hover:text-[#6366F1]"
//                   >
//                     {licenses ? licenses[0]?.title : ""}
//                   </a>
//                 </td>
//                 <td>
//                   <a
//                     target="_blank"
//                     href={sources ? sources[0]?.path : "#"}
//                     className="mb-2 block hover:text-[#6366F1]"
//                   >
//                     {sources ? sources[0]?.title : ""}
//                   </a>
//                 </td>
//               </tr>
//             </tbody>
//           </table>
//           <div data-testid="dp-description">
//             <p className="text-md">{description}</p>
//             {/* Read more link */}
//             <a
//               className="inline-block text-[#6366F1] no-underline hover:underline"
//               href="#readme"
//             >
//               <div className="flex items-center space-x-1">
//                 <span>Read more</span>
//                 <ArrowRightIcon className="inline h-4 w-4" />
//               </div>
//             </a>
//           </div>
//         </header>
//         {views && (
//           <section data-testid="dp-views" className="my-12">
//             <h2 id="data-views">Data Views</h2>
//             {views.map((view, id) => (
//               <View key={id} view={view} resources={resources} />
//             ))}
//           </section>
//         )}
//         <section data-testid="dp-files" className="my-12">
//           <h2 id="data-files">Data Files</h2>
//           <table className="table-auto divide-y divide-gray-300">
//             <thead>
//               <tr>
//                 <th>File</th>
//                 <th>Description</th>
//                 <th>Size</th>
//                 <th>Last modified</th>
//                 <th>Download</th>
//               </tr>
//             </thead>
//             <tbody>
//               {resources.map((r) => {
//                 return (
//                   <tr
//                     key={`resources-list-${r.name}`}
//                     className="even:bg-gray-50"
//                   >
//                     <td>
//                       <a href={`#${r.name}`} className="hover:text-[#6366F1]">
//                         <div className="flex items-center space-x-1 ">
//                           <span>{r.name}</span>
//                         </div>
//                       </a>
//                     </td>
//                     <td>{r.description || ""}</td>
//                     <td>{r.bytes ? prettyBytes(r.bytes) : ""}</td>
//                     <td
//                       className="cursor-default whitespace-nowrap"
//                       title={
//                         r.modified ? new Date(r.modified).toLocaleString() : ""
//                       }
//                     >
//                       <span>
//                         {r.modified &&
//                           formatDistanceToNow(new Date(r.modified), {
//                             addSuffix: true,
//                           })}
//                       </span>
//                     </td>
//                     <td>
//                       <a
//                         target="_blank"
//                         href={resolveAssetUrl(r.path)}
//                         className="hover:text-[#6366F1]"
//                       >
//                         <div className="flex items-center space-x-1 ">
//                           <span>{r.name}</span>
//                           <FileDownIcon className="inline h-4 w-4" />
//                         </div>
//                       </a>
//                     </td>
//                   </tr>
//                 );
//               })}
//             </tbody>
//           </table>
//         </section>
//         {resources.length > 0 && (
//           <section data-testid="dp-previews" className="my-12">
//             <h2 id="data-previews">Data Previews</h2>
//             <div>
//               {resources.slice(0, 5).map((resource) => (
//                 <div key={resource.name}>
//                   <ResourcePreview resource={resource} />
//                   {resource.schema && (
//                     <ResourceSchema schema={resource.schema} />
//                   )}
//                 </div>
//               ))}
//             </div>
//           </section>
//         )}
//         <hr />
//         <section
//           data-testid="dp-readme"
//           id="readme"
//           className="mx-auto max-w-full"
//         >
//           {children}
//         </section>
//         {collection && (
//           <section data-testid="dp-collection" className="my-12">
//             <Link
//               href={`/collections/${collection}`}
//               className="no-underline hover:underline"
//             >
//               <button className="mt-6 rounded-md bg-orange-50 px-3.5 py-2.5 text-sm font-semibold text-orange-600 shadow-sm hover:bg-orange-100">
//                 Discover similar datasets →
//               </button>
//             </Link>
//           </section>
//         )}
//       </article>
//     </>
//   );
// };

// const View: React.FC<{ view: SimpleView | View; resources: Resource[] }> = ({
//   view,
//   resources,
// }) => {
//   if (!isSimpleView(view)) {
//     return (
//       <ErrorMessage
//         title="Error in datapackage:"
//         message='Only views with `specType: "simple"` are supported at the moment.'
//       />
//     );
//   }

//   let resource: Resource | undefined;

//   if (isSimpleViewWithResourceName(view)) {
//     resource = resources.find((r) => r.name === view.resourceName);
//     // if resource is not csv or geojson skip
//     if (
//       resource &&
//       !["csv", "geojson"].includes(
//         resource.format || resource.path.split(".").pop(),
//       )
//     ) {
//       return (
//         <ErrorMessage
//           title="Error in datapackage:"
//           message={`Resource format not supported for view: ${view.name}`}
//         />
//       );
//     }
//   } else {
//     if (!view.resources || view.resources.length === 0) {
//       return (
//         <ErrorMessage
//           title="Error in datapackage:"
//           message={`Resource not found for view: ${view.name}`}
//         />
//       );
//     }
//     resource = resources.find((r) => r.name === view.resources[0]);
//   }

//   if (!resource) {
//     return (
//       <ErrorMessage
//         title="Error in datapackage:"
//         message={`Resource not found for view: ${view.name}`}
//       />
//     );
//   }
//   return (
//     <div className="not-prose md:text-base">
//       <FrictionlessView view={view} resource={resource} />
//     </div>
//   );
// };

// const getEarliestResourceModificationTime = (resources: Resource[]) => {
//   return resources.reduce((acc, resource) => {
//     if (!resource.modified) {
//       return acc;
//     }
//     if (!acc) {
//       return resource.modified;
//     }
//     if (new Date(resource.modified) < new Date(acc)) {
//       return resource.modified;
//     }
//     return acc;
//   }, null);
// };
