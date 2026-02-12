function LoadingSpinner({ label }) {
  return (
    <div className="text-sm text-gray-600">
      {label || "Loading..."}
    </div>
  );
}

export default LoadingSpinner;
