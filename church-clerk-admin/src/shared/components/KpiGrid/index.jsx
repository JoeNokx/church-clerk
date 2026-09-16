function KpiGrid({ children, className }) {
  return (
    <div className={`grid grid-cols-2 ${className ?? ""}`}>
      {children}
    </div>
  );
}

export default KpiGrid;
