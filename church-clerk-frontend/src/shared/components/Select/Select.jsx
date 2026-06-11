function Select({ children, className = "", value, onChange, disabled = false }) {
  return (
    <select
      value={value}
      onChange={onChange}
      disabled={disabled}
      className={`h-[44px] w-full rounded-[10px] md:rounded-lg border border-gray-200 bg-white px-3 md:px-4 lg:px-3 text-[14px] text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed ${className} md:h-12 lg:h-11 lg:text-sm`}
    >
      {children}
    </select>
  );
}

export default Select;
