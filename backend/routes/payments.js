import express from 'express';

const router = express.Router();

// POST /api/payments/create-intent
router.post('/create-intent', async (req, res) => {
  try {
    const { amount, expertId, expertStripeId, clientEmail } = req.body;

    if (!amount) {
      return res.status(400).json({ error: 'Payment amount is required.' });
    }

    const totalAmount = parseFloat(amount);
    const platformFee = Math.round(totalAmount * 0.15 * 100) / 100; // 15%
    const expertPayout = Math.round((totalAmount - platformFee) * 100) / 100; // 85%

    // Generates simulated Stripe Payment Intent with transfer destination
    const paymentIntent = {
      id: `pi_test_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      client_secret: `pi_secret_${Math.random().toString(36).substring(2, 18)}`,
      amount: totalAmount * 100, // in cents
      currency: 'usd',
      application_fee_amount: platformFee * 100,
      transfer_data: {
        destination: expertStripeId || 'acct_1N9280Xy',
      },
      metadata: {
        expertId: expertId || 'exp-1',
        clientEmail: clientEmail || 'client@example.com',
        expertPayout: expertPayout.toFixed(2),
        platformCommission: platformFee.toFixed(2)
      },
      status: 'requires_payment_method'
    };

    return res.json({
      status: 'success',
      paymentIntent,
      breakdown: {
        total: totalAmount,
        platformFee,
        expertPayout
      }
    });
  } catch (err) {
    console.error('Payment intent error:', err);
    res.status(500).json({ error: 'Failed to create payment intent.' });
  }
});

export default router;
