import { toast } from "react-toastify";

const buildToastId = (type, message) => `${type}:${String(message || "").trim()}`;

export const showSuccess = (message = "Operation successful") =>
  toast.success(message, { toastId: buildToastId("success", message) });

export const showError = (message = "Request failed") =>
  toast.error(message, { toastId: buildToastId("error", message) });

export const showInfo = (message = "Processing...") =>
  toast.info(message, { toastId: buildToastId("info", message) });

export const showWarning = (message = "Check your input") =>
  toast.warning(message, { toastId: buildToastId("warning", message) });
