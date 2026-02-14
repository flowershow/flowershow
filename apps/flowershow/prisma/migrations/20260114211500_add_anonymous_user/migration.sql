-- CreateAnonymousUser
-- Insert a special anonymous user with a well-known ID
INSERT INTO "User" (
  id,
  username,
  name,
  role,
  created_at,
  updated_at
) VALUES (
  'anon000000000000000000000000',
  'anonymous',
  'Anonymous User',
  'USER',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;
