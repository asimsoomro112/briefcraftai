import React from "react";

export function SvgFilters() {
  return (
    <svg
      style={{ position: "absolute", width: 0, height: 0, pointerEvents: "none" }}
      aria-hidden="true"
    >
      <defs>
        <filter
          id="refraction-filter"
          x="-20%"
          y="-20%"
          width="140%"
          height="140%"
          colorInterpolationFilters="sRGB"
        >
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.04 0.08"
            numOctaves="2"
            result="noise"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="noise"
            scale="4"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </defs>
    </svg>
  );
}
