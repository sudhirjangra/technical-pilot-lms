'use client';

import { useEffect, useRef } from 'react';

const RADAR_RINGS = [100, 76, 52, 28];

const PARALLAX_CHIPS = [
  { label: 'ATPL', top: '6%', left: '4%', depth: 90, delay: '0s' },
  { label: 'DGCA', top: '18%', left: '78%', depth: 130, delay: '1.2s' },
  { label: 'NAV', top: '72%', left: '2%', depth: 110, delay: '2.1s' },
  { label: 'MET', top: '84%', left: '70%', depth: 70, delay: '0.6s' },
] as const;

const HeroAviation = () => {
  const sceneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let frame = 0;
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;
    let idle = true;

    const onPointerMove = (event: PointerEvent) => {
      idle = false;
      targetX = (event.clientY / window.innerHeight - 0.5) * -2;
      targetY = (event.clientX / window.innerWidth - 0.5) * 2;
    };

    const tick = (time: number) => {
      // Falls back to a slow autonomous drift until the pointer is used.
      if (idle) {
        targetX = Math.sin(time / 2600) * 0.45;
        targetY = Math.cos(time / 3400) * 0.6;
      }

      currentX += (targetX - currentX) * 0.05;
      currentY += (targetY - currentY) * 0.05;

      scene.style.setProperty('--rx', `${(currentX * 14).toFixed(3)}deg`);
      scene.style.setProperty('--ry', `${(currentY * 20).toFixed(3)}deg`);

      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    window.addEventListener('pointermove', onPointerMove, { passive: true });

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('pointermove', onPointerMove);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none relative mx-auto aspect-square w-full max-w-[260px] select-none [perspective:1200px] sm:max-w-[320px] md:max-w-[380px] lg:max-w-[440px]"
    >
      <div
        ref={sceneRef}
        className="relative size-full [transform-style:preserve-3d] [transform:rotateX(var(--rx,0deg))_rotateY(var(--ry,0deg))]"
      >
        {/* Depth glow */}
        <div className="absolute inset-[12%] [transform:translateZ(-140px)]">
          <div className="size-full rounded-full bg-primary/15 blur-3xl" />
        </div>

        {/* Radar rings */}
        {RADAR_RINGS.map((size, index) => (
          <div
            key={size}
            className="absolute left-1/2 top-1/2 rounded-full border border-border/70 [transform:translate(-50%,-50%)_translateZ(var(--z))]"
            style={
              {
                width: `${size}%`,
                height: `${size}%`,
                '--z': `${-60 + index * 22}px`,
              } as React.CSSProperties
            }
          />
        ))}

        {/* Radar sweep */}
        <div className="absolute inset-[12%] [transform:translateZ(-30px)]">
          <div className="size-full animate-radar-sweep rounded-full opacity-60 [background:conic-gradient(from_0deg,transparent_0deg,transparent_300deg,color-mix(in_oklab,var(--primary)_45%,transparent)_360deg)]" />
        </div>

        {/* Crosshair */}
        <div className="absolute inset-[12%] [transform:translateZ(-28px)]">
          <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-border/60" />
          <div className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-border/60" />
        </div>

        {/* Ping pulses */}
        <div className="absolute inset-[12%] [transform:translateZ(10px)]">
          <div className="size-full animate-ring-pulse rounded-full border border-primary/50" />
        </div>
        <div className="absolute inset-[12%] [transform:translateZ(10px)]">
          <div className="size-full animate-ring-pulse rounded-full border border-primary/50 [animation-delay:1.6s]" />
        </div>

        {/* Dashed flight path + orbiting aircraft */}
        <div className="absolute inset-[6%] [transform:translateZ(60px)]">
          <div className="size-full rounded-full border border-dashed border-primary/40" />
        </div>
        <div className="absolute inset-[6%] [transform:translateZ(60px)]">
          <div className="size-full animate-orbit">
            <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 text-primary">
              <svg
                viewBox="0 0 24 24"
                fill="currentColor"
                className="size-6 rotate-90 drop-shadow-[0_0_10px_var(--primary)] sm:size-7 md:size-8"
              >
                <path d="M21 15.5 13.5 12V6.2a1.5 1.5 0 0 0-3 0V12L3 15.5v2l7.5-2.2v3.4l-2.2 1.6v1.4l3.7-1 3.7 1v-1.4l-2.2-1.6v-3.4l7.5 2.2z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Counter-orbiting satellite blip */}
        <div className="absolute inset-[26%] [transform:translateZ(30px)]">
          <div className="size-full animate-orbit-reverse">
            <div className="absolute left-1/2 top-0 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary shadow-[0_0_12px_2px_var(--primary)]" />
          </div>
        </div>

        {/* Floating parallax chips */}
        {PARALLAX_CHIPS.map((chip) => (
          <div
            key={chip.label}
            className="absolute [transform:translateZ(var(--z))]"
            style={
              {
                top: chip.top,
                left: chip.left,
                '--z': `${chip.depth}px`,
              } as React.CSSProperties
            }
          >
            <span
              className="animate-float-y inline-flex rounded-md border border-border/80 bg-background/70 px-2 py-1 text-[10px] font-medium tracking-widest text-muted-foreground backdrop-blur-sm sm:text-xs"
              style={{ animationDelay: chip.delay }}
            >
              {chip.label}
            </span>
          </div>
        ))}

        {/* Horizon plate */}
        <div className="absolute inset-x-[18%] bottom-[8%] h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent [transform:translateZ(-100px)]" />
      </div>
    </div>
  );
};

export default HeroAviation;
