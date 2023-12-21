"use client";

import { MDXRemote, MDXRemoteProps } from "next-mdx-remote";
import { Mermaid, Pre } from "@portaljs/core";
/* import { replaceLinks } from "@/lib/remark-plugins";
* import { Tweet } from "react-tweet"; */
/* import BlurImage from "@/components/blur-image";
* import styles from "./mdx.module.css"; */
import layouts from "@/components/layouts";

import * as DataRichComponents from "@portaljs/components"
import FrictionlessViewFactory from "./frictionless";
import '@portaljs/components/styles.css'

const components = {
    /* a: replaceLinks,
* BlurImage,
* Tweet, */
    mermaid: Mermaid,
    pre: Pre,
    ...DataRichComponents as any,
    table: (props) => (
        <div className="overflow-x-auto">
            <table {...props} />
        </div>
    ),
    // remove file extension from links (needed for CommonMark links)
    a: ({ href, children, ...rest }) => {
        const _href = href.replace(/\.[^/.]+$/, '');
        return (
            <a
                href={_href}
                {...rest}
            >
                {children}
            </a>
        )
    }
};

export default function MDX({
    source,
    frontMatter,
    gh_repository, // TODO remporary solution
    gh_branch, // TODO remporary solution
}: {
    source: MDXRemoteProps,
    frontMatter: {
        [key: string]: any
    },
    gh_repository: string,
    gh_branch: string,
}) {
    if (frontMatter.frictionless) {
        components.FrictionlessView = FrictionlessViewFactory({
            views: frontMatter.frictionless.views,
            resources: frontMatter.frictionless.resources,
            // TODO temporary solution for fetchign files from github
            dataUrlBase: `https://raw.githubusercontent.com/${gh_repository}/${gh_branch}/`,
        });
    }

    const Layout = ({ children }: React.PropsWithChildren) => {
        if (frontMatter.layout) {
            const LayoutComponent = layouts[frontMatter.layout];
            // TODO temporary solution to display authors in blog layouts
            const authors = (frontMatter.authors || []).map((author: string) => ({
                name: author,
                avatar: "/avatarplaceholder.png"
            }));
            // TODO temporary solution for fetchign files from github in datapackage layout
            frontMatter.gh_repository = gh_repository;
            frontMatter.gh_branch = gh_branch;

            return <LayoutComponent {...frontMatter} authors={authors}>{children}</LayoutComponent>;
        }
        return <>{children}</>;
    };

    return (
        <article
            id="mdxpage"
            className={`prose dark:prose-invert mx-auto`}
            suppressHydrationWarning={true}
        >
            {/* @ts-ignore */}
            <Layout>
                <MDXRemote {...source} components={components} />
            </Layout>
            {/* <MDXRemote {...source} components={components} /> */}
        </article>
    );
}
