import { Button, Markdown } from '@react-email/components';
import { EmailLayout } from './components/email-layout';

const MB = 1_048_576;
const GB = 1_073_741_824;

/** "250 MB" / "1.5 GB". */
export function formatStorageSize(bytes: number): string {
  if (bytes >= GB) {
    return `${Number((bytes / GB).toFixed(1))} GB`;
  }
  return `${Math.round(bytes / MB)} MB`;
}

/**
 * Format used and limit so they never read as equal: if they round to the same
 * string, add a decimal, and if still equal round used up.
 */
export function formatStorageSizes(
  usedBytes: number,
  limitBytes: number,
): { used: string; limit: string } {
  const limit = formatStorageSize(limitBytes);
  let used = formatStorageSize(usedBytes);
  if (used !== limit) return { used, limit };
  const unit = limitBytes >= GB ? GB : MB;
  const label = limitBytes >= GB ? 'GB' : 'MB';
  const fixed = (n: number) => `${Number(n.toFixed(1))} ${label}`;
  used = fixed(usedBytes / unit);
  if (used === limit) used = fixed(Math.ceil((usedBytes / unit) * 10) / 10);
  return { used, limit };
}

export interface StorageOverLimitEmailProps {
  /** Site has its own grandfathered allowance (site scope only). */
  grandfathered?: boolean;
  userName?: string;
  siteName?: string;
  /** 'site': one site is over its limit. 'pool': the Free sites together are. */
  scope: 'site' | 'pool';
  isPremium: boolean;
  usedBytes: number;
  limitBytes: number;
  /** Button target. Not used for Premium, which has no button. */
  upgradeUrl?: string;
}

export function storageOverLimitSubject({
  scope,
  isPremium,
  siteName,
}: {
  scope: 'site' | 'pool';
  isPremium: boolean;
  siteName: string;
}): string {
  if (scope === 'pool')
    return 'Your Flowershow sites have grown past the Free plan';
  if (isPremium) return `${siteName} is using a lot of storage`;
  return `${siteName} has grown past the Free plan`;
}

const paragraphStyles = {
  p: { fontSize: '16px', lineHeight: '26px', color: '#484848' },
  link: { color: '#000000', textDecoration: 'underline' },
} as const;

const buttonClass =
  'bg-black rounded-md text-white text-base text-center block py-3 px-6 my-6';

export function StorageOverLimitEmail({
  userName = 'there',
  siteName = 'your site',
  scope,
  isPremium,
  grandfathered = false,
  usedBytes,
  limitBytes,
  upgradeUrl,
}: StorageOverLimitEmailProps) {
  const { used, limit } = formatStorageSizes(usedBytes, limitBytes);
  const previewText = storageOverLimitSubject({ scope, isPremium, siteName });

  if (scope === 'pool') {
    return (
      <EmailLayout previewText={previewText}>
        <Markdown markdownCustomStyles={paragraphStyles}>
          {`Hi ${userName},

Together, your free sites are now using ${used} of storage, which is more than the ${limit} included for free sites on one account.

Nothing has changed for your sites. They're still online and you can keep publishing. We just wanted to let you know.

Upgrading your largest site to Premium takes it out of the shared total:`}
        </Markdown>
        {upgradeUrl && (
          <Button className={buttonClass} href={upgradeUrl}>
            See your sites
          </Button>
        )}
        <Markdown markdownCustomStyles={paragraphStyles}>
          {`If you'd like a hand working out what's taking up the space, just reply to this email.

— Ola & Rufus`}
        </Markdown>
      </EmailLayout>
    );
  }

  if (isPremium) {
    return (
      <EmailLayout previewText={previewText}>
        <Markdown markdownCustomStyles={paragraphStyles}>
          {`Hi ${userName},

Thanks for being on Premium. Your site **${siteName}** is now using ${used} of storage, which is more than the ${limit} we plan for on one site.

Nothing has changed for your site, and you don't need to do anything right now. We'd like to hear what you're building and make sure Flowershow works well at this size, so if you have a moment, just reply to this email.

— Ola & Rufus`}
        </Markdown>
      </EmailLayout>
    );
  }

  const showUpgrade = !(grandfathered && limitBytes >= 5 * GB);
  const limitPhrase = grandfathered
    ? `the ${limit} set aside for this site`
    : `the ${limit} included with the Free plan`;
  return (
    <EmailLayout previewText={previewText}>
      <Markdown markdownCustomStyles={paragraphStyles}>
        {`Hi ${userName},

Your site **${siteName}** is now using ${used} of storage, which is more than ${limitPhrase}.

Nothing has changed for your site. It's still online and you can keep publishing. We just wanted to let you know.${
          showUpgrade
            ? `

If the site is going to stay this size, Premium gives it 5 GB, along with a custom domain and full-text search:`
            : ''
        }`}
      </Markdown>
      {showUpgrade && upgradeUrl && (
        <Button className={buttonClass} href={upgradeUrl}>
          {`Upgrade ${siteName}`}
        </Button>
      )}
      <Markdown markdownCustomStyles={paragraphStyles}>
        {`If you didn't expect it to be this big, large images or videos are usually the reason. And if Flowershow isn't quite fitting what you need, just reply to this email and we'll help.

— Ola & Rufus`}
      </Markdown>
    </EmailLayout>
  );
}

export default StorageOverLimitEmail;
