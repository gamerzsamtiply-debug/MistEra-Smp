// Vercel serverless function: every /api/<name> request is served from this single file
// (one function keeps us inside Vercel's Hobby-plan function limit).
// The actual logic lives in /server so the same code also runs under `npm run dev`.
import handler from '../server/http.js';

export default handler;
