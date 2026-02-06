import { useRef } from "react";

function FileUploadButton({
  onFile,
  accept,
  disabled,
  className,
  children
}) {
  const inputRef = useRef(null);

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          onFile?.(file);
          e.target.value = "";
        }}
      />
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        className={className}
      >
        {children}
      </button>
    </>
  );
}

export default FileUploadButton;
