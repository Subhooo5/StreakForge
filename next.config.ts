import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Native addons (.node binaries) must be treated as external and required at
  // runtime, not bundled by webpack. Without this, `next dev/build --webpack`
  // fails to parse @resvg/resvg-js's platform .node file and the whole
  // /api/streak route 500s. (resvg is used for ?format=png badge output.)
  serverExternalPackages: ["@resvg/resvg-js"],
};

export default nextConfig;
