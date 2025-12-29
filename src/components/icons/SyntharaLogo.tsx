import type { SVGProps } from 'react';

export function SyntharaLogo(props: SVGProps<SVGSVGElement>) {
  const { className, ...rest } = props;
  return (
    <svg
      viewBox="0 0 282 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...rest}
    >
      {/* Abstract "S" / Data Block Icon */}
      <rect x="10" y="20" width="20" height="20" rx="4" fill="currentColor" fillOpacity="0.2" />
      <rect x="35" y="20" width="20" height="20" rx="4" fill="currentColor" fillOpacity="0.4" />
      <rect x="10" y="45" width="20" height="20" rx="4" fill="currentColor" fillOpacity="0.6" />
      <rect x="35" y="45" width="20" height="20" rx="4" fill="currentColor" />
      <rect x="10" y="70" width="20" height="20" rx="4" fill="currentColor" fillOpacity="0.4" />
      <rect x="35" y="70" width="20" height="20" rx="4" fill="currentColor" fillOpacity="0.2" />

      {/* Logo Text */}
      <text
        x="70"
        y="65"
        fill="currentColor"
        style={{
          fontFamily: 'var(--font-space-grotesk)',
          fontSize: '44px',
          fontWeight: '800',
          letterSpacing: '-0.02em',
        }}
      >
        Synthara
      </text>
    </svg>
  );
}
