import { test as base } from '@playwright/test';

export const test = base.extend<{ basePath: string }>({
  basePath: ['', { option: true }],
});

export { expect, type Locator } from '@playwright/test';
