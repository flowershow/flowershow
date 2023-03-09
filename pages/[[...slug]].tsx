/* eslint import/no-default-export: off */
import { useEffect } from "react";
import { NextSeo } from "next-seo";
import { allDocuments } from "contentlayer/generated";
import { useMDXComponent } from "next-contentlayer/hooks";
import { Document } from "contentlayer/core";

import { CustomLink, Pre, BlogsList, Mermaid } from "@flowershow/core";

import { getPageData } from "../lib/getPageData";
import { getAuthorsDetails } from "../lib/getAuthorsDetails";
import layouts from "../layouts";
import { siteConfig } from "../config/siteConfig";

// workaround solution to allow importing components
// that import from "next" package (e.g. next/link) in MDX pages
// more info: https://github.com/contentlayerdev/contentlayer/issues/288
const codePrefix = `
if (typeof process === 'undefined') {
  globalThis.process = { env: {} }
}
`;

// this is a workaround for error's thrown in contentlayer's
// useMDXComponent hook when md file is empty
const defaultCode = `
return {default: () => React.createElement('div', null, '')}
`;

export default function Page({ globals, body, ...meta }) {
  const pageCode = body.code.length > 0 ? body.code : defaultCode;
  const MDXPage = useMDXComponent(`${codePrefix}${pageCode}`, globals);
  const { image, title, description, showLinkPreview } = meta;

  // workaround to handle repeating titles
  // remove the first heading from markdown if it's a title and displayed on page
  useEffect(() => {
    const headings = Array.from(document.getElementsByTagName("h1"));
    // check if frontmatter title is displayed on page (as h1)
    // warning?: this may return true if we have h1 as jsx in markdown with title value
    // and can return false if we give the frontmatter title (h1) an id
    const headingTitle = headings?.find((h) => !h.id && h.innerHTML === title);

    if (headingTitle) {
      // find and remove the markdown heading
      const firstMarkdownHeading = headings.find((h) => {
        return h.id && headingTitle.innerHTML === h.innerHTML;
      });

      firstMarkdownHeading?.parentElement.removeChild(firstMarkdownHeading);
    }
  }, [title]);

  const MDXComponents = {
    /* Head, */ // TODO why do we need this here?
    a: (props) => (
      <CustomLink
        data={allDocuments}
        usehook={useMDXComponent}
        preview={showLinkPreview ?? siteConfig.showLinkPreviews}
        {...props}
      />
    ),
    pre: Pre,
    mermaid: Mermaid,
    /* eslint no-unused-vars: off */
    // TODO this is a temporary workaround for errors resulting from importing this component directly in mdx file
    // see this issue for ref: https://github.com/kentcdodds/mdx-bundler/issues/156
    BlogsList,
    wrapper: ({ components, layout, ...props }) => {
      const Layout = layouts[layout];
      return <Layout {...props} />;
    },
    // user defined MDX components could be added here
    // ...userMDXComponents
  };

  // Handle SEO Image urls in frontmatter
  // TODO why do we remove the "/" at the end? Should images be in form of "/some_image.png"?
  const websiteUrl = siteConfig.authorUrl.replace(/\/+$/, "");
  const seoImageUrl =
    image && image.startsWith("http") ? image : websiteUrl + image;

  return (
    <>
      <NextSeo
        title={title}
        openGraph={{
          title: title,
          description: description,
          images: image
            ? [
                {
                  url: seoImageUrl,
                  width: 1200,
                  height: 627,
                  alt: title,
                },
              ]
            : siteConfig?.nextSeo?.openGraph?.images || [],
        }}
      />
      <MDXPage components={MDXComponents} {...meta} />
    </>
  );
}

export async function getStaticProps({ params }) {
  // params.slug is undefined for root index page
  const urlPath = params.slug ? params.slug.join("/") : "";
  const page: Document = allDocuments.find((p) => p.url_path === urlPath);
  const globals = await getPageData(page.data);
  // TODO this is a temporary solution used to pass authors to blog layout
  const authorsDetails = getAuthorsDetails(page.authors);
  return { props: { ...page, authorsDetails, globals } };
}

export async function getStaticPaths() {
  const paths = allDocuments
    .filter((page) => !page?.isDraft)
    .map((page) => {
      const parts = page.url_path.split("/");
      return { params: { slug: parts } };
    });

  return {
    paths,
    fallback: false,
  };
}
