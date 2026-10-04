/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Where the app's working files go while it runs. Normally ".next". The
  // automated tests run a second copy of the app side by side with a
  // different setting, and two copies cannot share one folder.
  distDir: process.env.NEXT_DIST_DIR || ".next",
};

export default nextConfig;
