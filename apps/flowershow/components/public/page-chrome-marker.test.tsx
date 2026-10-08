import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { PageChromeMarker } from './page-chrome-marker';

afterEach(cleanup);

describe('PageChromeMarker', () => {
  it('renders nothing when nothing is hidden', () => {
    const { container } = render(
      <PageChromeMarker hideNavbar={false} hideFooter={false} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders a hidden marker flagging only the navbar', () => {
    const { container } = render(
      <PageChromeMarker hideNavbar hideFooter={false} />,
    );
    const marker = container.querySelector('[data-page-chrome]');
    expect(marker).toHaveAttribute('hidden');
    expect(marker).toHaveAttribute('data-hide-navbar');
    expect(marker).not.toHaveAttribute('data-hide-footer');
  });

  it('flags both when both are hidden', () => {
    const { container } = render(<PageChromeMarker hideNavbar hideFooter />);
    const marker = container.querySelector('[data-page-chrome]');
    expect(marker).toHaveAttribute('data-hide-navbar');
    expect(marker).toHaveAttribute('data-hide-footer');
  });
});
