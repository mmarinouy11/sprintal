ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS paddle_customer_id text,
  ADD COLUMN IF NOT EXISTS paddle_subscription_id text,
  ADD COLUMN IF NOT EXISTS paddle_subscription_status text,
  ADD COLUMN IF NOT EXISTS plan_period text CHECK (plan_period IN ('monthly', 'annual')),
  ADD COLUMN IF NOT EXISTS plan_expires_at timestamptz;
