import { useState, useEffect } from "react";
import Editor from '@monaco-editor/react';
import parse from "@/lib/markdown-client";
import { compileMDX } from 'next-mdx-remote/rsc'

import dynamic from "next/dynamic";

const MDX = dynamic(() => import("./mdx"), {
    loading: () => <p>Loading...</p>,
    ssr: false,
});


export function LivePreview() {
    const [code, setCode] = useState(`# Hello, world!

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec a diam lectus.

> [!hint]
> Edit this file to see the live preview update.

## Some subheading

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec a diam lectus.


<LineChart
  data={[
    [
      '1850',
      -0.41765878
    ],
    [
      '1851',
      -0.2333498
    ],
    [
      '1852',
      -0.22939907
    ],
    [
      '1853',
      -0.27035445
    ],
    [
      '1854',
      -0.29163003
    ]
  ]}
 />

## Another subheading

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec a diam lectus.

$$\\begin{vmatrix}a & b\\\\ c & d \\end{vmatrix}=ad-bc$$

\`\`\`js
function hello() {
    console.log("Hello, world!");
}
\`\`\`
`);

    const [source, setSource] = useState(null);

    const options = {
        overviewRulerBorder: false,
        wordWrap: "on" as const,
        quickSuggestions: false,
        minimap: {
            enabled: false,
        },
        overviewRulerLanes: 0,
        selectionHighlight: false,
        selectOnLineNumbers: false,
        scrollBeyondLastLine: false,
        renderLineHighlight: "none" as const,
        scrollbar: {
            vertical: "hidden" as const,
            horizontal: "hidden" as const,
            alwaysConsumeMouseWheel: false,
        },
    };

    useEffect(() => {
        async function parseCode() {
            const escapedCode = escapeUnsupportedComponents({
                mdx: code,
                supportedComponents: ["LineChart", "Vega", "VegaLite", "FlatUiTable"],
            });

            console.log(escapedCode);
            const result = await parse(escapedCode, "mdx", {});
            const { mdxSource } = result;
            setSource(mdxSource);
        }
        parseCode();
    }, [code]);

    function handleEditorChange(value, event) {
        setCode(value);
    }

    // next-mdx-remote throws an error if the MDX contains unsupported components
    function escapeUnsupportedComponents({ mdx, supportedComponents }: { mdx: string, supportedComponents: string[] }) {
        // Regex to find JSX components. This is a simplistic pattern and might need to be adjusted for complex cases.
        const jsxRegex = /<([A-Z][A-Za-z]*)\b[^>]*>(.*?)<\/\1>/gs;

        return mdx.replace(jsxRegex, (match, componentName) => {
            // Check if the component is supported
            if (supportedComponents.includes(componentName)) {
                return match; // return the component as is
            } else {
                // Escape the unsupported component
                return `<!-- ${match.replace(/</g, '&lt;').replace(/>/g, '&gt;')} -->`;
            }
        });
    }

    return (
        <div className="grid sm:grid-cols-2 gap-3">
            <div
                className="rounded-md bg-white border border-1 border-neutral-200"
            >
                <div aria-label="Select file to view" className="flex flex-nowrap overflow-x-auto bg-neutral-50">
                    <div className="flex h-10 items-center space-x-1.5 border-b border-neutral-100 px-4 dark:border-neutral-900">
                        <span className="h-3 w-3 rounded-full bg-red-400 dark:bg-slate-600" />
                        <span className="h-3 w-3 rounded-full bg-amber-400 dark:bg-slate-600" />
                        <span className="h-3 w-3 rounded-full bg-green-400 dark:bg-slate-600" />
                    </div>
                    <div>
                        <div className="bg-white border-b-0 relative flex h-10 shrink-0 items-center px-4 border-r border-b border-neutral-100 text-xs focus:outline-none">
                            README.md
                        </div>
                    </div>
                    <div className="grow border-b border-neutral-100 dark:border-neutral-900"></div>
                </div>
                <div className="w-full p-3">
                    <Editor
                        height="75vh"
                        language="mdx"
                        value={code}
                        onChange={handleEditorChange}
                        options={options}
                    />
                </div>
            </div>
            <div
                className="h-[85vh] rounded-md bg-white border border-1 border-neutral-200"
            >
                <div aria-label="Select file to view" className="flex flex-nowrap overflow-x-auto bg-neutral-50">
                    <div className="flex h-10 items-center space-x-1.5 border-b border-neutral-100 px-4 dark:border-neutral-900">
                        <span className="h-3 w-3 rounded-full bg-red-400 dark:bg-slate-600" />
                        <span className="h-3 w-3 rounded-full bg-amber-400 dark:bg-slate-600" />
                        <span className="h-3 w-3 rounded-full bg-green-400 dark:bg-slate-600" />
                    </div>
                    <div>
                        <div className="bg-white border-b-0 relative flex h-10 shrink-0 items-center px-4 border-r border-b border-neutral-100 text-xs focus:outline-none">
                            my-datarich-blog.datahub.app
                        </div>
                    </div>
                    <div className="grow border-b border-neutral-100 dark:border-neutral-900"></div>
                </div>
                <div className="w-full p-3">
                    <div id="mdx-live-preview" className="h-[75vh] overflow-y-auto">
                        {source && <MDX source={source} />}
                    </div>
                </div>
            </div>
        </div>
    )
}
