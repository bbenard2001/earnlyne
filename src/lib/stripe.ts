import 'server-only';
import Stripe from 'stripe';

let client: Stripe | null = null;
export function stripe() {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY is not set');
  client ??= new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });
  return client;
}
export const siteUrl = () => (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');
