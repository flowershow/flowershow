import { frontmatterTags, tagFromHref } from '@flowershow/core';
import type { GiscusProps } from '@giscus/react';
import clsx from 'clsx';
import { CodeIcon, EditIcon } from 'lucide-react';
import Link from 'next/link';
import { notFound, permanentRedirect, redirect } from 'next/navigation';
import CanvasEnhancer from '@/components/public/canvas-enhancer';
import Comments from '@/components/public/comments';
import Hero from '@/components/public/hero';
import { BlogLayout } from '@/components/public/layouts/blog';
import { SidebarDesktop, SidebarMobileNav } from '@/components/public/sidebar';
import TableOfContents from '@/components/public/table-of-contents';
import { env } from '@/env.mjs';
import { getConfig } from '@/lib/app-config';
import type { Node } from '@/lib/build-site-tree';
import { Feature, isFeatureEnabled } from '@/lib/feature-flags';
import { generateScopedCss } from '@/lib/generate-scoped-css';
import { getSite } from '@/lib/get-site';
import { getSiteUrl } from '@/lib/get-site-url';
import { resolveHeroConfig } from '@/lib/hero-config';
import type { ImageDimensionsMap } from '@/lib/image-dimensions';
import { isEmoji } from '@/lib/is-emoji';
import { ChangelogEntryPage } from '@/components/public/changelog/changelog-entry-page';
import { ChangelogIndexPage } from '@/components/public/changelog/changelog-index-page';
import {
  TagIndexPage,
  TagListingPage,
} from '@/components/public/tags/tag-views';
import { isChangelogDirName, parsePageParam } from '@/lib/changelog';
import { resolveChangelogContext } from '@/lib/changelog-context';
import { hasVersionSections } from '@/lib/changelog-file';
import { renderPageContent } from '@/lib/render-page-content';
import { resolveSiteAlias } from '@/lib/resolve-site-alias';
import { buildPageTitle, resolveSiteName } from '@/lib/site-config';
import { ensureLeadingSlash, normalizeAuthors } from '@/lib/utils';
import type { PageMetadata } from '@/server/api/types';
import { api } from '@/trpc/server';
import BacklinksPanel from './_components/backlinks-panel';
import GraphMiniPanel from './_components/graph-view';
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
  const slug = params.slug ? '/' + params.slug.join('/') : '/';
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
      // README-less changelog folders render a generated index page
      if (isChangelogDirName(decodedSlug)) {
        return null;
      }
      // Virtual tag pages have no Blob — let them render their own metadata.
      if (decodedSlug === '/tags' || decodedSlug.startsWith('/tags/')) {
        return null;
      }
      notFound();
    });

  const metadata = blob?.metadata as PageMetadata | null;
  const isChangelogFallback = !blob && isChangelogDirName(decodedSlug);
  const isTagIndexRoute = !blob && decodedSlug === '/tags';
  const isTagListingRoute = !blob && decodedSlug.startsWith('/tags/');

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

  const siteName = resolveSiteName(siteConfig, site.projectName);
  const tagListingTitle = isTagListingRoute
    ? `#${tagFromHref(decodedSlug.slice('/tags/'.length))}`
    : undefined;
  const title = buildPageTitle(
    metadata?.title ??
      (isChangelogFallback
        ? 'Changelog'
        : isTagIndexRoute
          ? 'Tags'
          : tagListingTitle),
    siteName,
  );
  const description = metadata?.description ?? siteConfig?.description;
  const url = decodedSlug !== '/' ? `${siteUrl}${decodedSlug}` : `${siteUrl}/`;

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
    alternates: {
      canonical: url,
      ...(siteConfig?.enableRss && {
        types: {
          'application/rss+xml': `${siteUrl}/rss.xml`,
        },
      }),
    },
    // metadataBase: new URL(siteUrl),
  };
}

