import QRCodeLib from "qrcode";

export async function qrCodeToDataUrl(value, { width = 512, margin = 2, level = "M", dark = "#000000", light = "#ffffff" } = {}) {
  return QRCodeLib.toDataURL(String(value), {
    width,
    margin,
    errorCorrectionLevel: level,
    color: { dark, light }
  });
}

export async function downloadQrCodePng(value, fileName = "qr-code", options = {}) {
  const url = await qrCodeToDataUrl(value, { width: 1024, ...options });
  const a = document.createElement("a");
  a.href = url;
  a.download = `${String(fileName).replace(/\.png$/i, "")}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
