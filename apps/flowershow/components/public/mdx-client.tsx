'use client';

import dynamic from 'next/dynamic';

// prevent server-side pre-rendering of the MDX renderer
// as an extra safety measure against ACE
const MdxClient = dynamic(() => import('./mdx-client-renderer'), {
  ssr: false,
});

export default MdxClient;