export default async function SitePage(props: {
  params: Promise<RouteParams>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await props.params;
  const projectName = decodeURIComponent(params.project);
  const userName = decodeURIComponent(params.user);
  const slug = params.slug ? '/' + params.slug.join('/') : '/';
  const decodedSlug = slug.replace(/%20/g, '+');

  const site = await getSite(userName, projectName);
  const siteHostname =
    site.customDomain ?? `${site.subdomain}.${env.NEXT_PUBLIC_SITE_DOMAIN}`;

  const siteConfig = await api.site.getConfig
    .query({
      siteId: site.id,
    })
    .catch(() => null);

  // Handle redirects if configured
  if (siteConfig?.redirects) {
    for (const r of siteConfig.redirects) {
      // Simple string comparison for exact path matching
      if (decodedSlug === ensureLeadingSlash(r.from)) {
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

  const imageDimensions = await api.site.getImageDimensionsMap
    .query({ siteId: site.id })
    .catch(() => ({}) as ImageDimensionsMap);

  const blob = await api.site.getBlob
    .query({
      siteId: site.id,
      slug: decodedSlug,
    })
    .catch(() => null);

  let changelog = await resolveChangelogContext({
    slug: decodedSlug,
    blob: blob
      ? { path: blob.path, metadata: blob.metadata as PageMetadata | null }
      : null,
    siteFilePaths,
    getFolderIndexMetadata: async (dir) => {
      const match = ['index.md', 'index.mdx', 'README.md', 'README.mdx']
        .map((f) => `${dir}/${f}`)
        .find((c) => siteFilePaths.some((p) => p.replace(/^\//, '') === c));
      if (!match) return null;
      const indexBlob = await api.site.getBlobByPath
        .query({ siteId: site.id, path: match })
        .catch(() => null);
      return (indexBlob?.metadata as PageMetadata | null) ?? null;
    },
  });
  const changelogPage =
    changelog?.kind === 'index'
      ? parsePageParam((await props.searchParams).page)
      : null;
  if (changelog?.kind === 'index' && changelogPage === null) {
    notFound();
  }

  // A changelog folder without a README/index still gets its timeline page
  if (!blob) {
    // Tag pages are virtual fallbacks rendered only when no Blob exists at the
    // path, so real user content at /tags or /tags/... always wins. Mirrors the
    // changelog virtual-page pattern. See ADR-0012.
    if (decodedSlug === '/tags') {
      return (
        <>
          <UrlNormalizer />
          <div className="layout-inner">
            <div className="layout-inner-center">
              <main className="page-main">
                <TagIndexPage siteId={site.id} />
              </main>
            </div>
          </div>
        </>
      );
    }
    if (decodedSlug.startsWith('/tags/')) {
      // The slug stays percent-encoded here (see decodedSlug above), but tags are
      // stored/matched by their decoded display value, so decode to round-trip
      // with tagToHref's encodeURIComponent. Matches generateMetadata's decode.
      const tag = tagFromHref(decodedSlug.slice('/tags/'.length));
      return (
        <>
          <UrlNormalizer />
          <div className="layout-inner">
            <div className="layout-inner-center">
              <main className="page-main">
                <TagListingPage siteId={site.id} tag={tag} />
              </main>
            </div>
          </div>
        </>
      );
    }

    if (changelog?.kind !== 'index') notFound();
    return (
      <>
        <UrlNormalizer />
        <div className="layout-inner">
          <div className="layout-inner-center">
            <main className="page-main">
              <ChangelogIndexPage
                site={site}
                dir={changelog.dir}
                page={changelogPage!}
                title="Changelog"
                renderMode={siteConfig?.syntaxMode}
                siteHostname={siteHostname}
                siteFilePaths={siteFilePaths}
                permalinksMapping={permalinksMapping}
                imageDimensions={imageDimensions}
              />
            </main>
          </div>
        </div>
      </>
    );
  }

  // Handle Obsidian permalink redirects
  if (blob?.permalink) {
    // If current path doesn't match the permalink, redirect to permalink
    if (decodedSlug !== blob.permalink) {
      const redirectUrl = blob.permalink;

      return permanentRedirect(redirectUrl);
    }
  }

  const pageContent = await api.site.getBlobContent.query({
    id: blob.id,
  });

  const metadata = blob.metadata as PageMetadata | null; // TODO types

  // A CHANGELOG.md with no version headings is just a normal page
  if (changelog?.kind === 'file' && !hasVersionSections(pageContent ?? '')) {
    changelog = null;
  }

  const isCanvas = blob.path.endsWith('.canvas');
  const isHtml = blob.path.endsWith('.html');
  const renderMode = metadata?.syntaxMode ?? siteConfig?.syntaxMode;

  if (isHtml) {
    redirect(`/${blob.path}`);
  }

  const compiledContent = await renderPageContent({
    blob,
    site,
    content: pageContent,
    renderMode,
    siteHostname,
    siteFilePaths,
    permalinksMapping,
    imageDimensions,
    changelog:
      changelog?.kind === 'file' ? { title: metadata?.title } : undefined,
  });

  const scopedCss = await generateScopedCss(pageContent ?? '', '#mdxpage');

  // Standalone canvas pages get a dedicated full-width layout: the site header
  // and footer (from the parent layout) stay, but the sidebar, ToC, and prose
  // max-width are dropped so the canvas fills the width of the page.
  if (isCanvas) {
    return (
      <>
        <style
          id="unocss-mdx"
          dangerouslySetInnerHTML={{
            __html: scopedCss.css,
          }}
        />
        <UrlNormalizer />
        <div className="canvas-fullwidth">
          <div className="rendered-mdx is-canvas" id="mdxpage">
            {compiledContent}
          </div>
        </div>
        <CanvasEnhancer />
      </>
    );
  }

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
        <CanvasEnhancer />
      </>
    );
  }

  // Frontmatter `authors` is user-controlled: it may be a scalar (`authors: Jane`)
  // or arbitrary YAML, while getAuthors requires string[]. Normalize before the
  // query so a scalar renders correctly and malformed values don't crash render.
  const normalizedAuthors = normalizeAuthors(metadata?.authors);
  const authors = normalizedAuthors.length
    ? await api.site.getAuthors.query({
        siteId: site.id,
        authors: normalizedAuthors,
      })
    : undefined;

  const showEditLink = metadata?.showEditLink ?? siteConfig?.showEditLink;
  const showRawLink = siteConfig?.showRawLink;
  const normalizedRootDir = site?.rootDir
    ? `${site.rootDir.replace(/^(.?\/)+|\/+$/g, '')}/`
    : '';
  const showPageComments = metadata?.showComments ?? siteConfig?.showComments;
  const showBacklinks = siteConfig?.showBacklinks ?? true;
  const giscusConfig = siteConfig?.giscus;
  const activeSidebarPath = (() => {
    const paths = siteConfig?.sidebar?.paths;
    if (!paths || paths.length === 0) return undefined;
    const pagePath = '/' + blob.path;
    return paths.find(
      (path) =>
        pagePath === path ||
        pagePath.startsWith(path.endsWith('/') ? path : path + '/'),
    );
  })();
  const showSidebar = (() => {
    const enabled = metadata?.showSidebar ?? siteConfig?.showSidebar;
    if (!enabled) return false;
    const paths = siteConfig?.sidebar?.paths;
    if (!paths || paths.length === 0) return true;
    return activeSidebarPath !== undefined;
  })();
  // A changelog timeline TOC would list every entry's subheadings, so it's off there
  const isChangelogTimeline =
    changelog?.kind === 'index' || changelog?.kind === 'file';
  const showToc =
    !isChangelogTimeline && (metadata?.showToc ?? siteConfig?.showToc);
  const showKnowledgeGraph =
    metadata?.showKnowledgeGraph ?? siteConfig?.showKnowledgeGraph ?? false;
  const showRightColumn = showToc || showKnowledgeGraph;
  const heroConfig = resolveHeroConfig(metadata, siteConfig);
  const showHero = heroConfig.showHero && !changelog;

  let siteTree: Node[] | undefined;

  // TODO this should be part off the project layout so that it's not computed for each page
  if (showSidebar) {
    siteTree = await api.site.getSiteTree
      .query({
        siteId: site.id,
        orderBy: siteConfig?.sidebar?.orderBy,
        paths: activeSidebarPath
          ? [activeSidebarPath]
          : siteConfig?.sidebar?.paths,
        contentHide: siteConfig?.contentHide,
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

      {showSidebar && <SidebarMobileNav items={siteTree!} prefix={''} />}

      {showHero && (
        <Hero
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
          showSidebar && showRightColumn && 'has-sidebar-and-toc',
          !showSidebar && showRightColumn && 'has-toc',
          showSidebar && !showRightColumn && 'has-sidebar',
        )}
      >
        {showSidebar && (
          <div className="layout-inner-left">
            <SidebarDesktop items={siteTree!} />
          </div>
        )}

        <div className="layout-inner-center">
          <main className="page-main">
            {changelog?.kind === 'index' ? (
              <>
                <ChangelogIndexPage
                  site={site}
                  dir={changelog.dir}
                  page={changelogPage!}
                  title={metadata?.title || 'Changelog'}
                  intro={
                    pageContent?.trim() ? (
                      <div id="mdxpage">{compiledContent}</div>
                    ) : undefined
                  }
                  renderMode={renderMode}
                  siteHostname={siteHostname}
                  siteFilePaths={siteFilePaths}
                  permalinksMapping={permalinksMapping}
                  imageDimensions={imageDimensions}
                />
                <CanvasEnhancer />
              </>
            ) : changelog?.kind === 'file' ? (
              // Not a page-level .rendered-mdx: prose styles would number and
              // indent the entry list. The plugin marks intro and bodies itself.
              <>
                <div id="mdxpage">{compiledContent}</div>
                <CanvasEnhancer />
              </>
            ) : changelog?.kind === 'entry' ? (
              <ChangelogEntryPage
                siteId={site.id}
                dir={changelog.dir}
                blobPath={blob.path}
                authors={authors}
              >
                <div id="mdxpage">{compiledContent}</div>
                <CanvasEnhancer />
              </ChangelogEntryPage>
            ) : (
              <BlogLayout
                title={metadata?.title ?? ''}
                description={metadata?.description ?? ''}
                date={metadata?.date}
                showHero={heroConfig.showHero}
                authors={authors}
                tags={frontmatterTags(
                  metadata as Record<string, unknown> | null,
                )}
              >
                <div className="rendered-mdx" id="mdxpage">
                  {compiledContent}
                </div>
                <CanvasEnhancer />
              </BlogLayout>
            )}
          </main>

          {(showEditLink || showRawLink) && (
            <div className="page-edit-button-container">
              {showEditLink && (
                <Link
                  href={`https://github.com/${site?.ghRepository}/edit/${site?.ghBranch}/${normalizedRootDir}${blob.path}`}
                  className="page-edit-button"
                  target="_blank"
                >
                  Edit this page <EditIcon width={16} />
                </Link>
              )}
              {showRawLink && (
                <Link
                  href={`/api/raw/${encodeURIComponent(userName)}/${encodeURIComponent(projectName)}/${blob.path}`}
                  className="page-edit-button"
                  target="_blank"
                >
                  View raw markdown <CodeIcon width={16} />
                </Link>
              )}
            </div>
          )}

          {showBacklinks && (
            <BacklinksPanel siteId={site.id} blobId={blob.id} />
          )}

          {showPageComments && (
            <div className="page-comments-container">
              <Comments
                {...giscusConfig}
                repo={
                  giscusConfig?.repo ??
                  (site.ghRepository as GiscusProps['repo'])
                }
                repoId={giscusConfig?.repoId ?? undefined}
                categoryId={giscusConfig?.categoryId ?? undefined}
              />
            </div>
          )}
        </div>

        {showRightColumn && (
          <div className="layout-inner-right">
            {showKnowledgeGraph && (
              <GraphMiniPanel siteId={site.id} currentBlobId={blob.id} />
            )}
            {showToc && (
              <aside className="page-toc-container">
                <TableOfContents />
              </aside>
            )}
          </div>
        )}
      </div>
    </>
  );
}
