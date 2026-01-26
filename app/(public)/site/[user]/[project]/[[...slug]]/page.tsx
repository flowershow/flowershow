import { GiscusProps } from '@giscus/react';
import clsx from 'clsx';
import emojiRegex from 'emoji-regex';
import { EditIcon } from 'lucide-react';
import Link from 'next/link';
import { notFound, permanentRedirect, redirect } from 'next/navigation';
import { serialize } from 'next-mdx-remote-client/serialize';
import Comments from '@/components/public/comments';
import ErrorMessage from '@/components/public/error-message';
import Hero from '@/components/public/hero';
import { BlogLayout } from '@/components/public/layouts/blog';
import MDXClient from '@/components/public/mdx-client';
import SiteTree from '@/components/public/site-tree';
import TableOfContents from '@/components/public/table-of-contents';
import { getConfig } from '@/lib/app-config';
import { Feature, isFeatureEnabled } from '@/lib/feature-flags';
import { generateScopedCss } from '@/lib/generate-scoped-css';
import { getSite } from '@/lib/get-site';
import { getSiteUrl, getSiteUrlPath } from '@/lib/get-site-url';
import { resolveHeroConfig } from '@/lib/hero-config';
import { getMdxOptions, processMarkdown } from '@/lib/markdown';
import { preprocessMdxForgiving } from '@/lib/preprocess-mdx';
import { resolveSiteAlias } from '@/lib/resolve-site-alias';
import { PageMetadata } from '@/server/api/types';
import { api } from '@/trpc/server';
import UrlNormalizer from './_components/url-normalizer';

const config = getConfig();

interface RouteParams {
  user: string;
  project: string;
  slug?: string[];
}

export async function generateMetadata(props: {
  params: Promise<RouteParams>;
}) {
  const params = await props.params;
  const projectName = decodeURIComponent(params.project);
  const userName = decodeURIComponent(params.user);
  const slug = params.slug ? params.slug.join('/') : '/';
  const decodedSlug = slug.replace(/%20/g, '+');

  const site = await getSite(userName, projectName);
  const siteUrl = getSiteUrl(site);

  // For anonymous sites, handle case where blob might not be ready yet
  const blob = await api.site.getBlob
    .query({
      siteId: site.id,
      slug: decodedSlug,
    })
    .catch(() => {
      // For anonymous sites, return null instead of throwing 404
      // This allows the page to render even if metadata isn't ready
      if (userName === 'anon') {
        return null;
      }
      notFound();
    });

  const metadata = blob?.metadata as PageMetadata | null;

  // workaround (?) to "not publish" files marked with `publish: false`
  // it's needed atm as Inngest sync function doesn't parse frontmatter, and so it uploads to R2
  // and creates a basic Blob record for every single file (parsing is done later in Cloudflare Queues, but not worth removing them there at least for no)
  if (metadata?.publish === false) {
    notFound();
  }

  const siteConfig = await api.site.getConfig
    .query({
      siteId: site.id,
    })
    .catch(() => null);

  const title =
    siteConfig?.title && metadata?.title
      ? `${metadata?.title} - ${siteConfig.title}`
      : (metadata?.title ?? siteConfig?.title ?? projectName);
  const description = metadata?.description ?? siteConfig?.description;
  const url = `${siteUrl}/${decodedSlug !== '/' ? decodedSlug : ''}`;

  let imageUrl: string | null = config.thumbnail;
  let faviconUrl: string = config.favicon;

  if (isFeatureEnabled(Feature.NoBranding, site)) {
    imageUrl = metadata?.image || siteConfig?.image || null;
    if (siteConfig?.favicon) {
      if (isEmoji(siteConfig.favicon)) {
        faviconUrl = `data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>${siteConfig.favicon}</text></svg>`;
      } else {
        faviconUrl = siteConfig.favicon;
      }
    }
  }

  return {
    title,
    description,
    icons: faviconUrl ? [{ url: faviconUrl }] : undefined,
    openGraph: {
      title,
      description,
      type: 'website',
      url,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: 'Thumbnail',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: 'Thumbnail',
        },
      ],
      creator: '@flowershowapp',
    },
    // Set canonical URL to custom domain if it exists
    // Maybe not needed since we redirect to a custom domain if it exists ?
    alternates: {
      canonical: url,
    },
    // metadataBase: new URL(siteUrl),
  };
}

