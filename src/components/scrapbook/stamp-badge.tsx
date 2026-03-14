export function StampBadge({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <span className={`stamp-badge ${className}`}>{children}</span>;
}
