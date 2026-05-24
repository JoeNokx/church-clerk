import { sendEmail } from "../services/emailService.js";

const appName = () => process.env.APP_NAME || "Church Clerk";

export const sendCancellationScheduledEmail = async (church, effectiveDate) => {
  const to = church?.email;
  if (!to) return;
  const date = effectiveDate ? new Date(effectiveDate).toLocaleDateString() : "your next billing date";
  await sendEmail({
    to,
    subject: `Your ${appName()} subscription will be cancelled`,
    html: `
      <p>Hello ${church?.name || "Church Admin"},</p>
      <p>We've received your cancellation request. Your subscription will remain active until <strong>${date}</strong>, after which your account will move to the <strong>Free Lite</strong> plan.</p>
      <p>You will still have access to all your existing data, but actions available will be limited to those included in the Free Lite plan.</p>
      <p>If you change your mind, you can upgrade again at any time from your billing dashboard.</p>
      <p>— The ${appName()} Team</p>
    `
  });
};

export const sendCancellationAppliedEmail = async (church) => {
  const to = church?.email;
  if (!to) return;
  await sendEmail({
    to,
    subject: `Your ${appName()} subscription has been cancelled`,
    html: `
      <p>Hello ${church?.name || "Church Admin"},</p>
      <p>Your subscription has now been cancelled and your account has moved to the <strong>Free Lite</strong> plan.</p>
      <p>All your data is still intact. You may continue using Free Lite features or upgrade at any time.</p>
      <p>— The ${appName()} Team</p>
    `
  });
};

export const sendDowngradeScheduledEmail = async (church, oldPlanName, newPlanName, effectiveDate) => {
  const to = church?.email;
  if (!to) return;
  const date = effectiveDate ? new Date(effectiveDate).toLocaleDateString() : "your next billing date";
  await sendEmail({
    to,
    subject: `Your ${appName()} plan will be downgraded`,
    html: `
      <p>Hello ${church?.name || "Church Admin"},</p>
      <p>Your plan will change from <strong>${oldPlanName}</strong> to <strong>${newPlanName}</strong> on <strong>${date}</strong>.</p>
      <p>You will continue to enjoy your current plan features until then. After the change, you will retain all your data but actions will be limited to those available in the ${newPlanName} plan.</p>
      <p>You can upgrade again at any time from your billing dashboard.</p>
      <p>— The ${appName()} Team</p>
    `
  });
};

export const sendDowngradeAppliedEmail = async (church, newPlanName) => {
  const to = church?.email;
  if (!to) return;
  await sendEmail({
    to,
    subject: `Your ${appName()} plan has been updated`,
    html: `
      <p>Hello ${church?.name || "Church Admin"},</p>
      <p>Your subscription has been updated to the <strong>${newPlanName}</strong> plan.</p>
      <p>All your data remains intact. Actions are now limited to those available in the ${newPlanName} plan.</p>
      <p>You can upgrade at any time from your billing dashboard.</p>
      <p>— The ${appName()} Team</p>
    `
  });
};

export const sendSuspensionEmail = async (church) => {
  const to = church?.email;
  if (!to) return;
  await sendEmail({
    to,
    subject: `Your ${appName()} subscription has been suspended`,
    html: `
      <p>Hello ${church?.name || "Church Admin"},</p>
      <p>Your subscription has been <strong>suspended</strong> by the system administrator.</p>
      <p>Your data is safe. Please contact support to restore access.</p>
      <p>— The ${appName()} Team</p>
    `
  });
};
