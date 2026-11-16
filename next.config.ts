import type { NextConfig } from 'next';

// Nothing special is needed. Photos are resized in the browser to about
// 1024 px before upload, so they stay well under Vercel's 4.5 MB request limit.
const nextConfig: NextConfig = {};

export default nextConfig;
