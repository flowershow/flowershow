import Link from 'next/link';
import FileUploadCard from '@/components/dashboard/file-upload-card';
import { MarkdownIcon } from '@/components/icons';
import ObsidianIcon from '@/components/icons/obsidian';

export default async function Sites({ limit }: { limit?: number }) {
  const quickstarts = [
    {
      title: 'Publish Hello World Site',
      description:
        "If you want to quickly try it out or if you're starting from scratch.",
      href: '/hello-world',
      icon: () => <span className="text-xl">👋</span>,
    },
    {
      title: 'Publish your markdown from GitHub',
      description:
        'If you already have existing markdown documentation, blogs, wikis etc. stored in a GitHub repository.',
      href: '/new',
      icon: MarkdownIcon,
    },
    {
      title: 'Publish your Obsidian vault',
      description:
        'If want to publically share your Obsidian notes while maintaining your existing note-taking workflow.',
      href: '/obsidian-quickstart',
      icon: ObsidianIcon,
    },
  ];

  return (
    <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <FileUploadCard />
      {quickstarts.map((q) => (
        <Link
          key={q.href}
          className="relative block rounded-lg border-2 border-dashed border-gray-300 p-6 text-center text-gray-500 hover:border-gray-400"
          href={q.href}
        >
          <div className="flex justify-center pb-4">
            <q.icon className="h-5" />
          </div>
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-gray-900">{q.title}</h3>
            <p className="text-xs leading-relaxed text-gray-600">
              {q.description}
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}
