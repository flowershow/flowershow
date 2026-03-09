import { Link, Text } from '@react-email/components';
import { EmailLayout } from './components/email-layout';
import { heading, subheading, paragraph, list, link } from './styles';

interface WelcomeEmailProps {
  userName: string;
  createSiteUrl: string;
}

export function WelcomeEmail({
  userName = 'there',
  createSiteUrl = 'https://cloud.flowershow.app/',
}: WelcomeEmailProps) {
  return (
    <EmailLayout previewText="Turn your Markdown into a live site in minutes">
      <Text style={heading}>Welcome to Flowershow</Text>
      <Text style={paragraph}>Hi {userName} 👋</Text>
      <Text style={paragraph}>
        Flowershow helps you turn your Markdown content into a live site in
        minutes.
      </Text>
      <Text style={subheading}>To get started, create your first site:</Text>
      {/* <Button style={button} href={createSiteUrl}>
        Create your first site
      </Button> */}
      <Text style={list}>
        •{' '}
        <Link
          style={link}
          href="https://flowershow.app/blog/how-to-publish-repository-with-markdown"
        >
          From a GitHub repository
        </Link>
        : Publish Markdown in a GitHub repository
      </Text>
      <Text style={list}>
        •{' '}
        <Link
          style={link}
          href="https://flowershow.app/blog/how-to-publish-vault-quickly-and-easily"
        >
          From an Obsidian vault
        </Link>
        : Publish an Obsidian vault
      </Text>
      <Text style={list}>
        •{' '}
        <Link style={link} href="https://flowershow.app/docs/cli">
          From the command line
        </Link>
        : Publish from the command line
      </Text>
      <Text style={list}>
        •{' '}
        <Link style={link} href="https://flowershow.app/dragndrop">
          Paste or Drag and Drop
        </Link>
        : Publish by drag and drop or pasting Markdown
      </Text>
      <Text style={paragraph}>
        If you run into anything or have questions, join our Discord server,
        post in our subreddit or submit an issue on GitHub. We&apos;re here to
        help!
      </Text>
      <Text style={paragraph}>— The Flowershow team</Text>
    </EmailLayout>
  );
}

export default WelcomeEmail;
