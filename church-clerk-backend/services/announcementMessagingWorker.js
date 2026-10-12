import mongoose from "mongoose";

import { releaseDueScheduledAnnouncementMessages } from "../controller/announcementMessagingController.js";
import { processDueAutomations } from "./announcement/automationService.js";

let workerInterval = null;

export function startAnnouncementMessagingWorker({ intervalMs = 60_000 } = {}) {
  if (workerInterval) return;

  const tick = async () => {
    try {
      if (mongoose.connection?.readyState !== 1) return;
      await releaseDueScheduledAnnouncementMessages();
      await processDueAutomations();
    } catch {
      void 0;
    }
  };

  void tick();
  workerInterval = setInterval(tick, intervalMs);
}

export function stopAnnouncementMessagingWorker() {
  if (!workerInterval) return;
  clearInterval(workerInterval);
  workerInterval = null;
}
