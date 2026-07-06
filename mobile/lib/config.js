// lib/config.js
// The mobile app calls a few server-side routes (AI advice generation, etc.)
// that live in the admin-dashboard Next.js app. During local development
// this needs to be your computer's LAN IP (not "localhost" — your phone
// can't reach your computer's localhost). Once deployed (Day 10), switch
// this to your real Vercel URL.

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:3000'
