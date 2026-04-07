'use client';

import { TerminalIcon, UploadIcon } from 'lucide-react';
import { useState } from 'react';

import { GithubIcon } from '../icons';
import ObsidianIcon from '@/components/icons/obsidian';
import CliPublishModal from './onboarding/cli-publish-modal';
import GitHubSyncModal from './onboarding/github-sync-modal';
import ImportFilesOnboardingModal from './onboarding/import-files-modal';
import ObsidianPublishModal from './onboarding/obsidian-publish-modal';
import TemplateModal, {
  templates,
  type TemplateId,
} from './onboarding/template-modal';

type ModalType = 'import' | 'github' | 'cli' | 'obsidian' | 'template' | null;

const options = [
  {
    id: 'import' as const,
    title: 'Import files',
    description: 'Drag and drop your markdown, HTML, and media files.',
    icon: UploadIcon,
  },
  {
    id: 'github' as const,
    title: 'Sync with GitHub',
    description: 'Publish your site directly from a GitHub repository.',
    icon: GithubIcon,
  },
  {
    id: 'cli' as const,
    title: 'Publish from CLI',
    description: 'Use the Flowershow CLI to publish from your terminal.',
    icon: TerminalIcon,
  },
  {
    id: 'obsidian' as const,
    title: 'Publish from Obsidian',
    description: 'Use the Flowershow plugin to publish your vault.',
    icon: ({ className }: { className?: string }) => (
      <ObsidianIcon className={className} fill="#8b1bd5" />
    ),
  },
];

interface WelcomeContentProps {
  siteId: string;
  siteName: string;
  siteUrl: string;
}

export default function WelcomeContent({
  siteId,
  siteName,
  siteUrl,
}: WelcomeContentProps) {
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateId>('blog');

  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center py-12 text-center">
      <h1 className="font-dashboard-heading text-3xl">
        Welcome to {siteName} 🎉
      </h1>
      <p className="mt-3 text-stone-500">Pick how you want to get started</p>

      <div className="mt-10 w-full space-y-6">
        <div>
          <h2 className="text-left text-sm font-medium text-stone-700">
            Start from a Template
          </h2>
          <div className="mt-2 grid w-full grid-cols-1 gap-3 sm:grid-cols-3">
            {templates.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setSelectedTemplate(t.id);
                  setActiveModal('template');
                }}
                className="flex flex-col items-center rounded-lg border border-stone-200 p-6 text-center transition-all hover:border-stone-400 hover:shadow-md"
              >
                <t.icon className="h-8 w-8 text-stone-600" />
                <h3 className="mt-3 text-sm font-semibold text-stone-900">
                  {t.title}
                </h3>
                <p className="mt-1 text-xs text-stone-500">{t.description}</p>
              </button>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-left text-sm font-medium text-stone-700">
            Or add your own content
          </h2>
          <div className="mt-2 grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
            {options.map((option) => (
              <button
                type="button"
                key={option.id}
                onClick={() => setActiveModal(option.id)}
                className="flex flex-col items-center rounded-lg border border-stone-200 p-6 text-center transition-all hover:border-stone-400 hover:shadow-md"
              >
                <option.icon className="h-8 w-8 text-stone-600" />
                <h3 className="mt-3 text-sm font-semibold text-stone-900">
                  {option.title}
                </h3>
                <p className="mt-1 text-xs text-stone-500">
                  {option.description}
                </p>
              </button>
            ))}
          </div>
        </div>
      </div>

      <ImportFilesOnboardingModal
        siteId={siteId}
        siteUrl={siteUrl}
        showModal={activeModal === 'import'}
        setShowModal={(show) => setActiveModal(show ? 'import' : null)}
      />
      <GitHubSyncModal
        siteId={siteId}
        showModal={activeModal === 'github'}
        setShowModal={(show) => setActiveModal(show ? 'github' : null)}
      />
      <CliPublishModal
        siteId={siteId}
        siteName={siteName}
        siteUrl={siteUrl}
        showModal={activeModal === 'cli'}
        setShowModal={(show) => setActiveModal(show ? 'cli' : null)}
      />
      <ObsidianPublishModal
        siteId={siteId}
        siteName={siteName}
        siteUrl={siteUrl}
        showModal={activeModal === 'obsidian'}
        setShowModal={(show) => setActiveModal(show ? 'obsidian' : null)}
      />
      <TemplateModal
        siteId={siteId}
        siteUrl={siteUrl}
        showModal={activeModal === 'template'}
        setShowModal={(show) => setActiveModal(show ? 'template' : null)}
        initialTemplate={selectedTemplate}
      />
    </div>
  );
}
