import React from 'react';

export function OrbitalSpinner({
  className = 'size-8',
  strokeWidth = '2',
}: {
  className?: string;
  strokeWidth?: string;
} = {}) {
  return (
    <div className={`${className} inline-block`}>
      <svg
        viewBox="0 0 50 50"
        xmlns="http://www.w3.org/2000/svg"
        className="h-full w-full"
      >
        <style>{`
          @keyframes orbital-spin {
            0% {
              transform: rotate(0deg);
            }
            100% {
              transform: rotate(360deg);
            }
          }
          .orbital-circle {
            animation: orbital-spin 2s linear infinite;
            transform-origin: 25px 25px;
          }
        `}</style>

        {/* Outer orbit */}
        <g className="orbital-circle">
          <circle
            cx="25"
            cy="10"
            r="3"
            fill="currentColor"
            opacity="0.8"
          />
          <circle
            cx="25"
            cy="25"
            r="15"
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            opacity="0.2"
          />
        </g>

        {/* Middle orbit */}
        <g className="orbital-circle" style={{ animationDuration: '1.5s' }}>
          <circle
            cx="25"
            cy="12"
            r="2.5"
            fill="currentColor"
            opacity="0.6"
          />
          <circle
            cx="25"
            cy="25"
            r="10"
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            opacity="0.15"
          />
        </g>

        {/* Inner orbit */}
        <g className="orbital-circle" style={{ animationDuration: '1s' }}>
          <circle
            cx="25"
            cy="16"
            r="2"
            fill="currentColor"
            opacity="0.4"
          />
          <circle
            cx="25"
            cy="25"
            r="5"
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            opacity="0.1"
          />
        </g>

        {/* Center dot */}
        <circle cx="25" cy="25" r="2" fill="currentColor" opacity="0.9" />
      </svg>
    </div>
  );
}
