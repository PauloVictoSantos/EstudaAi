import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // unpdf e o driver do MongoDB rodam só no servidor
  serverExternalPackages: ['unpdf', 'mongodb', '@napi-rs/canvas'],
};

export default nextConfig;
