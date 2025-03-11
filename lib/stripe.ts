import { env } from "@/env.mjs";
import Stripe from "stripe";

export const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-12-18.acacia",
  typescript: true,
});

export type PlanType = "FREE" | "PREMIUM";

export type Plan = {
  name: string;
  description: string;
  features: string[];
  price?: {
    month?: {
      amount: number; // TODO take from stripe API ?
      currency: string;
      stripePriceId: string;
    };
    year?: {
      amount: number; // TODO take from stripe API ?
      currency: string;
      stripePriceId: string;
    };
  };
};

export const PLANS: Record<PlanType, Plan> = {
  FREE: {
    name: "Free",
    description: "Basic features for personal use",
    features: ["Basic markdown support", "GitHub sync", "Custom subdomain"],
  },
  PREMIUM: {
    name: "Premium",
    description: "No branding, custom domain support, and more.",
    features: [
      "Everything in Free",
      "Custom domain",
      "Priority support",
      "Team collaboration",
      "Custom branding",
    ],
    price: {
      month: {
        amount: 5,
        currency: "USD",
        stripePriceId: env.STRIPE_PREMIUM_MONTHLY_PRICE_ID,
      },
      year: {
        amount: 50,
        currency: "USD",
        stripePriceId: env.STRIPE_PREMIUM_YEARLY_PRICE_ID,
      },
    },
  },
};
