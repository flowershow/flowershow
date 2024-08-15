/* "use client";
 * import { useState, useEffect } from "react";
 * import { ErrorBoundary } from "react-error-boundary";
 * import Editor from "@monaco-editor/react";
 *
 * import MDX from "./mdx";
 *
 * export function LivePreview() {
 *   const [previewIsLoading, setPreviewIsLoading] = useState(true);
 *   const [isError, setIsError] = useState(false);
 *   const [errorBoundaryKey, setErrorBoundaryKey] = useState(0);
 *   const [code, setCode] = useState(`# Hello, world!
 *
 * Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec a diam lectus.
 *
 * > [!hint]
 * > Edit this file to see the live preview update.
 *
 * ## Some subheading
 *
 * Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec a diam lectus.
 *
 *
 * <LineChart
 *   data={[
 *     ['1850', -0.41765878],
 *     ['1851', -0.2333498],
 *     ['1852', -0.22939907],
 *     ['1853', -0.27035445],
 *     ['1854', -0.29163003],
 *     ['1855', -0.37025971],
 *     ['1856', -0.34520575],
 *     ['1857', -0.28799894],
 *     ['1858', -0.21425348],
 *     ['1859', -0.26460280],
 *     ['1860', -0.32811407],
 *     ['1861', -0.25200663],
 *     ['1862', -0.21742738],
 *     ['1863', -0.22927083],
 *     ['1864', -0.16240879]
 *   ]}
 * />
 *
 * ## Another subheading
 *
 * Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec a diam lectus.
 *
 * $$\\begin{vmatrix}a & b\\\\ c & d \\end{vmatrix}=ad-bc$$
 *
 * Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec a diam lectus.
 *
 * \`\`\`js
 * function hello() {
 *     console.log("Hello, world!");
 * }
 * \`\`\`
 *     `);
 *   const [source, setSource] = useState(null);
 *
 *   const options = {
 *     overviewRulerBorder: false,
 *     wordWrap: "on" as const,
 *     quickSuggestions: false,
 *     minimap: {
 *       enabled: false,
 *     },
 *     overviewRulerLanes: 0,
 *     selectionHighlight: false,
 *     selectOnLineNumbers: false,
 *     scrollBeyondLastLine: false,
 *     renderLineHighlight: "none" as const,
 *     scrollbar: {
 *       vertical: "hidden" as const,
 *       horizontal: "hidden" as const,
 *       alwaysConsumeMouseWheel: false,
 *     },
 *   };
 *
 *   useEffect(() => {
 *     async function bundleCode() {
 *       fetch("/api/mdx", {
 *         method: "POST",
 *         headers: {
 *           "Content-Type": "application/json",
 *         },
 *         body: JSON.stringify({
 *           mdx: code,
 *         }),
 *       })
 *         .then((res) => res.json())
 *         .then(({ code, frontmatter }) => {
 *           if (isError) {
 *             setIsError(false);
 *             setErrorBoundaryKey(errorBoundaryKey + 1);
 *           }
 *           if (previewIsLoading) {
 *             setPreviewIsLoading(false);
 *           }
 *           setSource(code);
 *         });
 *     }
 *     bundleCode();
 *   }, [code]);
 *
 *   function handleEditorChange(value, event) {
 *     setCode(value);
 *   }
 *
 *   return (
 *     <div className="grid gap-3 sm:grid-cols-2">
 *       <div className="border-1 rounded-md border border-neutral-200 bg-white">
 *         <div
 *           aria-label="Select file to view"
 *           className="flex flex-nowrap overflow-x-auto bg-neutral-50"
 *         >
 *           <div className="flex h-10 items-center space-x-1.5 border-b border-neutral-100 px-4 dark:border-neutral-900">
 *             <span className="h-3 w-3 rounded-full bg-red-400 dark:bg-slate-600" />
 *             <span className="h-3 w-3 rounded-full bg-amber-400 dark:bg-slate-600" />
 *             <span className="h-3 w-3 rounded-full bg-green-400 dark:bg-slate-600" />
 *           </div>
 *           <div>
 *             <div className="relative flex h-10 shrink-0 items-center border-b border-b-0 border-r border-neutral-100 bg-white px-4 text-xs focus:outline-none">
 *               README.md
 *             </div>
 *           </div>
 *           <div className="grow border-b border-neutral-100 dark:border-neutral-900"></div>
 *         </div>
 *         <div className="w-full p-3">
 *           <Editor
 *             height="75vh"
 *             language="mdx"
 *             value={code}
 *             onChange={handleEditorChange}
 *             options={options}
 *           />
 *         </div>
 *       </div>
 *       <div className="border-1 h-[85vh] rounded-md border border-neutral-200 bg-white">
 *         <div
 *           aria-label="Select file to view"
 *           className="flex flex-nowrap overflow-x-auto bg-neutral-50"
 *         >
 *           <div className="flex h-10 items-center space-x-1.5 border-b border-neutral-100 px-4 dark:border-neutral-900">
 *             <span className="h-3 w-3 rounded-full bg-red-400 dark:bg-slate-600" />
 *             <span className="h-3 w-3 rounded-full bg-amber-400 dark:bg-slate-600" />
 *             <span className="h-3 w-3 rounded-full bg-green-400 dark:bg-slate-600" />
 *           </div>
 *           <div>
 *             <div className="relative flex h-10 shrink-0 items-center border-b border-b-0 border-r border-neutral-100 bg-white px-4 text-xs focus:outline-none">
 *               my-datarich-blog.datahub.io
 *             </div>
 *           </div>
 *           <div className="grow border-b border-neutral-100 dark:border-neutral-900"></div>
 *         </div>
 *         <div className="w-full p-3">
 *           <div id="mdx-live-preview" className="flex h-[75vh] overflow-y-auto">
 *             {previewIsLoading ? (
 *               <span className="mx-auto my-auto">Loading...</span>
 *             ) : (
 *               <ErrorBoundary
 *                 key={errorBoundaryKey}
 *                 FallbackComponent={MyFallbackComponent}
 *                 onError={() => setIsError(true)}
 *               >
 *                 {source && <MDX source={source} />}
 *               </ErrorBoundary>
 *             )}
 *           </div>
 *         </div>
 *       </div>
 *     </div>
 *   );
 * }
 *
 * function MyFallbackComponent({ error }) {
 *   return (
 *     <div role="alert">
 *       <pre>{error.message}</pre>
 *     </div>
 *   );
 * } */
