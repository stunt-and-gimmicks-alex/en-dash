// frontend/src/components/sidebar/Logo.tsx
import React from "react";

export const Logo = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    height="40"
    viewBox="0 0 400 80"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <title>en–dash</title>

    {/* "en" text */}
    <g fill="#228B22">
      {/* e */}
      <path d="M20 50 Q20 35 35 35 Q50 35 50 45 Q50 50 45 50 L25 50 Q25 55 35 55 Q45 55 50 50 L50 60 Q45 65 35 65 Q20 65 20 50 Z M25 45 L40 45 Q40 40 35 40 Q30 40 25 45 Z" />

      {/* n */}
      <path d="M60 65 L60 45 Q60 35 75 35 Q90 35 90 45 L90 65 L80 65 L80 45 Q80 40 75 40 Q70 40 70 45 L70 65 L60 65 Z" />
    </g>

    {/* Rounded square with dash */}
    <g transform="translate(110, 20)">
      <rect width="40" height="40" rx="8" ry="8" fill="#228B22" />
      {/* Dash/hyphen in the center */}
      <rect x="12" y="18" width="16" height="4" fill="white" rx="2" />
    </g>

    {/* "dash" text */}
    <g fill="#228B22">
      {/* d */}
      <path d="M170 65 L170 15 L180 15 L180 35 Q185 35 190 35 Q205 35 205 50 Q205 65 190 65 L170 65 Z M180 55 L190 55 Q195 55 195 50 Q195 45 190 45 Q185 45 180 45 L180 55 Z" />

      {/* a */}
      <path d="M215 65 L215 60 Q210 65 200 65 Q185 65 185 55 Q185 45 200 45 Q210 45 215 50 L215 45 Q215 35 230 35 Q245 35 245 45 L245 65 L235 65 L235 50 Q235 45 230 45 Q225 45 225 50 L225 65 L215 65 Z M215 55 Q215 50 210 50 Q205 50 205 55 Q205 60 210 60 Q215 60 215 55 Z" />

      {/* s */}
      <path d="M255 65 Q240 65 240 55 L250 55 Q250 60 255 60 Q260 60 260 55 Q260 50 255 50 L250 50 Q240 50 240 40 Q240 30 255 30 Q270 30 270 40 L260 40 Q260 35 255 35 Q250 35 250 40 Q250 45 255 45 L260 45 Q270 45 270 55 Q270 65 255 65 Z" />

      {/* h */}
      <path d="M280 65 L280 15 L290 15 L290 35 Q295 35 300 35 Q315 35 315 45 L315 65 L305 65 L305 45 Q305 40 300 40 Q295 40 290 45 L290 65 L280 65 Z" />
    </g>
  </svg>
);
