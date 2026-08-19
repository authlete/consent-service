import type { NextConfig } from "next";

const SECURITY_HEADERS = [
  // Clickjacking protection. Consent/authorization UIs must never be framable.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  // MIME-sniffing protection.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Don't leak the authorization id / path on cross-origin sub-resource loads.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // HSTS — production only, but no harm in shipping it always.
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  // The libSQL native client is not bundlable — keep it external to the server build.
  serverExternalPackages: ["@libsql/client"],
  async headers() {
    return [{ source: "/(.*)", headers: SECURITY_HEADERS }];
  },
};

export default nextConfig;
