import { uploadReceiptImage, destroyReceiptImage, receiptImageDownloadUrl, validateReceiptImage } from "../../../services/receiptService.js";

const uploadBusinessReceipt = (file, businessId, kind) =>
  uploadReceiptImage(file, `church-clerk/business-ventures/${businessId}/${kind}`);

export { uploadBusinessReceipt, destroyReceiptImage as destroyBusinessReceipt, receiptImageDownloadUrl as businessReceiptDownloadUrl, validateReceiptImage as validateReceiptFile };
