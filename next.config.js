/** @type {import('next').NextConfig} */
const GRAFANA_UPSTREAM = process.env.GRAFANA_UPSTREAM || 'http://grafana:3000';

const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    // Proxy Grafana through the dashboard origin so the embed works over
    // whichever single port the user reaches the dashboard at (e.g. SSH
    // -L 3100 only). Without this, the iframe needs its own port forward.
    // Grafana is run with serve_from_sub_path=/grafana so its asset paths
    // line up with this prefix.
    return [
      { source: '/grafana',        destination: `${GRAFANA_UPSTREAM}/grafana` },
      { source: '/grafana/:path*', destination: `${GRAFANA_UPSTREAM}/grafana/:path*` },
    ];
  },
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization, x-correlator' },
        ],
      },
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "frame-src 'self' http://localhost:* http://*:3000 http://*:3001 http://*:3100;",
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
