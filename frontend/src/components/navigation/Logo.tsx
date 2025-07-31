// frontend/src/components/navigation/Logo.tsx
// Clean logo component using ChakraUI v3 patterns

import React from "react";

export const Logo = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    height="28"
    viewBox="0 0 143 50"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <title>En-Dash Server Management</title>
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M20.127 0C15.466 0 11.2287 1.69492 7.83887 4.23729L30.9321 31.9915L49.788 17.7966C48.9406 7.83898 40.466 0 30.0846 0"
      fill="var(--chakra-colors-color-palette-solid)"
    />
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M30.0847 50C41.1017 50 50 41.1017 50 30.0847V29.0254L32.839 41.7373C30.9322 43.2203 28.178 42.7966 26.6949 41.1017L2.11864 11.4407C0.847458 13.983 0 16.9491 0 19.9152V29.8729C0 40.8898 8.89831 49.7881 19.9153 49.7881"
      fill="var(--chakra-colors-color-palette-emphasized)"
    />
    <path
      d="M67.736 37V11.8H71.876V37H67.736ZM70.58 37V33.22H83.756V37H70.58Z"
      fill="var(--chakra-colors-fg)"
    />
  </svg>
);
