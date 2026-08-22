import { Router } from 'express';

const router = Router();

// Meta Webhook Verification Endpoint
router.get('/meta', (req, res) => {
  // Parse the query params
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  // Check if a token and mode is in the query string of the request
  if (mode && token) {
    // Check the mode and token sent is correct
    const verifyToken = process.env.META_INSTAGRAM_WEBHOOK_VERIFY_TOKEN || 'genzystudio_secret';
    
    if (mode === 'subscribe' && token === verifyToken) {
      // Respond with the challenge token from the request
      console.log('WEBHOOK_VERIFIED');
      res.status(200).send(challenge);
    } else {
      // Respond with '403 Forbidden' if verify tokens do not match
      res.sendStatus(403);
    }
  } else {
    // Return a '400 Bad Request' if mode or token are missing
    res.sendStatus(400);
  }
});

// Meta Webhook Event Reception Endpoint (For receiving actual webhooks later)
router.post('/meta', (req, res) => {
  const body = req.body;

  console.log('Received Meta Webhook:', JSON.stringify(body, null, 2));
  
  // Always return a 200 OK response to Meta to acknowledge receipt
  res.status(200).send('EVENT_RECEIVED');
});

export default router;