export default async function SitePage(props: {
  params: Promise<RouteParams>;
}) {
  const params = await props.params;
  const projectName = decodeURIComponent(params.project);
  const userName = decodeURIComponent(params.user);
  const slug = params.slug ? params.slug.join('/') : '/';
  const decodedSlug = slug.replace(/%20/g, '+');

  const site = await getSite(userName, projectName);
  const sitePrefix = getSiteUrlPath(site);

  const siteConfig = await api.site.getConfig
    .query({
      siteId: site.id,
    })
    .catch(() => null);

  // Handle redirects if configured
  if (siteConfig?.redirects) {
    for (const r of siteConfig.redirects) {
      // Simple string comparison for exact path matching
      if ('/' + decodedSlug === r.from) {
        const redirectUrl = site.customDomain
          ? r.to
          : `${resolveSiteAlias(
              `/@${site.user?.username}/${site.projectName}`,
              'to',
            )}${r.to}`;

        return r.permanent
          ? permanentRedirect(redirectUrl)
          : redirect(redirectUrl);
      }
    }
  }

  const siteFilePaths = await api.site.getAllBlobPaths
    .query({
      siteId: site.id,
    })
    .catch(() => {
      notFound();
    });

  const permalinksMapping = await api.site.getPermalinksMapping
    .query({
      siteId: site.id,
    })
    .catch(() => ({}));

  const blob = await api.site.getBlob
    .query({
      siteId: site.id,
      slug: decodedSlug,
    })
    .catch(() => {
      notFound();
    });

  // Handle Obsidian permalink redirects
  if (blob?.permalink) {
    // If current path doesn't match the permalink, redirect to permalink
    if (decodedSlug !== blob.permalink) {
      const redirectUrl = site.customDomain
        ? blob.permalink
        : `${sitePrefix}/${blob.permalink}`;

      return permanentRedirect(redirectUrl);
    }
  }

  const pageContent = await api.site.getBlobContent.query({
    id: blob.id,
  });

  const metadata = blob.metadata as PageMetadata | null; // TODO types

  let compiledContent: React.JSX.Element;

  const isMarkdown = blob.path.endsWith('.md');
  const isMdx = blob.path.endsWith('.mdx');
  const renderMode = metadata?.syntaxMode ?? site.syntaxMode;

  if (!isMarkdown && !isMdx) {
    compiledContent = (
      <ErrorMessage title="Error" message="Unsupported file type" />
    );
  } else {
    try {
      // Determine whether to use MD or MDX rendering based on config and file extension
      const useMdRendering =
        renderMode === 'md' || (renderMode === 'auto' && isMarkdown);

      if (useMdRendering) {
        const preprocessedContent = pageContent
          ? preprocessMdxForgiving(pageContent)
          : '';

        // Process using unified (MD renderer)
        const result = await processMarkdown(preprocessedContent ?? '', {
          files: siteFilePaths,
          filePath: blob.path,
          sitePrefix,
          customDomain: site.customDomain ?? undefined,
          siteId: site.id,
          rootDir: site.rootDir ?? undefined,
          permalinks: permalinksMapping,
        });
        compiledContent = result;
      } else {
        // Process using next-mdx-remote-client (MDX renderer)
        const mdxOptions = getMdxOptions({
          files: siteFilePaths,
          filePath: blob.path,
          sitePrefix,
          customDomain: site.customDomain ?? undefined,
          siteId: site.id,
          rootDir: site.rootDir ?? undefined,
          permalinks: permalinksMapping,
        }) as any;

        const mdxSource = await serialize<PageMetadata>({
          source: pageContent ?? '',
          options: mdxOptions,
        });

        if ('error' in mdxSource) {
          const message = mdxSource.error.message.concat(
            '\n\n🧑‍🔧 See how to debug and solve most common MDX errors in our docs:\nhttps://flowershow.app/docs/debug-mdx-errors',
          );
          compiledContent = (
            <ErrorMessage title="Error parsing MDX" message={message} />
          );
        } else {
          compiledContent = (
            <MDXClient mdxSource={mdxSource} blob={blob} site={site} />
          );
        }
      }
    } catch (error: any) {
      compiledContent = <ErrorMessage title="Error" message={error.message} />;
    }
  }

  const scopedCss = await generateScopedCss(pageContent ?? '', '#mdxpage');

  if (metadata?.layout === 'plain') {
    return (
      <>
        <style
          id="unocss-mdx"
          dangerouslySetInnerHTML={{
            __html: scopedCss.css,
          }}
        />
        <UrlNormalizer />
        <div className="rendered-mdx is-plain" id="mdxpage">
          {compiledContent}
        </div>
      </>
    );
  }

  const authors = metadata?.authors
    ? await api.site.getAuthors.query({
        siteId: site.id,
        authors: metadata.authors,
      })
    : undefined;

  const showEditLink = metadata?.showEditLink ?? siteConfig?.showEditLink;
  const showPageComments =
    site.enableComments &&
    (metadata?.showComments ?? siteConfig?.showComments ?? site.enableComments);
  const giscusConfig = siteConfig?.giscus;
  const showSidebar = metadata?.showSidebar ?? siteConfig?.showSidebar ?? false;
  const showToc = metadata?.showToc ?? siteConfig?.showToc ?? true;
  const heroConfig = resolveHeroConfig(metadata, siteConfig);
  const showHero = heroConfig.showHero;

  let siteTree;

  // TODO this should be part off the project layout so that it's not computed for each page
  if (showSidebar) {
    siteTree = await api.site.getSiteTree
      .query({
        siteId: site.id,
        orderBy: siteConfig?.sidebar?.orderBy,
      })
      .catch(() => []);
  }

  return (
    <>
      {/* it should be in the head */}
      <style
        id="unocss-mdx"
        dangerouslySetInnerHTML={{
          __html: scopedCss.css,
        }}
      />
      <UrlNormalizer />

      {showHero && (
        <Hero
          siteId={site.id}
          title={heroConfig.title}
          description={heroConfig.description}
          image={heroConfig.image}
          cta={heroConfig.cta}
          imageLayout={heroConfig.imageLayout}
        />
      )}

      <div
        className={clsx(
          'layout-inner',
          showSidebar && showToc && 'has-sidebar-and-toc',
          !showSidebar && showToc && 'has-toc',
          showSidebar && !showToc && 'has-sidebar',
        )}
      >
        {showSidebar && (
          <div className="layout-inner-left">
            <aside className="site-sidebar">
              <SiteTree items={siteTree} />
            </aside>
          </div>
        )}

        <div className="layout-inner-center">
          <main className="page-main">
            <BlogLayout
              title={metadata?.title ?? ''}
              description={metadata?.description ?? ''}
              date={metadata?.date}
              showHero={heroConfig.showHero}
              authors={authors}
              image={metadata?.image}
            >
              <div className="rendered-mdx" id="mdxpage">
                {compiledContent}
              </div>
            </BlogLayout>
          </main>

          {showEditLink && (
            <div className="page-edit-button-container">
              <Link
                href={`https://github.com/${site?.ghRepository}/edit/${site?.ghBranch}/${blob.path}`}
                className="page-edit-button"
                target="_blank"
              >
                Edit this page <EditIcon width={16} />
              </Link>
            </div>
          )}
          {showPageComments && (
            <div className="page-comments-container">
              <Comments
                {...giscusConfig}
                repo={
                  giscusConfig?.repo ??
                  (site.ghRepository as GiscusProps['repo'])
                }
                repoId={giscusConfig?.repoId ?? site.giscusRepoId ?? undefined}
                categoryId={
                  giscusConfig?.categoryId ?? site.giscusCategoryId ?? undefined
                }
              />
            </div>
          )}
        </div>

        {showToc && (
          <div className="layout-inner-right">
            <aside className="page-toc-container">
              <TableOfContents />
            </aside>
          </div>
        )}
      </div>
    </>
  );
}

const regex = emojiRegex();

function isEmoji(str: string) {
  const match = str.match(regex);
  return match !== null && match[0] === str;
}
