import useSWR from 'swr';
import {
  DomainConfigResponse,
  DomainResponse,
  DomainVerificationStatusProps,
} from '@/lib/types';
import { fetcher } from '@/lib/utils';

export function useDomainStatus({ domain }: { domain: string }) {
  const { data, isValidating } = useSWR<{
    status: DomainVerificationStatusProps;
    domainJson: DomainResponse & { error: { code: string; message: string } };
    configJson?: DomainConfigResponse;
  }>(`/api/domain/${domain}/verify`, fetcher, {
    revalidateOnMount: true,
    refreshInterval: 5000,
    keepPreviousData: true,
  });

  return {
    status: data?.status,
    domainJson: data?.domainJson,
    configJson: data?.configJson,
    loading: isValidating,
  };
}
