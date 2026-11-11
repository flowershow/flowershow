import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AccountBilling, {
  type AccountPlanData,
  coverConfirmation,
} from './account-billing';

const refresh = vi.fn();
let searchParams = new URLSearchParams();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh }),
  useSearchParams: () => searchParams,
}));

const toastError = vi.fn();
vi.mock('sonner', () => ({
  toast: {
    error: (...args: unknown[]) => toastError(...args),
    success: vi.fn(),
  },
}));

const checkoutMutate = vi.fn();
const portalMutate = vi.fn();
const coverMutate = vi.fn();
let coverOptions: { onError?: (e: { message: string }) => void } = {};
vi.mock('@/trpc/react', () => ({
  api: {
    stripe: {
      createAccountCheckoutSession: {
        useMutation: () => ({ mutate: checkoutMutate }),
      },
      getAccountBillingPortal: {
        useMutation: () => ({ mutate: portalMutate }),
      },
      setSiteCovered: {
        useMutation: (opts: typeof coverOptions) => {
          coverOptions = opts;
          return { mutate: coverMutate };
        },
      },
    },
  },
}));

// Arbitrary test numbers; never asserted as product prices.
const prices = {
  PRO: {
    month: { amount: 111, currency: 'USD' },
    year: { amount: 222, currency: 'USD' },
  },
  UNLIMITED: {
    month: { amount: 333, currency: 'USD' },
    year: { amount: 444, currency: 'USD' },
  },
};

const site = (
  id: string,
  over: Partial<AccountPlanData['sites'][number]> = {},
): AccountPlanData['sites'][number] => ({
  id,
  projectName: `Site ${id}`,
  plan: 'FREE',
  planSource: null,
  covered: false,
  hasCustomDomain: false,
  hasSiteSubscription: false,
  ...over,
});

const base: AccountPlanData = {
  enabled: true,
  plan: null,
  interval: null,
  status: null,
  live: false,
  cancelAtPeriodEnd: false,
  currentPeriodEnd: null,
  siteAllowance: null,
  proSiteAllowance: 7,
  creditBalanceCents: 0,
  prices,
  sites: [],
};

