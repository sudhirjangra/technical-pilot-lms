'use client';

export function AviationRadarBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden select-none opacity-[0.14] dark:opacity-[0.18] transition-opacity duration-1000"
    >
      {/* Radar grid in bottom right corner with light green HUD styling */}
      <svg
        className="absolute -bottom-20 -right-20 h-[550px] w-[550px] sm:h-[700px] sm:w-[700px] text-emerald-600 dark:text-emerald-400"
        viewBox="0 0 600 600"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Concentric distance circles */}
        <circle cx="300" cy="300" r="280" stroke="currentColor" strokeWidth="1.25" strokeDasharray="4 4" />
        <circle cx="300" cy="300" r="210" stroke="currentColor" strokeWidth="1.25" />
        <circle cx="300" cy="300" r="140" stroke="currentColor" strokeWidth="1.25" strokeDasharray="4 4" />
        <circle cx="300" cy="300" r="70" stroke="currentColor" strokeWidth="1.25" />
        <circle cx="300" cy="300" r="10" fill="currentColor" opacity="0.4" />

        {/* Crosshairs */}
        <line x1="20" y1="300" x2="580" y2="300" stroke="currentColor" strokeWidth="1.25" />
        <line x1="300" y1="20" x2="300" y2="580" stroke="currentColor" strokeWidth="1.25" />

        {/* Diagonal bearing lines */}
        <line x1="102" y1="102" x2="498" y2="498" stroke="currentColor" strokeWidth="1" strokeDasharray="3 5" />
        <line x1="102" y1="498" x2="498" y2="102" stroke="currentColor" strokeWidth="1" strokeDasharray="3 5" />

        {/* Degree labels / Heading markers */}
        <text x="300" y="36" textAnchor="middle" fill="currentColor" fontSize="11" fontFamily="monospace" fontWeight="700">000° N</text>
        <text x="564" y="304" textAnchor="start" fill="currentColor" fontSize="11" fontFamily="monospace" fontWeight="700">090° E</text>
        <text x="300" y="574" textAnchor="middle" fill="currentColor" fontSize="11" fontFamily="monospace" fontWeight="700">180° S</text>
        <text x="36" y="304" textAnchor="end" fill="currentColor" fontSize="11" fontFamily="monospace" fontWeight="700">270° W</text>

        {/* Aviation Range labels */}
        <text x="308" y="225" fill="currentColor" fontSize="9" fontFamily="monospace" fontWeight="600">50 NM</text>
        <text x="308" y="155" fill="currentColor" fontSize="9" fontFamily="monospace" fontWeight="600">100 NM</text>
        <text x="308" y="85" fill="currentColor" fontSize="9" fontFamily="monospace" fontWeight="600">150 NM</text>

        {/* Target blips */}
        <g opacity="0.95">
          <circle cx="420" cy="210" r="4" fill="currentColor" />
          <line x1="420" y1="210" x2="438" y2="192" stroke="currentColor" strokeWidth="1" />
          <text x="442" y="192" fill="currentColor" fontSize="8" fontFamily="monospace" fontWeight="600">FL330</text>
        </g>
        <g opacity="0.8">
          <circle cx="210" cy="380" r="4" fill="currentColor" />
          <line x1="210" y1="380" x2="192" y2="398" stroke="currentColor" strokeWidth="1" />
          <text x="150" y="410" fill="currentColor" fontSize="8" fontFamily="monospace" fontWeight="600">FL180</text>
        </g>
      </svg>
    </div>
  );
}
