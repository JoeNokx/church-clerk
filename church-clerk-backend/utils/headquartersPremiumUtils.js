export const validatePlanForChurch = (church, plan) => {
  const planName = String(plan?.name || "").toLowerCase();
  if (church.type === "Headquarters" && planName !== "premium" && planName !== "enterprise") {
    throw new Error("HQ churches must subscribe to the Premium or Enterprise plan only");
  }
};
