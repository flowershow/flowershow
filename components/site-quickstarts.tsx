import Link from "next/link";
import { redirect } from "next/navigation";
import { getConfig } from "@/lib/app-config";
import ObsidianIcon from "./icons/obsidian";
import { MarkdownIcon } from "./icons";

const config = getConfig();

export default async function Sites({ limit }: { limit?: number }) {
  const quickstarts =
    config.product === "flowershow"
      ? [
          {
            title: "Publish your Obsidian vault",
            href: "/obsidian-quickstart",
            icon: ObsidianIcon,
          },
          {
            title: "Publish your markdown from GitHub",
            href: "/new",
            icon: MarkdownIcon,
          },
        ]
      : [
          {
            title: "Publish your markdown from GitHub",
            href: "/new",
            icon: MarkdownIcon,
          },
        ];

  return (
    <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {quickstarts.map((q) => (
        <Link
          key={q.href}
          className="relative block rounded-lg border-2 border-dashed border-gray-300 pb-10 text-center text-gray-500 hover:border-gray-400"
          href={q.href}
        >
          <div className="flex justify-center px-4 pb-4 pt-6">
            <q.icon className="h-5" />
          </div>
          <div className="absolute bottom-6 flex w-full justify-center px-4">
            <span className="text-sm font-semibold">{q.title}</span>
          </div>
        </Link>
      ))}
    </div>
  );
}
