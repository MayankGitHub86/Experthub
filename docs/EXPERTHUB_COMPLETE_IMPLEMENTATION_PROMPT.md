# ExpertHub - Complete Technical Architecture & Backend Blueprint

## 1. System Architecture Overview
ExpertHub is a hybrid platform architecture:
- **Headless CMS & Commerce Core**: WordPress 6.x + WooCommerce + WooCommerce Bookings (for catalog, subscription, and native e-commerce).
- **Real-Time Communication Microservice**: Node.js + Express + Socket.io + MongoDB (for live consultation chat, WebRTC signaling, and notifications).
- **AI Matching Engine**: OpenAI API (embeddings + GPT-4o) for matching client challenges with expert capabilities.
- **Payment & Escrow Layer**: Stripe Connect (Express/Custom accounts) for multi-vendor split payouts (85% Expert / 15% Platform fee).
- **Executive Frontend**: React 18 + Vite + Custom Obsidian Dark Design System (modeled after the Nexora Executive Suite).

```
+-------------------------------------------------------------+
|                      React + Vite UI                        |
|       (Executive Dashboard, Marketplace, AI Matcher, Chat)   |
+-------------------------------------------------------------+
          |                                  |
          | REST / GraphQL                   | WebSockets
          v                                  v
+------------------------+        +---------------------------+
|  WordPress + WC Core   |        |  Node.js / Express Engine |
|  - Custom Post Types   |        |  - Socket.io Chat         |
|  - JWT Authentication  |        |  - WebRTC Room Signaling  |
|  - Stripe Connect      |        |  - AI Matching Agent      |
+------------------------+        +---------------------------+
          |                                  |
          v                                  v
   MySQL Database                     MongoDB Atlas
```

---

## 2. WordPress Custom Post Types & Schemas

### Expert Post Type (`expert`)
```php
<?php
// backend/src/mu-plugins/experthub-cpt.php
add_action('init', function() {
    register_post_type('expert', [
        'labels' => [
            'name' => 'Experts',
            'singular_name' => 'Expert'
        ],
        'public' => true,
        'show_in_rest' => true,
        'supports' => ['title', 'editor', 'thumbnail', 'custom-fields'],
        'rest_base' => 'experts',
    ]);
});
```

### Expert Meta Fields:
- `hourly_rate`: Float ($150 - $600/hr)
- `headline`: String ("Staff Distributed Systems Architect")
- `skills`: Array of terms ("Kubernetes", "Next.js", "AI Pipelines", "System Design")
- `rating`: Float (4.95)
- `reviews_count`: Integer (128)
- `stripe_account_id`: String (`acct_1N...`)
- `verification_status`: Boolean (`verified` / `pending`)

---

## 3. Node.js & Socket.io Real-time Consultation Chat

```javascript
// backend/src/server.js
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*' }
});

io.on('connection', (socket) => {
  socket.on('join_session', ({ bookingId, userId }) => {
    socket.join(`session_${bookingId}`);
  });

  socket.on('send_message', ({ bookingId, senderId, text, timestamp }) => {
    io.to(`session_${bookingId}`).emit('receive_message', {
      senderId,
      text,
      timestamp: timestamp || new Date().toISOString()
    });
  });
});

httpServer.listen(3001);
```

---

## 4. AI Semantic Matching Agent Algorithm

```javascript
// backend/src/services/aiMatcher.js
export async function matchExpertToRequirement(clientRequirement, expertsList) {
  // Synthesizes client problem statement with expert capabilities
  // Evaluates skill overlap, seniority, and availability
  return expertsList.map(exp => {
    const score = calculateRelevance(clientRequirement, exp);
    return {
      expert: exp,
      matchScore: score,
      reasoning: `Matched based on expertise in ${exp.headline} and domain skills.`
    };
  }).sort((a, b) => b.matchScore - a.matchScore);
}
```

---

## 5. Stripe Connect Multi-Vendor Payouts

```javascript
// backend/src/services/stripe.js
import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function createBookingPayment({ amount, expertStripeAccountId, customerEmail }) {
  const platformFee = Math.round(amount * 0.15); // 15% platform commission

  const paymentIntent = await stripe.paymentIntents.create({
    amount: amount * 100,
    currency: 'usd',
    application_fee_amount: platformFee * 100,
    transfer_data: {
      destination: expertStripeAccountId,
    },
    receipt_email: customerEmail,
  });

  return paymentIntent;
}
```
