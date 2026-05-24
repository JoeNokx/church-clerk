function LoadingSpinner({ label, rows = 4 }) {
  return (
    <div className="space-y-3 animate-pulse">
      {label ? <div className="h-4 w-32 rounded bg-gray-200" /> : null}
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="h-4 w-24 rounded bg-gray-200" />
          <div className="h-4 w-16 rounded bg-gray-200" />
        </div>
      ))}
    </div>
  );
}

export default LoadingSpinner;
