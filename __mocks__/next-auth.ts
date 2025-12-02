// Server-only in the app — stub for SB/browser
export async function getServerSession() {
  return null;
}
export default function NextAuth() {
  throw new Error("next-auth is server-only; mocked in Storybook.");
}
