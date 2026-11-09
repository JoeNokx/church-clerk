import { useEffect, useState } from "react";
import { qrCodeToDataUrl } from "./utils.js";

export default function QRCode({ value, size = 192, level = "M", margin = 1, className = "", alt = "QR code" }) {
  const [generated, setGenerated] = useState({ value: null, src: "" });

  useEffect(() => {
    if (!value) return undefined;
    let cancelled = false;
    qrCodeToDataUrl(value, { width: Math.max(256, size * 2), margin, level })
      .then((src) => { if (!cancelled) setGenerated({ value, src }); })
      .catch(() => { if (!cancelled) setGenerated({ value, src: "" }); });
    return () => { cancelled = true; };
  }, [value, size, margin, level]);

  if (!value) return null;
  const src = generated.value === value ? generated.src : "";
  if (!src) {
    return (
      <div
        style={{ width: size, height: size }}
        className={`animate-pulse rounded-lg bg-gray-200 ${className}`}
      />
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      style={{ width: size, height: size }}
      className={className}
    />
  );
}
