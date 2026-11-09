import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AccountBilling, { type AccountPlanData } from './account-billing';

const refresh = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh }),
  useSearchParams: () => new URLSearchParams(),
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
  hasSiteSubscription: false,
  ...over,
});

const base: AccountPlanData = {
  enabled: true,
  plan: null,
  interval: null,
  status: null,
  cancelAtPeriodEnd: false,
  currentPeriodEnd: null,
  siteAllowance: null,
  creditBalanceCents: 0,
  prices,
  sites: [],
};

beforeEach(() => {
  coverOptions = {};
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('AccountBilling without a plan', () => {
  it('shows both cards with live prices, annual first', () => {
    render(<AccountBilling data={{ ...base, siteAllowance: 5 }} />);
    expect(
      screen.getByText('Pro: up to 5 sites on Premium'),
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

describe('AccountBilling with Pro', () => {
  const covered = ['a', 'b', 'c', 'd', 'e'].map((id) =>
    site(id, { plan: 'PREMIUM', planSource: 'ACCOUNT', covered: true }),
  );
  const pro: AccountPlanData = {
    ...base,
    plan: 'PRO',
    interval: 'year',
    status: 'active',
    siteAllowance: 5,
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

  it('labels a site with its own subscription', () => {
    render(<AccountBilling data={pro} />);
    expect(
      screen.getByText(
        'Own subscription; covering it cancels that subscription and credits the unused time',
      ),
    ).toBeInTheDocument();
  });

  it('calls setSiteCovered when toggled', () => {
    render(<AccountBilling data={pro} />);
    fireEvent.click(screen.getByRole('checkbox', { name: /Site a/ }));
    expect(coverMutate).toHaveBeenCalledWith({ siteId: 'a', covered: false });
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

describe('AccountBilling with Unlimited', () => {
  it('shows no toggles', () => {
    render(
      <AccountBilling
        data={{
          ...base,
          plan: 'UNLIMITED',
          interval: 'month',
          status: 'active',
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