beforeEach(() => {
  coverOptions = {};
  searchParams = new URLSearchParams();
  vi.spyOn(window, 'confirm').mockReturnValue(true);
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('AccountBilling without a plan', () => {
  it('shows both cards with live prices, annual first', () => {
    render(<AccountBilling data={base} />);
    expect(
      screen.getByText('Pro: up to 7 sites on Premium'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Unlimited: every site on Premium'),
    ).toBeInTheDocument();
    expect(screen.getAllByText('$222.00').length).toBeGreaterThan(0);
    expect(screen.getAllByText('$444.00').length).toBeGreaterThan(0);
    expect(screen.queryByText('$111.00')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: 'Monthly' }));
    expect(screen.getAllByText('$111.00').length).toBeGreaterThan(0);
  });

  it('starts yearly checkout for Pro', () => {
    render(<AccountBilling data={base} />);
    fireEvent.click(screen.getByRole('button', { name: 'Choose Pro' }));
    expect(checkoutMutate).toHaveBeenCalledWith({
      plan: 'PRO',
      interval: 'year',
    });
  });

  it('starts monthly checkout for Unlimited', () => {
    render(<AccountBilling data={base} />);
    fireEvent.click(screen.getByRole('radio', { name: 'Monthly' }));
    fireEvent.click(screen.getByRole('button', { name: 'Choose Unlimited' }));
    expect(checkoutMutate).toHaveBeenCalledWith({
      plan: 'UNLIMITED',
      interval: 'month',
    });
  });
});

describe('AccountBilling right after checkout', () => {
  it('shows activating, disables the buy buttons and refreshes until the plan lands', () => {
    vi.useFakeTimers();
    searchParams = new URLSearchParams('upgrade_success=true');
    render(<AccountBilling data={base} />);
    expect(screen.getByRole('status')).toHaveTextContent(
      'Payment received. Activating your plan…',
    );
    expect(screen.getByRole('button', { name: 'Choose Pro' })).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'Choose Unlimited' }),
    ).toBeDisabled();
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('stops refreshing after the cap and points to support, buttons still disabled', () => {
    vi.useFakeTimers();
    searchParams = new URLSearchParams('upgrade_success=true');
    render(<AccountBilling data={base} />);
    for (let i = 0; i < 20; i++) {
      act(() => {
        vi.advanceTimersByTime(2000);
      });
    }
    expect(refresh).toHaveBeenCalledTimes(15);
    expect(screen.getByRole('status')).toHaveTextContent(
      'support@flowershow.app',
    );
    expect(screen.getByRole('button', { name: 'Choose Pro' })).toBeDisabled();
  });

  it('shows nothing extra once the plan is live', () => {
    searchParams = new URLSearchParams('upgrade_success=true');
    render(
      <AccountBilling
        data={{
          ...base,
          plan: 'UNLIMITED',
          interval: 'year',
          status: 'active',
          live: true,
        }}
      />,
    );
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});

describe('coverConfirmation', () => {
  it('warns about the domain when uncovering a site that has one', () => {
    expect(
      coverConfirmation(
        site('a', { covered: true, hasCustomDomain: true }),
        false,
      ),
    ).toBe(
      'Remove Site a from your plan? It goes back to Free and its custom domain is removed. Covering it again will not restore the domain.',
    );
  });

  it('asks plainly when uncovering a site without a domain', () => {
    expect(coverConfirmation(site('a', { covered: true }), false)).toBe(
      'Remove Site a from your plan? It goes back to Free.',
    );
  });

  it('warns that covering cancels the site subscription', () => {
    expect(
      coverConfirmation(site('s', { hasSiteSubscription: true }), true),
    ).toBe(
      'Cover Site s with your plan? Its own subscription is cancelled now, and the unused time is credited to your account.',
    );
  });

  it('needs no confirmation to cover a plain Free site', () => {
    expect(coverConfirmation(site('f'), true)).toBeNull();
  });
});

describe('AccountBilling with Pro', () => {
  const covered = ['a', 'b', 'c', 'd', 'e'].map((id) =>
    site(id, { plan: 'PREMIUM', planSource: 'ACCOUNT', covered: true }),
  );
  const pro: AccountPlanData = {
    ...base,
    plan: 'PRO',
    interval: 'year',
    status: 'active',
    live: true,
    siteAllowance: 5,
    proSiteAllowance: 5,
    sites: [
      ...covered,
      site('f'),
      site('m', { plan: 'PREMIUM', planSource: 'MANUAL' }),
      site('s', {
        plan: 'PREMIUM',
        planSource: 'SITE',
        hasSiteSubscription: true,
      }),
    ],
  };

  it('shows the count and disables unchecked boxes at the limit', () => {
    render(<AccountBilling data={pro} />);
    expect(screen.getByText('Pro, 5 of 5 sites covered')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /Site f/ })).toBeDisabled();
    expect(screen.getByRole('checkbox', { name: /Site a/ })).toBeEnabled();
  });

  it('shows a MANUAL site checked and disabled', () => {
    render(<AccountBilling data={pro} />);
    const box = screen.getByRole('checkbox', { name: /Site m/ });
    expect(box).toBeChecked();
    expect(box).toBeDisabled();
    expect(screen.getByText('Premium (granted)')).toBeInTheDocument();
  });

  it('treats PREMIUM with a null source as manual: checked and disabled', () => {
    render(
      <AccountBilling
        data={{
          ...pro,
          sites: [
            ...pro.sites,
            site('n', { projectName: 'Null source', plan: 'PREMIUM' }),
          ],
        }}
      />,
    );
    const box = screen.getByRole('checkbox', { name: 'Null source' });
    expect(box).toBeChecked();
    expect(box).toBeDisabled();
  });

  it('labels a site with its own subscription', () => {
    render(<AccountBilling data={pro} />);
    expect(
      screen.getByText(
        'Own subscription; covering it cancels that subscription and credits the unused time',
      ),
    ).toBeInTheDocument();
  });

  it('calls setSiteCovered when the owner confirms', () => {
    render(<AccountBilling data={pro} />);
    fireEvent.click(screen.getByRole('checkbox', { name: /Site a/ }));
    expect(window.confirm).toHaveBeenCalledWith(
      'Remove Site a from your plan? It goes back to Free.',
    );
    expect(coverMutate).toHaveBeenCalledWith({ siteId: 'a', covered: false });
  });

  it('does nothing when the owner cancels the confirmation', () => {
    vi.mocked(window.confirm).mockReturnValue(false);
    render(<AccountBilling data={pro} />);
    fireEvent.click(screen.getByRole('checkbox', { name: /Site a/ }));
    expect(coverMutate).not.toHaveBeenCalled();
    expect(screen.getByRole('checkbox', { name: /Site a/ })).toBeChecked();
  });

  it('disables every checkbox while one change is saving', () => {
    render(<AccountBilling data={pro} />);
    fireEvent.click(screen.getByRole('checkbox', { name: /Site a/ }));
    expect(screen.getByRole('checkbox', { name: /Site b/ })).toBeDisabled();
  });

  it('surfaces the server error message', async () => {
    render(<AccountBilling data={pro} />);
    coverOptions.onError?.({
      message: 'All 5 sites on your Pro plan are in use.',
    });
    await waitFor(() =>
      expect(toastError).toHaveBeenCalledWith(
        'All 5 sites on your Pro plan are in use.',
      ),
    );
  });

  it('shows credit and end date, and opens the portal', () => {
    render(
      <AccountBilling
        data={{
          ...pro,
          creditBalanceCents: 1234,
          cancelAtPeriodEnd: true,
          currentPeriodEnd: new Date('2027-03-05T12:00:00Z'),
        }}
      />,
    );
    expect(screen.getByText(/Credit applied: \$12\.34/)).toBeInTheDocument();
    expect(screen.getByText(/Ends on March 5, 2027/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Manage billing' }));
    expect(portalMutate).toHaveBeenCalled();
  });
});

describe('AccountBilling with a lapsed plan', () => {
  it.each(['canceled', 'incomplete_expired'] as const)(
    'shows the buy cards and credit, no picker, for a %s plan',
    (status) => {
      render(
        <AccountBilling
          data={{
            ...base,
            plan: 'PRO',
            interval: 'year',
            status,
            live: false,
            siteAllowance: 5,
            creditBalanceCents: 1234,
            sites: [
              site('a', {
                plan: 'PREMIUM',
                planSource: 'ACCOUNT',
                covered: true,
              }),
            ],
          }}
        />,
      );
      expect(
        screen.getByRole('button', { name: 'Choose Pro' }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Choose Unlimited' }),
      ).toBeInTheDocument();
      expect(screen.getByText(/Credit applied: \$12\.34/)).toBeInTheDocument();
      expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
      expect(screen.queryByText(/sites covered/)).not.toBeInTheDocument();
    },
  );
});

describe('AccountBilling with Unlimited', () => {
  it('shows no toggles', () => {
    render(
      <AccountBilling
        data={{
          ...base,
          plan: 'UNLIMITED',
          interval: 'month',
          status: 'active',
          live: true,
          sites: [
            site('a', {
              plan: 'PREMIUM',
              planSource: 'ACCOUNT',
              covered: true,
            }),
          ],
        }}
      />,
    );
    expect(
      screen.getByText('Unlimited, 1 of all sites covered'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  });
});
