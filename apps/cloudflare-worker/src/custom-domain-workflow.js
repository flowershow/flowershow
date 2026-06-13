import { WorkflowEntrypoint } from 'cloudflare:workers';

/**
 * Payload shape:
 * {
 *   email:  string
 *   name:   string | null
 *   domain: string
 *   siteId: string
 * }
 *
 * Waits 30 minutes for DNS propagation, then calls the Next.js internal
 * endpoint to check domain status and dispatch the appropriate email.
 */
export class CustomDomainWorkflow extends WorkflowEntrypoint {
  async run(event, step) {
    const { email, name, domain, siteId } = event.payload;

    await step.sleep('wait-for-dns-propagation', '30m');

    await step.do('check-and-notify', async () => {
      const url = `${this.env.NEXT_APP_URL}/api/internal/check-domain-and-notify`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.env.INTERNAL_API_SECRET}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, name, domain, siteId }),
      });
      if (!response.ok) {
        throw new Error(
          `check-domain-and-notify failed: ${response.status} ${response.statusText}`,
        );
      }
    });
  }
}
