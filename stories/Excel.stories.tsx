import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Excel, ExcelProps } from "@portaljs/components";
import "@portaljs/components/styles.css";

const meta: Meta<typeof Excel> = {
  title: "Tabular/Excel",
  component: Excel,
  argTypes: {
    data: {
      description:
        "Data to be displayed. \n\n \
Must be an object with one of the following properties: `url`, `values` or `csv` \n\n \
`url`: local path (relative or absolute) pointing to a CSV file. \n\n \
`values`: array of objects. \n\n \
`csv`: raw csv string. \n\n \
",
    },
  },
};

export default meta;

type Story = StoryObj<ExcelProps>;

export const SingleSheet: Story = {
  name: "Excel file with just one sheet",
  args: {
    data: {
      url: "https://sheetjs.com/pres.xlsx",
    },
  },
};

export const MultipleSheet: Story = {
  name: "Excel file with multiple sheets",
  args: {
    data: {
      url: "https://storage.portaljs.org/IC-Gantt-Chart-Project-Template-8857.xlsx",
    },
  },
};
