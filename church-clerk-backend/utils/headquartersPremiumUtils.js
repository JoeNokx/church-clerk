export const validatePlanForChurch = (church, plan) => {
  const planName = String(plan?.name || "").toLowerCase();
  if (church.type === "Headquarters" && planName !== "premium") {
    throw new Error("HQ churches must subscribe to Premium plan only");
  }
};
