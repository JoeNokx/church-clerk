import { Link } from "react-router-dom";

const VARIANTS = {
  primary: "bg-blue-600 text-white shadow-sm hover:bg-blue-700",
  outline: "border border-blue-600 bg-white text-blue-700 hover:bg-blue-50",
  subtle: "border border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700",
  ghost: "text-slate-700 hover:bg-slate-50 hover:text-blue-700",
  dark: "border border-white/15 text-slate-300 hover:bg-white/5 hover:text-white",
  white: "bg-white text-blue-700 shadow-sm hover:bg-blue-50",
};

const SIZES = {
  xs: "px-3 py-1.5 text-xs",
  sm: "px-4 py-2 text-sm",
  md: "px-5 py-2.5 text-sm",
  lg: "px-7 py-3.5 text-sm",
};

function LandingButton({ to, href, variant = "primary", size = "md", className = "", children, ...rest }) {
  const classes = `inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-colors disabled:opacity-60 ${VARIANTS[variant]} ${SIZES[size]} ${className}`;

  if (to) {
    return (
      <Link to={to} className={classes} {...rest}>
        {children}
      </Link>
    );
  }
  if (href) {
    return (
      <a href={href} className={classes} {...rest}>
        {children}
      </a>
    );
  }
  return (
    <button type="button" className={classes} {...rest}>
      {children}
    </button>
  );
}

export default LandingButton;
