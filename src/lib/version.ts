// Telling an open app that a newer version has been published. The build the phone is running is baked into its code
// (NEXT_PUBLIC_BUILD_ID, the commit); the server says which build it is running now (/api/version). When they differ,
// a banner offers an update, which is just a reload because pages are always fetched fresh.

export const BUILD_ID = process.env.NEXT_PUBLIC_BUILD_ID ?? "dev";

export function needsUpdate(running: string | undefined, latest: string | undefined): boolean {
  if (!running || !latest) return false;
  if (running === "dev" || latest === "dev") return false;
  return running !== latest;
}
