const express = require('express');
const router = express.Router();
const { 
  createCheckoutSession, 
  handleCallback, 
  showSuccessPage 
} = require('../controllers/paymentController');

router.post('/checkout', createCheckoutSession);
router.post('/callback', handleCallback);
router.get('/success', showSuccessPage);

module.exports = router;
