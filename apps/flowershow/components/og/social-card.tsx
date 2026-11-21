/* Satori (next/og) layout: inline styles only, every multi-child div is flex. */

export const ACCENT = '#EA580C';
export const PAPER = '#FAF8F3';
const INK = '#16130F';
const WORDMARK = '#2B2721';
const FAINT = '#8A8478';
const RULE = '#CFC9BD';

const W = 1200;
const H = 630;
const PICTURE_WIDTH = 520;

export interface SocialCardProps {
  siteName: string;
  logoSrc: string | null; // data URI, or null → monogram
  title: string;
  section: string | null; // label above the title
  domain: string;
  showMark: boolean;
  markSrc: string; // data URI
  pictureSrc: string | null; // data URI (cropped to the column) → card A; null → card C
}

export function clampText(s: string, max: number): string {
  const chars = Array.from(s);
  return chars.length <= max
    ? s
    : `${chars
        .slice(0, max - 1)
        .join('')
        .trimEnd()}…`;
}

// CJK, fullwidth forms and emoji take about twice the width of a Latin letter.
const WIDE_RE =
  /[ᄀ-ᅟ⺀-꓏가-힣豈-﫿︰-﹏＀-｠￠-￦\u{1F300}-\u{1FAFF}\u{20000}-\u{3FFFD}]/u;
const units = (c: string) => (WIDE_RE.test(c) ? 2 : 1);

/** Title length in Latin-letter widths. */
export function titleUnits(title: string): number {
  return Array.from(title).reduce((n, c) => n + units(c), 0);
}

/** Clamps a title to `max` Latin-letter widths, so wide scripts can't overflow the card. */
export function clampTitle(title: string, max = 84): string {
  if (titleUnits(title) <= max) return title;
  let n = 1; // the ellipsis
  let out = '';
  for (const c of Array.from(title)) {
    if (n + units(c) > max) break;
    n += units(c);
    out += c;
  }
  return `${out.trimEnd()}…`;
}

/** Steps down so a title fits three lines in its column. */
export function titleFontSize(title: string): 72 | 60 | 50 {
  const n = titleUnits(title);
  return n > 55 ? 50 : n > 28 ? 60 : 72;
}

/**
 * Logo + site name: the one place the site is named, at the foot of both
 * cards. The name is left out when the title already is the site name (home
 * pages), unless there's no logo to show instead.
 */
function Wordmark(p: SocialCardProps) {
  const showName = !p.logoSrc || p.title !== p.siteName;
  if (p.logoSrc && !showName) {
    return (
      <img
        src={p.logoSrc}
        width={64}
        height={64}
        style={{ borderRadius: 10, objectFit: 'contain' }}
      />
    );
  }
  if (!p.logoSrc && p.title === p.siteName) return null;
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        fontSize: 26,
        fontWeight: 600,
        color: WORDMARK,
      }}
    >
      {p.logoSrc ? (
        <img
          src={p.logoSrc}
          width={44}
          height={44}
          style={{ borderRadius: 8, objectFit: 'contain' }}
        />
      ) : null}
      <div style={{ display: 'flex' }}>{clampText(p.siteName, 32)}</div>
    </div>
  );
}

function Domain(p: SocialCardProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        fontSize: 22,
        color: FAINT,
      }}
    >
      <div style={{ display: 'flex' }}>{clampText(p.domain, 40)}</div>
      {p.showMark ? <img src={p.markSrc} width={24} height={24} /> : null}
    </div>
  );
}

function Label({ section }: { section: string | null }) {
  return section ? (
    <div
      style={{
        display: 'flex',
        fontSize: 26,
        fontWeight: 600,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: ACCENT,
        marginBottom: 18,
      }}
    >
      {section}
    </div>
  ) : null;
}

function Title({ title, centred }: { title: string; centred?: boolean }) {
  return (
    <div
      style={{
        display: 'flex',
        fontFamily: 'Source Serif 4',
        fontWeight: 600,
        fontSize: titleFontSize(title) + (centred ? 8 : 0),
        lineHeight: 1.08,
        color: INK,
        ...(centred
          ? { maxWidth: 820, justifyContent: 'center', textAlign: 'center' }
          : {}),
      }}
    >
      {title}
    </div>
  );
}

/** Card A: the picture fills a column on the left; label, title and wordmark on paper. */
function PictureCard(p: SocialCardProps & { pictureSrc: string }) {
  const title = clampTitle(p.title);
  return (
    <div
      style={{
        display: 'flex',
        width: W,
        height: H,
        background: PAPER,
        fontFamily: 'Inter',
      }}
    >
      <img src={p.pictureSrc} width={PICTURE_WIDTH} height={H} />
      <div style={{ display: 'flex', width: 2, height: H, background: RULE }} />
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          flex: 1,
          padding: '56px 60px 44px',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            marginTop: 40,
            overflow: 'hidden',
            maxHeight: 400,
          }}
        >
          <Label section={p.section} />
          <Title title={title} />
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderTop: `2px solid ${RULE}`,
            paddingTop: 22,
          }}
        >
          <Wordmark {...p} />
          <Domain {...p} />
        </div>
      </div>
    </div>
  );
}

/** Card C: no picture; label, title and wordmark centred in a ruled frame (survives a square crop). */
function TextCard(p: SocialCardProps) {
  const title = clampTitle(p.title);
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: W,
        height: H,
        background: PAPER,
        fontFamily: 'Inter',
      }}
    >
      <div
        style={{
          display: 'flex',
          position: 'absolute',
          top: 32,
          left: 32,
          right: 32,
          bottom: 32,
          border: `2px solid ${RULE}`,
        }}
      />
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          overflow: 'hidden',
          maxHeight: 380,
        }}
      >
        <Label section={p.section} />
        <Title title={title} centred />
      </div>
      <div style={{ display: 'flex', marginTop: 40 }}>
        <Wordmark {...p} />
      </div>
      <div
        style={{
          display: 'flex',
          position: 'absolute',
          bottom: 52,
          left: 0,
          right: 0,
          justifyContent: 'center',
        }}
      >
        <Domain {...p} />
      </div>
    </div>
  );
}

export function SocialCard(p: SocialCardProps) {
  return p.pictureSrc ? (
    <PictureCard {...p} pictureSrc={p.pictureSrc} />
  ) : (
    <TextCard {...p} />
  );
}
