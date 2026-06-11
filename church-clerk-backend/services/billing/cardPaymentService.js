import Subscription from "../../models/billingModel/subscriptionModel.js";
import { validateCardDetails, detectCardBrand } from "./paymentMethodService.js";

async function addCardPaymentMethod(subscription, cardData) {
  const { cardNumber, expMonth, expYear, cvv, holderName } = cardData;
  const { digits, m, y, name } = validateCardDetails(cardNumber, expMonth, expYear, cvv, holderName);

  const brand = detectCardBrand(digits);
  const last4 = digits.slice(-4);

  subscription.paymentMethods = Array.isArray(subscription.paymentMethods) ? subscription.paymentMethods : [];

  const isSameCard = subscription.paymentMethods.some(
    (pm) => String(pm?.type || "") === "card" && 
           String(pm?.last4 || "") === String(last4) && 
           Number(pm?.expMonth) === m && 
           Number(pm?.expYear) === y
  );

  if (!isSameCard) {
    subscription.paymentMethods = subscription.paymentMethods.filter(
      (pm) => String(pm?.type || "") !== "card"
    );
    subscription.paymentMethods.push({
      type: "card",
      brand,
      last4,
      expMonth: m,
      expYear: y,
      holderName: name
    });
    await subscription.save();
  }

  return subscription;
}

async function updateCardPaymentMethod(subscription, methodId, updateData) {
  subscription.paymentMethods = Array.isArray(subscription.paymentMethods) ? subscription.paymentMethods : [];
  const method = subscription.paymentMethods.find((m) => String(m?._id || "") === String(methodId));
  
  if (!method) {
    throw new Error("Payment method not found");
  }

  if (String(method?.type || "") === "card") {
    throw new Error("Card payment methods cannot be edited");
  }

  return subscription;
}

export { addCardPaymentMethod, updateCardPaymentMethod };
