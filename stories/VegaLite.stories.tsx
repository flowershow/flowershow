import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { VegaLite } from "@portaljs/components";
import "@portaljs/components/styles.css";

const meta: Meta<typeof VegaLite> = {
  title: "Charts/VegaLite",
  component: VegaLite,
  argTypes: {
    data: {
      description:
        "Data to be used by Vega Lite. See the Vega Lite docs: https://vega.github.io/vega-lite/docs/data.html.",
    },
    spec: {
      description:
        "Spec to be used by Vega Lite. See the Vega Lite docs: https://vega.github.io/vega-lite/docs/spec.html.",
    },
  },
};

export default meta;

type Story = StoryObj<any>;

// More on writing stories with args: https://storybook.js.org/docs/react/writing-stories/args
export const Primary: Story = {
  name: "Bar chart",
  args: {
    data: {
      table: [
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
      $schema: "https://vega.github.io/schema/vega-lite/v4.json",
      mark: "bar",
      data: {
        name: "table",
      },
      encoding: {
        x: {
          field: "x",
          type: "ordinal",
        },
        y: {
          field: "y",
          type: "quantitative",
        },
      },
    },
  },
};
