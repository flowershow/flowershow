import fs from 'fs'
import path from 'path'

import parse from '../../lib/markdown'

import DRD from '../../components/drd/DRD'


export default function DRDPage({ source, frontMatter }) {
  return (
    <DRD source={source} frontMatter={frontMatter} />
  )
}

export const getStaticProps = async ({ params }) => {
    const urlPath = params.slug ? params.slug.join("/") : "";
    /* const page = dbDocuments.find((p) => p.url_path === urlPath); */
    const mdxPath = path.join("__tests__/fixtures/mdx", urlPath + ".md");
    const source = fs.readFileSync(mdxPath)

    const { mdxSource, frontMatter } = await parse(source, mdxPath)

    return {
        props: {
            source: mdxSource,
            frontMatter: frontMatter,
        },
    }
}

export async function getStaticPaths() {
    /* const paths = allDocuments
     *     .map((page) => {
     *         const parts = page.url_path.split("/");
     *         return { params: { slug: parts } };
     * }); */

    const paths = [
        { params: { slug: ['markdown'] }},
        { params: { slug: ['example'] }},
        { params: { slug: ['test', 'test'] }}
    ]
    return {
        paths,
        fallback: false,
    };
}
