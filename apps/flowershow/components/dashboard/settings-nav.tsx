'use client';

import { useEffect, useState } from 'react';

const navSections = [
  { name: 'General', id: 'general' },
  { name: 'Appearance', id: 'appearance' },
  { name: 'Navigation', id: 'navigation' },
  { name: 'Content', id: 'content' },
  { name: 'Features', id: 'features' },
  { name: 'Analytics', id: 'analytics' },
  { name: 'GitHub', id: 'github' },
  { name: 'Access & Domains', id: 'access' },
  { name: 'Billing', id: 'billing' },
  { name: 'Danger Zone', id: 'danger' },
];

interface SettingsNavProps {
  hasGhRepository?: boolean;
}

export default function SettingsNav({ hasGhRepository: _ }: SettingsNavProps) {
  const [activeSection, setActiveSection] = useState('general');

  useEffect(() => {
    const handleScroll = () => {
      const threshold = window.innerHeight * 0.25;
      let current = navSections[0]?.id ?? 'general';
      for (const { id } of navSections) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= threshold) {
          current = id;
        }
      }
      setActiveSection(current);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <ul className="border-primary-silent space-y-2 rounded-md border px-4 py-5">
      {navSections.map((section) => (
        <li className="w-full" key={section.id}>
          <a
            href={`#${section.id}`}
            className={`block rounded-md px-2 py-2 text-sm font-medium transition-colors hover:bg-primary-faint/70 ${activeSection === section.id ? 'bg-primary-faint/70' : ''}`}
          >
            {section.name}
          </a>
        </li>
      ))}
    </ul>
  );
}
