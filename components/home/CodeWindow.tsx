import clsx from 'clsx';
import { Tab } from '@headlessui/react'
import { PrismLight as SyntaxHighlighter } from 'react-syntax-highlighter';
import js from 'react-syntax-highlighter/dist/cjs/languages/prism/javascript';
import bash from 'react-syntax-highlighter/dist/cjs/languages/prism/bash';
import sql from 'react-syntax-highlighter/dist/cjs/languages/prism/sql';
import markdown from 'react-syntax-highlighter/dist/cjs/languages/prism/markdown';

export type CodeSnippet = { file?: string; code: string; language: 'js' | 'bash' | 'sql' | 'markdown' }

SyntaxHighlighter.registerLanguage('javascript', js);
SyntaxHighlighter.registerLanguage('bash', bash);
SyntaxHighlighter.registerLanguage('sql', sql);
SyntaxHighlighter.registerLanguage('markdown', markdown);

export function CodeWindow({ snippets }: { snippets: CodeSnippet[] }) {

    return (
        <Tab.Group
            defaultIndex={0}
            as="div"
            className="rounded-md bg-neutral-50 border border-1 border-neutral-100"
        >
            <Tab.List aria-label="Select file to view" className="flex flex-nowrap overflow-x-auto">
                <div className="flex h-10 items-center space-x-1.5 border-b border-neutral-100 px-4 dark:border-neutral-900">
                    <span className="h-3 w-3 rounded-full bg-red-400 dark:bg-slate-600" />
                    <span className="h-3 w-3 rounded-full bg-amber-400 dark:bg-slate-600" />
                    <span className="h-3 w-3 rounded-full bg-green-400 dark:bg-slate-600" />
                </div>
                {snippets.length > 1 && snippets.map(({ file }, index) => (
                    <Tab
                        key={index}
                        value={file}
                    >
                        {({ selected }) => (
                            <div
                                className={
                                    clsx(
                                        "relative flex h-10 shrink-0 items-center px-4 border-r border-b border-neutral-100 text-xs focus:outline-none",
                                        selected ? "bg-white border-b-0" : "text-neutral-500 hover:text-neutral-600"
                                    )}
                            >
                                {file}
                            </div>
                        )}
                    </Tab>
                ))}
                <div className="grow border-b border-neutral-100 dark:border-neutral-900"></div>
            </Tab.List>
            <Tab.Panels className="max-h-[600px] overflow-y-scroll">
                {snippets.map(({ code, language }, index) => (
                    <Tab.Panel key={index} className="flex overflow-y-hidden focus:outline-none">
                        <div className="w-full overflow-x-auto bg-white text-sm p-3">
                            <SyntaxHighlighter
                                showLineNumbers={language !== "bash" && language !== "sql"}
                                language={language}
                                useInlineStyles={false}
                            >
                                {code}
                            </SyntaxHighlighter>
                        </div>
                    </Tab.Panel>
                ))}
            </Tab.Panels>
        </Tab.Group>
    )
}
