import { z } from 'zod';
import { publicEndpoint } from '../endpoint.js';
import { vapidPublicKey } from '../push.js';

// The public (non-secret) VAPID key the browser needs to subscribe to push messages. Empty = push is not set up on the server yet.
export default publicEndpoint(z.object({}), async () => ({ publicKey: vapidPublicKey() }));
