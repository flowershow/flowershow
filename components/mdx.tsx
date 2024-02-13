"use client";
// TODO the whole layout shouldn\t be client-side rendered, only parts of it
import { MDXRemote } from 'next-mdx-remote';
import { Mermaid, Pre } from '@portaljs/core';
import * as DataRichComponents from '@portaljs/components';
import '@portaljs/components/styles.css';
import layouts from '@/components/layouts';
import { FrictionlessViewFactory } from './frictionless-view';

const tableComponent = (props) => (
    <div className="overflow-x-auto">
        <table {...props} />
    </div>
);

const linkComponent = ({ href, children, ...rest }) => {
    const processedHref = href.replace(/\.[^/.]+$/, '');
    return <a href={processedHref} {...rest}>{children}</a>;
};

const components: any = {
    mermaid: Mermaid,
    pre: Pre,
    table: tableComponent,
    a: linkComponent,
    ...DataRichComponents,
};

export default function MDX({ source, frontMatter, gh_repository, gh_branch }) {
    if (frontMatter.datapackage) {
        components.FrictionlessView = FrictionlessViewFactory({
            views: frontMatter.datapackage.views,
            resources: frontMatter.datapackage.resources,
            dataUrlBase: `https://raw.githubusercontent.com/${gh_repository}/${gh_branch}/`,
        });
    }

    const Layout = ({ children }) => {
        let LayoutComponent = <>{children}</>;

        if (frontMatter.layout) {
            const Component = layouts[frontMatter.layout];
            const authors = (frontMatter.authors || []).map(author => ({
                name: author, avatar: "/avatarplaceholder.png"
            }));
            LayoutComponent = <Component {...frontMatter} authors={authors}>{children}</Component>;
        } else if (frontMatter.datapackage) {
            const Component = layouts["datapackage"];
            // TODO gh_repository and gh_branch passed as a temporary solution to support relative paths
            // in datapackage
            LayoutComponent = (
                <Component
                    {...frontMatter}
                    datapackage={frontMatter.datapackage}
                    gh_repository={gh_repository}
                    gh_branch={gh_branch}
                >
                    {children}
                </Component>
            );
        }

        return LayoutComponent;
    };

    return (
        <article id="mdxpage" suppressHydrationWarning>
            <Layout>
                <MDXRemote {...source} components={components} />
            </Layout>
        </article>
    );
}
