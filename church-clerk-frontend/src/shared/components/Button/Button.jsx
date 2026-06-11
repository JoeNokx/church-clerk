function Button({ children, variant = "primary", size = "md", className = "", disabled = false, type = "button", onClick }) {
  const baseStyles = "inline-flex items-center justify-center font-semibold text-center transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap lg:whitespace-normal [&_svg]:hidden [&_img]:hidden lg:[&_svg]:inline-block lg:[&_img]:inline-block";
  
  const variantStyles = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500",
    secondary: "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 focus:ring-gray-500",
    danger: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500",
    ghost: "bg-transparent text-gray-700 hover:bg-gray-100 focus:ring-gray-500"
  };
  
  const sizeStyles = {
    sm: "h-[44px] md:h-11 lg:h-8 px-[16px] md:px-[18px] lg:px-3 text-[14px] lg:text-xs rounded-[10px] md:rounded-lg",
    md: "h-[44px] md:h-12 lg:h-9 px-[16px] md:px-[18px] lg:px-4 text-[14px] rounded-[10px] md:rounded-lg",
    lg: "h-[44px] md:h-12 lg:h-10 px-[16px] md:px-[18px] lg:px-5 text-[14px] rounded-[10px] md:rounded-lg"
  };
  
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
    >
      {children}
    </button>
  );
}

export default Button;
