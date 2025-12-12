import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Vega } from '@/components/public/mdx/vega';

const meta: Meta<typeof Vega> = {
  title: 'Charts/Vega',
  component: Vega,
  argTypes: {
    data: {
      description:
        "Vega's `data` prop. You can find references on how to use this prop at https://vega.github.io/vega/docs/data/",
    },
    spec: {
      description:
        "Vega's `spec` prop. You can find references on how to use this prop at https://vega.github.io/vega/docs/specification/",
    },
  },
};

export default meta;

type Story = StoryObj<any>;

// More on writing stories with args: https://storybook.js.org/docs/react/writing-stories/args
export const Primary: Story = {
  name: 'Bar chart',
  args: {
    data: {
      values: [
        {
          y: -0.418,
          x: 1850,
        },
        {
          y: 0.923,
          x: 2020,
        },
      ],
    },
    spec: {
      $schema: 'https://vega.github.io/schema/vega-lite/v4.json',
      mark: 'bar',
      data: {
        name: 'table',
      },
      encoding: {
        x: {
          field: 'x',
          type: 'ordinal',
        },
        y: {
          field: 'y',
          type: 'quantitative',
        },
      },
    },
  },
};
