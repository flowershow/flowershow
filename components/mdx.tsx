"use client";
// TODO the whole layout shouldn\t be client-side rendered, only parts of it
import { MDXRemote } from "next-mdx-remote";
import { Mermaid, Pre } from "@portaljs/core";
import {
    BucketViewer,
    Catalog,
    Excel,
    FlatUiTable,
    LineChart,
    Map,
    PdfViewer,
    Vega,
    VegaLite,
} from "@portaljs/components";
import "@portaljs/components/styles.css";
import layouts from "@/components/layouts";
import { FrictionlessViewFactory } from "./frictionless-view";

const tableComponent = (props) => (
    <div className="overflow-x-auto">
        <table {...props} />
    </div>
);

const linkComponent = ({ href, children, ...rest }) => {
    const processedHref = href.replace(/\.[^/.]+$/, "");
    return (
        <a href={processedHref} {...rest}>
            {children}
        </a>
    );
};

const components: any = {
    mermaid: Mermaid,
    pre: Pre,
    table: tableComponent,
    a: linkComponent,
    BucketViewer,
    Catalog,
    Map,
};

export default function MDX({ source, frontMatter, dataUrlBase }) {
    // fix for commonmark image embeds with relative paths
    components.img = (props) => {
        const _src = props.src;
        const src = _src.startsWith("http") ? _src : `${dataUrlBase}/${_src}`;
        return <img {...props} src={src} />;
    };
    components.img.displayName = "img";

    // TODO temporary fix for relative paths passed to portaljs components
    // extract this somewhere else

    components.Excel = (props) => {
        const _url = props.url;
        const url = _url.startsWith("http") ? _url : `${dataUrlBase}/${_url}`;
        return <Excel {...props} url={url} />;
    };
    components.Excel.displayName = "Excel";

    components.FlatUiTable = (props) => {
        const _url = props.url;
        if (_url) {
            const url = _url.startsWith("http")
                ? _url
                : `${dataUrlBase}/${_url.replace(/^\/+/g, "")}`;
            return <FlatUiTable {...props} url={url} />;
        }
        return <FlatUiTable {...props} />;
    };
    components.FlatUiTable.displayName = "FlatUiTable";

    components.LineChart = (props) => {
        const _data = props.data;
        // if data is a string
        if (typeof _data === "string") {
            const url = _data.startsWith("http")
                ? _data
                : `${dataUrlBase}/${_data.replace(/^\/+/g, "")}`;
            return <LineChart {...props} data={url} />;
        }
        return <LineChart {...props} />;
    };
    components.LineChart.displayName = "LineChart";

    components.PdfViewer = (props) => {
        const _url = props.url;
        const url = _url.startsWith("http")
            ? _url
            : `${dataUrlBase}/${_url.replace(/^\/+/g, "")}`;
        return <PdfViewer {...props} url={url} />;
    };
    components.PdfViewer.displayName = "PdfViewer";

    components.Vega = (props) => {
        const _url = props.spec.data.URL;
        if (_url) {
            props.spec.data.URL = _url.startsWith("http")
                ? _url
                : `${dataUrlBase}/${_url.replace(/^\/+/g, "")}`;
        }
        return <Vega {...props} />;
    };
    components.Vega.displayName = "Vega";

    components.VegaLite = (props) => {
        const _url = props.spec.data.URL;
        if (_url) {
            props.spec.data.URL = _url.startsWith("http")
                ? _url
                : `${dataUrlBase}/${_url.replace(/^\/+/g, "")}`;
        }
        return <VegaLite {...props} />;
    };
    components.VegaLite.displayName = "VegaLite";

    if (frontMatter.datapackage) {
        components.FrictionlessView = FrictionlessViewFactory({
            views: frontMatter.datapackage.views,
            resources: frontMatter.datapackage.resources,
            dataUrlBase,
        });
    }

    const Layout = ({ children }) => {
        if (frontMatter.datapackage) {
            const Component = layouts["datapackage"];
            // TODO gh_repository and gh_branch passed as a temporary solution to support relative paths
            // in datapackage
            return (
                <Component
                    {...frontMatter}
                    datapackage={frontMatter.datapackage}
                    dataUrlBase={dataUrlBase}
                >
                    {children}
                </Component>
            );
        }

        const Component = layouts[frontMatter.layout || "story"];
        const authors = (frontMatter.authors || []).map((author) => ({
            name: author,
            avatar: "/avatarplaceholder.png",
        }));
        return (
            <Component {...frontMatter} authors={authors}>
                {children}
            </Component>
        );
    };

    return (
        <article id="mdxpage" className="mt-20 pb-20" suppressHydrationWarning>
            <Layout>
                <MDXRemote {...source} components={components} />
            </Layout>
        </article>
    );
}
