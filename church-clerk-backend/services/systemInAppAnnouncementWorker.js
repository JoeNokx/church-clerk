import mongoose from "mongoose";

import { releaseDueScheduledSystemInAppAnnouncements } from "../controller/systemInAppAnnouncementController.js";

let workerInterval = null;

export function startSystemInAppAnnouncementWorker({ intervalMs = 60_000 } = {}) {
  if (workerInterval) return;

  const tick = async () => {
    try {
      if (mongoose.connection?.readyState !== 1) return;
      await releaseDueScheduledSystemInAppAnnouncements();
    } catch {
      void 0;
    }
  };

  void tick();
  workerInterval = setInterval(tick, intervalMs);
}

export function stopSystemInAppAnnouncementWorker() {
  if (!workerInterval) return;
  clearInterval(workerInterval);
  workerInterval = null;
}
