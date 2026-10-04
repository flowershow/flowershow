/* Satori (next/og) layout: inline styles only, every multi-child div is flex. */

export const ACCENT = '#EA580C';

export interface SocialCardProps {
  siteName: string;
  logoSrc: string | null; // data URI, or null → monogram
  title: string;
  description: string | null;
  displayUrl: string;
  showMark: boolean;
  markSrc: string; // data URI
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

export function titleFontSize(title: string): 76 | 64 | 54 {
  const n = Array.from(title).length;
  return n > 70 ? 54 : n > 40 ? 64 : 76;
}

function Monogram({ siteName }: { siteName: string }) {
  const glyph = Array.from(siteName.trim())[0]?.toUpperCase() ?? '•';
  return (
    <div
      style={{
        display: 'flex',
        width: 52,
        height: 52,
        borderRadius: 10,
        background: ACCENT,
        color: '#fff',
        fontSize: 28,
        fontWeight: 600,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {glyph}
    </div>
  );
}

export function SocialCard(p: SocialCardProps) {
  const title = clampText(p.title, 110);
  return (
    <div
      style={{
        display: 'flex',
        width: 1200,
        height: 630,
        background: '#FAFAF7',
        fontFamily: 'Inter',
      }}
    >
      <div
        style={{ display: 'flex', width: 14, height: 630, background: ACCENT }}
      />
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '64px 72px',
          flex: 1,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 18,
            fontSize: 30,
            fontWeight: 600,
            color: '#374151',
          }}
        >
          {p.logoSrc ? (
            <img
              src={p.logoSrc}
              width={52}
              height={52}
              style={{ borderRadius: 8, objectFit: 'contain' }}
            />
          ) : (
            <Monogram siteName={p.siteName} />
          )}
          <div style={{ display: 'flex' }}>{clampText(p.siteName, 50)}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          <div
            style={{
              display: 'flex',
              fontFamily: 'Source Serif 4',
              fontWeight: 600,
              fontSize: titleFontSize(title),
              lineHeight: 1.1,
              color: '#111827',
            }}
          >
            {title}
          </div>
          {p.description ? (
            <div
              style={{
                display: 'flex',
                fontSize: 28,
                lineHeight: 1.4,
                color: '#4B5563',
              }}
            >
              {clampText(p.description, 150)}
            </div>
          ) : null}
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: 22,
            color: '#9CA3AF',
          }}
        >
          <div style={{ display: 'flex' }}>{p.displayUrl}</div>
          {p.showMark ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                color: '#6B7280',
              }}
            >
              <img src={p.markSrc} width={30} height={30} />
              <div style={{ display: 'flex' }}>Flowershow</div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
