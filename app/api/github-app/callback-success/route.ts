import { NextResponse } from 'next/server';
import { env } from '@/env.mjs';

const isSecure =
  env.NEXT_PUBLIC_VERCEL_ENV === 'production' ||
  env.NEXT_PUBLIC_VERCEL_ENV === 'preview';
const protocol = isSecure ? 'https' : 'http';

/**
 * GitHub App installation success page
 * This page handles both popup and regular window scenarios
 * GET /api/github-app/callback-success
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const setupAction = searchParams.get('setup_action') || 'install';

  // Return an HTML page that detects if it's in a popup and acts accordingly
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>GitHub Connected</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }
    .container {
      text-align: center;
      padding: 2rem;
    }
    .icon {
      font-size: 4rem;
      margin-bottom: 1rem;
      animation: checkmark 0.5s ease-in-out;
    }
    @keyframes checkmark {
      0% { transform: scale(0); }
      50% { transform: scale(1.2); }
      100% { transform: scale(1); }
    }
    h1 {
      font-size: 2rem;
      margin: 0 0 0.5rem 0;
      font-weight: 600;
    }
    p {
      font-size: 1.125rem;
      margin: 0;
      opacity: 0.9;
    }
    .spinner {
      display: inline-block;
      width: 20px;
      height: 20px;
      border: 3px solid rgba(255,255,255,.3);
      border-radius: 50%;
      border-top-color: white;
      animation: spin 1s ease-in-out infinite;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">✓</div>
    <h1>GitHub Connected!</h1>
    <p>Your repositories are now accessible. <span class="spinner"></span></p>
  </div>
  <script>
    (function() {
      const setupAction = '${setupAction}';
      
      // Check if opened in a popup window
      if (window.opener && !window.opener.closed) {
        try {
          // Notify parent window with the full origin
          window.opener.postMessage(
            { type: 'github-app-installed', setupAction },
            '${protocol}://${env.NEXT_PUBLIC_CLOUD_DOMAIN}'
          );
          
          // Close popup after a short delay to show success message
          setTimeout(() => {
            window.close();
          }, 1000);
        } catch (error) {
          console.error('Failed to notify parent window:', error);
          // Fallback: redirect if can't close
          setTimeout(() => {
            window.location.href = setupAction === 'update' 
              ? '/settings/github'
              : '/new';
          }, 1500);
        }
      } else {
        // Not in popup, redirect normally
        setTimeout(() => {
          window.location.href = setupAction === 'update'
            ? '/settings/github'
            : '/new';
        }, 1500);
      }
    })();
  </script>
</body>
</html>
  `;

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html',
    },
  });
}
