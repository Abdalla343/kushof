const paytabs = require('paytabs_pt2');
const User = require('../models/User');
require('dotenv').config();

// Configuration
const profileID = process.env.PAYTABS_PROFILE_ID || '148198';
const serverKey = process.env.PAYTABS_SERVER_KEY || 'SKJ9TBKRMW-JMDJZ2LHHT-N9MRZNRBBB';
const region = process.env.PAYTABS_REGION || 'EGY';

paytabs.setConfig(profileID, serverKey, region);

/**
 * Process payment and update user status
 * @param {Object} data - Payment data
 */
const processPaymentAndUpdateUser = async (data) => {
  try {
    // Handle nested query parameters and different parameter names
    if (!data.cart_id && data.cartId) data.cart_id = data.cartId;
    if (!data.payment_result && data.paymentResult) data.payment_result = data.paymentResult;
    
    // Check payment status
    let paymentResult = data.payment_result || data.paymentResult;
    let status;
    
    if (paymentResult) {
      if (typeof paymentResult === 'string') {
        status = paymentResult;
      } else if (typeof paymentResult === 'object') {
        if (typeof paymentResult.response_status === 'string') {
          status = paymentResult.response_status;
        } else if (Array.isArray(paymentResult.response_status) && paymentResult.response_status.length > 0) {
          status = paymentResult.response_status[0];
        }
      } else if (Array.isArray(paymentResult) && paymentResult.length > 0) {
        status = paymentResult[0];
      }
    }
    
    if (!status) {
      status = data.response_status || data.respStatus || data.status;
    }

    const isSuccess = status === 'A' || status === 'success' || status === 'captured';

    if (isSuccess) {
      // Extract user ID from cart_id (format: premium-{userId})
      const cartId = data.cart_id || data.cartId;
      if (cartId && cartId.startsWith('premium-')) {
        const userId = cartId.split('-')[1];
        
        // Update user to Prime
        const user = await User.findByPk(userId);
        if (user) {
          user.isPrime = true;
          await user.save();
          return { success: true, userId, message: 'User upgraded to Prime' };
        }
      }
    }

    return { success: false, message: 'Payment failed or invalid data' };
  } catch (error) {
    console.error('Process payment error:', error);
    return { success: false, message: error.message };
  }
};

/**
 * @desc    Create Premium Subscription Payment
 * @route   POST /api/payment/checkout
 * @access  Private
 */
const createCheckoutSession = (req, res) => {
  try {
    const {
      userId,
      name,
      paymentMethods,
      amount,
      currency,
      returnUrl,
      callbackUrl,
    } = req.body;

    // Default amount and currency
    const cartAmount = amount || 100;
    const cartCurrency =
      typeof currency === 'string' && currency.trim().length === 3
        ? currency.trim().toUpperCase()
        : 'SAR';

    const cartId = `premium-${userId || Date.now()}`;

    const paymentData = {
      profile_id: profileID,
      tran_type: 'sale',
      tran_class: 'ecom',
      cart_id: cartId,
      cart_currency: cartCurrency,
      cart_amount: cartAmount,
      cart_description: 'Premium Account Subscription',
      payment_methods: Array.isArray(paymentMethods) && paymentMethods.length > 0 ? paymentMethods : undefined,
      customer_details: {
        name: name || 'Premium User',
      },
      shipping_details: {
        name: name || 'Premium User',
      },
      callback: callbackUrl || `${req.protocol}://${req.get('host')}/api/payment/callback`,
      return: returnUrl || `${req.protocol}://${req.get('host')}/api/payment/success`
    };

    // Basic validation
    if (!paymentData.customer_details.name) {
      return res.status(400).json({ message: 'Customer name is required' });
    }

    // Map data for PayTabs SDK
    const payment_code = Array.isArray(paymentData.payment_methods)
        ? paymentData.payment_methods
        : (paymentData.payment_methods ? [paymentData.payment_methods] : ['card','mada']);
      const transaction = [paymentData.tran_type || 'sale', paymentData.tran_class || 'ecom'];
      const cart = [paymentData.cart_id, paymentData.cart_currency, String(paymentData.cart_amount), paymentData.cart_description];
      const cust = paymentData.customer_details || {};
      const customer = [
        cust.name || '',
        cust.email || '',
        cust.phone || '',
        cust.street1 || '',
        cust.city || '',
        cust.state || '',
        cust.country || '',
        cust.zip || '',
        cust.ip || req.ip || ''
      ];
      const ship = paymentData.shipping_details || {};
      const shipping = [
        ship.name || '',
        ship.email || '',
        ship.phone || '',
        ship.street1 || '',
        ship.city || '',
        ship.state || '',
        ship.country || '',
        ship.zip || '',
        ship.ip || req.ip || ''
      ];
      const urls = [paymentData.callback, paymentData.return];

    paytabs.createPaymentPage(payment_code, transaction, cart, customer, shipping, urls, paymentData.paypage_lang, (result) => {
      if (!result) {
        return res.status(500).json({ message: 'No response from PayTabs' });
      }

      if (result.error || result.message || result.error_code) {
        return res.status(500).json({ 
          message: 'PayTabs payment error', 
          error: result.message || result.error 
        });
      }

      const redirectUrl = result.redirect_url || result.payment_url || result.url;
      if (!redirectUrl) {
        return res.status(500).json({ message: 'Failed to create payment page' });
      }

      return res.json({ success: true, redirect_url: redirectUrl });
    });
  } catch (err) {
    console.error('PayTabs error:', err);
    return res.status(500).json({ message: 'Internal server error', error: err.message });
  }
};

/**
 * @desc    Handle PayTabs Callback
 * @route   POST /api/payment/callback
 * @access  Public
 */
const handleCallback = async (req, res) => {
  try {
    const data = req.body;
    // console.log('PayTabs Callback:', data);
    
    const result = await processPaymentAndUpdateUser(data);
    
    if (result.success) {
      console.info(`✅ User ${result.userId} upgraded to Prime`);
    } else {
      console.warn('⚠️ Callback payment processing failed:', result.message);
    }
    
    // Respond to PayTabs
    res.json({ result: 'OK', message: result.message });
  } catch (error) {
    console.error('Callback error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * @desc    Show Success Page
 * @route   GET /api/payment/success
 * @access  Public
 */
const showSuccessPage = (req, res) => {
    // We can also process payment here if callback didn't fire yet, using query params
    // But usually callback handles it.
    // For now, just show the HTML
    res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Payment Successful</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          margin: 0;
          padding: 20px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }
        .container {
          text-align: center;
          background: rgba(255, 255, 255, 0.1);
          padding: 40px;
          border-radius: 20px;
          backdrop-filter: blur(10px);
        }
        h1 {
          font-size: 32px;
          margin-bottom: 20px;
        }
        p {
          font-size: 18px;
          margin: 10px 0;
        }
        .icon {
          font-size: 64px;
          margin-bottom: 20px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="icon">✅</div>
        <h1>Payment Successful!</h1>
        <p>Your account has been upgraded to Premium.</p>
        <p>You can now return to the application.</p>
      </div>
    </body>
    </html>
  `);
};

module.exports = {
  createCheckoutSession,
  handleCallback,
  showSuccessPage
};
