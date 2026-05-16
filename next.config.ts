import type { NextConfig } from "next";
import { execSync } from "child_process";

function getBuildSha(): string {
  try {
    return execSync("git rev-parse --short HEAD").toString().trim();
  } catch {
    return "dev";
  }
}

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_BUILD_SHA: getBuildSha(),
    NEXT_PUBLIC_BUILD_DATE: new Date().toISOString().split("T")[0],
  },
};

export default nextConfig;
