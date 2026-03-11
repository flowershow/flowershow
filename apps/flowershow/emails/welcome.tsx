import { Button, Markdown } from '@react-email/components';
import { EmailLayout } from './components/email-layout';

interface WelcomeEmailProps {
  userName: string;
  createSiteUrl: string;
}

export function WelcomeEmail({ userName = 'there' }: WelcomeEmailProps) {
  return (
    <EmailLayout previewText="Turn your Markdown into a live site in minutes">
      <Markdown
        markdownCustomStyles={{
          h1: {
            fontSize: '24px',
            fontWeight: 'bold',
            color: '#1a1a1a',
            margin: '0 0 16px',
          },
          h2: {
            fontSize: '16px',
            fontWeight: 'bold',
            color: '#1a1a1a',
            margin: '16px 0 4px',
          },
          p: { fontSize: '16px', lineHeight: '26px', color: '#484848' },
          li: { fontSize: '16px', lineHeight: '24px', color: '#484848' },
          link: { color: '#067df7', textDecoration: 'underline' },
        }}
      >
        {`# Welcome to Flowershow!

Hi ${userName} 👋

You signed up — now let's get your first site live!

## Choose the path that works best for you:

- [From a GitHub repository](https://flowershow.app/blog/how-to-publish-repository-with-markdown) if your Markdown content already lives in a GitHub repo.
- [From an Obsidian vault](https://flowershow.app/blog/how-to-publish-vault-quickly-and-easily) use our Obsidian plugin to publish directly from your vault.
- [From the command line](https://flowershow.app/publish) if you prefer using a CLI tool to publish Markdown from your local machine (or to automate it).
- [Drag and Drop](https://flowershow.app/dragndrop) if you want to quickly publish a few Markdown files without any setup.

## Helpful links to get you started:

- [Join our Discord community](https://discord.gg/JChzM5VdFn) to connect with other Flowershow users, ask questions, and share your sites.
- [Documentation](https://flowershow.app/docs) for detailed guides on all publishing methods, plus tips on how to customize your site and make the most of Flowershow.
- [Blog](https://flowershow.app/blog) for updates, tutorials, and inspiration from the Flowershow team and community.

— The Flowershow team`}
      </Markdown>
    </EmailLayout>
  );
}

export default WelcomeEmail;
