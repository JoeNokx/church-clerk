import Subscription from "../../models/billingModel/subscriptionModel.js";
import { validateMobileMoneyProvider } from "./paymentMethodService.js";

async function addMobileMoneyPaymentMethod(subscription, provider, phone) {
  const { normalizedProvider, phoneE164 } = validateMobileMoneyProvider(provider, phone);

  subscription.paymentMethods = Array.isArray(subscription.paymentMethods) ? subscription.paymentMethods : [];
  const exists = subscription.paymentMethods.some(
    (m) => String(m?.type || "mobile_money") === "mobile_money" && 
           String(m?.provider || "") === normalizedProvider && 
           String(m?.phone || "") === phoneE164
  );

  if (!exists) {
    subscription.paymentMethods.push({ 
      type: "mobile_money", 
      provider: normalizedProvider, 
      phone: phoneE164 
    });
    await subscription.save();
  }

  return subscription;
}

async function updateMobileMoneyPaymentMethod(subscription, methodId, updateData, country) {
  if (country !== "ghana") {
    throw new Error("Mobile money is only available for churches in Ghana");
  }

  const { provider, phone } = updateData;
  if (!provider || !phone) {
    throw new Error("Provider and phone are required");
  }

  const { normalizedProvider, phoneE164 } = validateMobileMoneyProvider(provider, phone);

  subscription.paymentMethods = Array.isArray(subscription.paymentMethods) ? subscription.paymentMethods : [];
  const method = subscription.paymentMethods.find((m) => String(m?._id || "") === String(methodId));
  
  if (!method) {
    throw new Error("Payment method not found");
  }

  method.provider = normalizedProvider;
  method.phone = phoneE164;

  await subscription.save();
  return subscription;
}

export { addMobileMoneyPaymentMethod, updateMobileMoneyPaymentMethod };
