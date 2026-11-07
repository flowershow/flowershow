import type { Annotation } from '@flowershow/api-contract';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import PageAnnotations from '@/components/public/annotations/page-annotations';

const TEXT = [
  'Every few years someone announces that the file is dead. Documents will live in apps, the argument goes, and nobody will think about where their words are actually stored.',
  'And yet the humble file keeps coming back. It is the one format every tool can read, every backup can copy, and every person can hand to someone else without asking permission.',
  'Plain text is also the native language of AI agents. When you ask an assistant to draft, edit or publish something, the most reliable thing it can hand back is a file.',
];

const hoursAgo = (h: number) => new Date(Date.now() - h * 3600e3).toISOString();

function comment(
  id: string,
  exact: string,
  note: string,
  authorName: string,
  extra: Partial<Annotation> = {},
): Annotation {
  const text = TEXT.join('');
  const start = text.indexOf(exact);
  return {
    id,
    siteId: 'site-1',
    path: 'README.md',
    pageUrl: null,
    selector: {
      exact,
      prefix: '',
      suffix: '',
      start,
      end: start + exact.length,
    },
    note,
    authorName,
    status: 'open',
    resolvedBy: null,
    pageEdited: false,
    createdAt: hoursAgo(26),
    replies: [],
    ...extra,
  };
}

const ANNOTATIONS: Annotation[] = [
  comment(
    'a1',
    'the humble file keeps coming back',
    'Love this line. Could you give one concrete example here?',
    'Maya',
    {
      replies: [
        {
          id: 'r1',
          note: 'Good idea, I added the shoebox of letters story in the next paragraph.',
          authorName: 'Rufus',
          byOwner: true,
          createdAt: hoursAgo(20),
        },
        {
          id: 'r2',
          note: 'Perfect, that works.',
          authorName: 'Maya',
          byOwner: false,
          createdAt: hoursAgo(3),
        },
      ],
    },
  ),
  comment(
    'a2',
    'the most reliable thing it can hand back is a file',
    'Is this still true for HTML output? Worth a sentence.',
    'Sam',
  ),
  comment(
    'a3',
    'every backup can copy',
    'Maybe say "every backup tool"?',
    'Priya',
    {
      status: 'resolved',
      resolvedBy: 'Priya',
      replies: [
        {
          id: 'r3',
          note: 'Changed to "every backup tool can copy".',
          authorName: 'Rufus',
          byOwner: true,
          createdAt: hoursAgo(5),
        },
      ],
    },
  ),
];

/** Answers the overlay's requests from fixtures, so the story needs no server. */
function mockFetch() {
  window.fetch = async (input: RequestInfo | URL) => {
    const url = String(input);
    const body = url.includes('/owner/me')
      ? { isOwner: false }
      : { annotations: ANNOTATIONS };
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };
}

const meta: Meta<typeof PageAnnotations> = {
  title: 'Annotations/PageAnnotations',
  component: PageAnnotations,
  parameters: { layout: 'fullscreen' },
  render: (args) => {
    mockFetch();
    return (
      <div style={{ fontFamily: 'Georgia, serif', color: '#525252' }}>
        <PageAnnotations {...args} />
        <main
          id="mdxpage"
          style={{ maxWidth: 640, margin: '3rem auto', lineHeight: 1.7 }}
        >
          {TEXT.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </main>
      </div>
    );
  },
};

export default meta;
type Story = StoryObj<typeof PageAnnotations>;

/** Click "Show comments" to see replies, the Author badge and a resolved thread. */
export const WithReplies: Story = {
  args: {
    siteId: 'site-1',
    pagePath: 'README.md',
    manageUrl: '#',
  },
};
