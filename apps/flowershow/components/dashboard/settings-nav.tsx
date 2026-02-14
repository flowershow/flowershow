import Link from 'next/link';

const navItems = [
  { name: 'Name', href: '#projectName' },
  { name: 'Markdown or MDX', href: '#syntaxMode' },
  { name: 'GitHub Integration', href: '#ghIntegration' },
  { name: 'Auto-Sync', href: '#autoSync', requiresGhRepository: true },
  { name: 'Comments', href: '#enableComments' },
  { name: 'Custom Domain', href: '#customDomain' },
  { name: 'Full-Text Search', href: '#enableSearch' },
  { name: 'Password Protection', href: '#passwordProtection' },
  { name: 'Billing', href: '#billing' },
  { name: 'Delete Site', href: '#deleteSite' },
];

interface SettingsNavProps {
  hasGhRepository?: boolean;
}

export default function SettingsNav({ hasGhRepository }: SettingsNavProps) {
  const filteredNavItems = navItems.filter(
    (item) => !item.requiresGhRepository || hasGhRepository,
  );

  return (
    <ul className="border-primary-silent space-y-2 rounded-md border px-4 py-5">
      {filteredNavItems.map((item) => (
        <li className="w-full" key={item.name}>
          <Link
            href={item.href}
            className="block rounded-md px-2 py-2 text-sm font-medium transition-colors hover:bg-primary-faint/70"
          >
            {item.name}
          </Link>
        </li>
      ))}
    </ul>
  );
}
