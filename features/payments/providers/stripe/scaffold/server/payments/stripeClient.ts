// Scaffolded by `ai-project-bootstrap implement payments` (Stripe).
// See implementation/payments/plan.md.
//
// One client for the whole server. Written as plain functions rather than
// framework-specific route handlers — wire these into whatever your backend
// actually is (a Next.js route handler, a NestJS controller, ...). If this
// project's backend is Python (FastAPI), treat this file as the pattern to
// port rather than code to run directly — see plan.md's "Before you start".

import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);
