/**
 * Pets Sync Worker
 * Runs as a separate process. Polls chain events every 30 seconds
 * and keeps pets_state + pet_transactions tables up to date.
 *
 * Start with: pnpm worker:pets
 */

import "../config"; // validates env before anything else
import { syncPetPurchasedEvents } from "../services/pets-sync";

const POLL_INTERVAL_MS = 30_000;

async function loop() {
  console.log("[pets-sync] Starting sync worker...");

  while (true) {
    try {
      const synced = await syncPetPurchasedEvents();
      if (synced > 0) {
        console.log(`[pets-sync] Synced ${synced} new PetPurchased events`);
      }
    } catch (err) {
      console.error("[pets-sync] Error during sync:", err);
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
}

loop().catch((err) => {
  console.error("[pets-sync] Fatal error:", err);
  process.exit(1);
});
