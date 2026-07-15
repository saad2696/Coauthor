/** Coauthor logo mark — a monochrome "C" in a rounded square (matches the favicon).
 * Default: square uses `currentColor` with a white "C" (for light backgrounds).
 * `inverted`: white square with a dark "C" (for dark backgrounds). */
export function BrandMark({
  size = 28,
  className = "",
  inverted = false,
}: {
  size?: number;
  className?: string;
  inverted?: boolean;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      aria-hidden="true"
    >
      <rect
        width="100"
        height="100"
        rx="24"
        fill={inverted ? "#ffffff" : "currentColor"}
      />
      <path
        d="M66 34 A22 22 0 1 0 66 66"
        fill="none"
        stroke={inverted ? "#0a0a0a" : "#ffffff"}
        strokeWidth="11"
        strokeLinecap="round"
      />
    </svg>
  );
}
