import { expireApprovedImportedListings } from "../repositories/listingRepository";
import { deleteExpiredRefreshTokens } from "../repositories/tokenRepository";

const THIRTY_MINUTES = 1000 * 60 * 30;

async function runCleanup() {
  try {
    const expired = await expireApprovedImportedListings(30);
    if (expired > 0) {
      console.log(`[jobs] Expired ${expired} imported listing(s)`);
    }
    await deleteExpiredRefreshTokens();
  } catch (error) {
    console.error("[jobs] Cleanup failed:", error);
  }
}

/**
 * Starts recurring maintenance jobs. Returns a function that stops them.
 * Running these off the request path avoids a write query on every read.
 */
export function startScheduledJobs(): () => void {
  void runCleanup();
  const timer = setInterval(runCleanup, THIRTY_MINUTES);
  // Do not keep the event loop alive just for this timer.
  timer.unref?.();
  return () => clearInterval(timer);
}
