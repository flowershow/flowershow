import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Iframe, IframeProps } from "@portaljs/components";
import "@portaljs/components/styles.css";

const meta: Meta<typeof Iframe> = {
  title: "Other/Iframe",
  component: Iframe,
  argTypes: {
    data: {
      description:
        "Object with a `url` property pointing to the page to be embeded.",
    },
    style: {
      description:
        'Style object of the component. See example at https://react.dev/learn#displaying-data. Defaults to `{ width: "100%", height: "100%" }`',
    },
  },
};

export default meta;

type Story = StoryObj<IframeProps>;

export const Normal: Story = {
  name: "Iframe",
  args: {
    data: {
      url: "https://flowershow.app",
    },
    style: { width: `100%`, height: `600px` },
  },
};
