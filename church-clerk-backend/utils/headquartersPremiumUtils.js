export const validatePlanForChurch = (church, plan) => {
  if (church.type === "Headquarters" && plan.name !== "premium") {
    throw new Error("HQ churches must subscribe to Premium plan only");
  }
};
