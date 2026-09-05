'use client';

import Script from 'next/script';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface VideoPlayerProps {
  lessonId: string;
}

interface OtpData {
  otp: string;
  playbackInfo: string;
}

interface WatermarkPos {
  x: number;
  y: number;
  opacity: number;
}

// How often we auto-save position to server (ms)
const SAVE_INTERVAL_MS = 8000;
// Mark lesson completed when this fraction of video watched
const COMPLETION_THRESHOLD = 0.9;
// Minimum progress % required before manually marking as completed
const MANUAL_COMPLETE_MIN_PROGRESS = 80;

declare global {
  interface Window {
    VdoPlayer?: {
      getInstance: (iframe: HTMLIFrameElement) => VdoPlayerInstance;
    };
    onVdoPlayerV2APIReady?: () => void;
  }
}

interface VdoPlayerInstance {
  video: {
    currentTime: number;
    duration: number;
    paused: boolean;
    play: () => Promise<void>;
    pause: () => Promise<void>;
    addEventListener: (event: string, handler: () => void) => void;
    removeEventListener: (event: string, handler: () => void) => void;
  };
  api: {
    getTotalPlayed: () => Promise<number>;
    getTotalCovered: () => Promise<number>;
  };
}

// Multi-position randomly-moving overlay watermark
function WatermarkOverlay() {
  const [positions, setPositions] = useState<WatermarkPos[]>([
    { x: 8, y: 8, opacity: 0.22 },
    { x: 52, y: 42, opacity: 0.18 },
    { x: 18, y: 72, opacity: 0.20 },
  ]);

  useEffect(() => {
    const interval = setInterval(() => {
      setPositions([
        { x: Math.random() * 65 + 5, y: Math.random() * 28 + 4, opacity: 0.18 + Math.random() * 0.1 },
        { x: Math.random() * 65 + 5, y: Math.random() * 28 + 38, opacity: 0.16 + Math.random() * 0.1 },
        { x: Math.random() * 65 + 5, y: Math.random() * 28 + 68, opacity: 0.17 + Math.random() * 0.1 },
      ]);
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  const label = 'Technical Pilot. All rights reserved 2026.';

  return (
    <div
      className="absolute inset-0 pointer-events-none select-none overflow-hidden"
      style={{ zIndex: 10 }}
      aria-hidden="true"
    >
      {positions.map((pos, i) => (
        <span
          key={i}
          style={{
            position: 'absolute',
            left: `${pos.x}%`,
            top: `${pos.y}%`,
            opacity: pos.opacity,
            color: '#fff',
            fontSize: '11px',
            fontFamily: 'monospace',
            fontWeight: 600,
            letterSpacing: '0.03em',
            whiteSpace: 'nowrap',
            textShadow: '0 1px 3px rgba(0,0,0,0.9)',
            userSelect: 'none',
            pointerEvents: 'none',
          }}
        >
          {label}
        </span>
      ))}
    </div>
  );
}

export function VideoPlayer({ lessonId }: VideoPlayerProps) {
  const router = useRouter();
  const [otpData, setOtpData] = useState<OtpData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [resumeAt, setResumeAt] = useState(0);
  const [hidden, setHidden] = useState(false);
  const [apiReady, setApiReady] = useState(false);

  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const playerRef = useRef<VdoPlayerInstance | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastSavedRef = useRef(0);
  // Highest playback position naturally reached — used to block forward seeking/scrubbing.
  const maxWatchedRef = useRef(0);
  const seekingBackRef = useRef(false);
  const hasNotifiedCompleteRef = useRef(false);

  // ── Fetch resume position from server ────────────────────────────────────
  useEffect(() => {
    fetch(`/api/progress/${lessonId}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.last_position_seconds && d.last_position_seconds > 5) {
          setResumeAt(d.last_position_seconds);
        }
      })
      .catch(() => null);
  }, [lessonId]);

  // ── Fetch OTP ─────────────────────────────────────────────────────────────
  useEffect(() => {
    async function fetchOtp() {
      try {
        const res = await fetch(`/api/video-otp/${lessonId}`, {
          method: 'POST',
          cache: 'no-store',
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          const errMsg =
            data?.message ||
            data?.error ||
            (res.status === 403
              ? 'Access denied. Active enrollment required.'
              : res.status === 404
                ? 'Video not available.'
                : 'Playback unavailable. Try refreshing.');
          setError(errMsg);
          return;
        }
        setOtpData(await res.json());
      } catch {
        setError('Network error. Please check your connection.');
      } finally {
        setLoading(false);
      }
    }
    fetchOtp();
  }, [lessonId]);

  // ── Save progress helper ─────────────────────────────────────────────────
  const saveProgress = useCallback((posSeconds: number, completed: boolean, force = false) => {
    const pos = Math.max(0, Math.floor(posSeconds));
    if (!force && !completed && Math.abs(pos - lastSavedRef.current) < 4) return;
    lastSavedRef.current = pos;

    const player = playerRef.current;
    const duration = player?.video?.duration ?? 0;
    const percent = duration > 0 ? Math.min(100, Math.round((pos / duration) * 100)) : 0;
    const finalCompleted = completed || (duration > 0 && pos >= duration * COMPLETION_THRESHOLD);
    const dto: Record<string, unknown> = {
      last_position_seconds: pos,
      status: finalCompleted ? 'completed' : 'in_progress',
      progress_percent: finalCompleted ? 100 : percent,
    };

    fetch(`/api/progress/${lessonId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dto),
      keepalive: true,
    }).catch(() => null);

    // Refresh server-rendered progress (sidebar, unlock state) exactly once when this
    // lesson transitions to completed, instead of on every timeupdate tick.
    if (finalCompleted && !hasNotifiedCompleteRef.current) {
      hasNotifiedCompleteRef.current = true;
      router.refresh();
    }
  }, [lessonId, router]);

  // ── Wire VdoCipher SDK after both iframe + api.js are ready ──────────────
  const initPlayer = useCallback(() => {
    if (!iframeRef.current || !window.VdoPlayer) return;

    const player = window.VdoPlayer.getInstance(iframeRef.current);
    playerRef.current = player;

    // Seek to saved position once metadata is loaded
    if (resumeAt > 5) {
      maxWatchedRef.current = resumeAt;
      const onLoaded = () => {
        player.video.currentTime = resumeAt;
        player.video.removeEventListener('loadedmetadata', onLoaded);
      };
      player.video.addEventListener('loadedmetadata', onLoaded);
    }

    // Track position changes
    const onTimeUpdate = () => {
      const pos = player.video.currentTime;
      const dur = player.video.duration;
      if (!seekingBackRef.current && pos > maxWatchedRef.current) {
        maxWatchedRef.current = pos;
      }
      if (dur > 0 && pos / dur >= COMPLETION_THRESHOLD) {
        saveProgress(pos, true, true);
      }
    };
    player.video.addEventListener('timeupdate', onTimeUpdate);

    // Prevent forward seeking/scrubbing past the furthest point naturally watched —
    // the video must be watched fully to be marked complete, not skipped ahead.
    const SEEK_TOLERANCE_SECONDS = 2;
    const onSeeked = () => {
      const pos = player.video.currentTime;
      if (pos > maxWatchedRef.current + SEEK_TOLERANCE_SECONDS) {
        seekingBackRef.current = true;
        player.video.currentTime = maxWatchedRef.current;
        setTimeout(() => {
          seekingBackRef.current = false;
        }, 200);
      }
    };
    player.video.addEventListener('seeked', onSeeked);

    // Save on natural end
    const onEnded = () => {
      saveProgress(player.video.currentTime, true, true);
    };
    player.video.addEventListener('ended', onEnded);

    return () => {
      player.video.removeEventListener('timeupdate', onTimeUpdate);
      player.video.removeEventListener('seeked', onSeeked);
      player.video.removeEventListener('ended', onEnded);
    };
  }, [resumeAt, saveProgress]);

  // Re-init when both otp data is set and api.js has loaded
  useEffect(() => {
    if (!otpData || !apiReady) return;
    let cleanup: (() => void) | undefined;
    // iframe needs a tick to be in the DOM after otpData is set
    const t = setTimeout(() => {
      cleanup = initPlayer();
    }, 500);
    return () => {
      clearTimeout(t);
      cleanup?.();
    };
  }, [otpData, apiReady, initPlayer]);

  // ── Periodic save ────────────────────────────────────────────────────────
  useEffect(() => {
    saveTimerRef.current = setInterval(() => {
      const player = playerRef.current;
      if (player && !player.video.paused) {
        saveProgress(player.video.currentTime, false);
      }
    }, SAVE_INTERVAL_MS);
    return () => {
      if (saveTimerRef.current) clearInterval(saveTimerRef.current);
    };
  }, [saveProgress]);

  // ── Visibility / focus — black screen + pause on hide ────────────────────
  useEffect(() => {
    const onVisibility = () => {
      const isHidden = document.hidden;
      setHidden(isHidden);
      const player = playerRef.current;
      if (player) {
        if (isHidden) {
          player.video.pause();
          const duration = player.video.duration || 0;
          const shouldComplete = duration > 0 && player.video.currentTime >= duration * COMPLETION_THRESHOLD;
          saveProgress(player.video.currentTime, shouldComplete, true);
        }
        // Don't auto-play on return — user should resume manually
      }
    };

    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [saveProgress]);

  // ── Block screenshot keyboard shortcuts ──────────────────────────────────
  useEffect(() => {
    const block = (e: KeyboardEvent) => {
      // PrintScreen (all OS), Win+Shift+S, Cmd+Shift+3/4/5 (macOS)
      if (
        e.key === 'PrintScreen' ||
        (e.shiftKey && e.metaKey && ['3', '4', '5', 's', 'S'].includes(e.key)) ||
        (e.shiftKey && (e.ctrlKey || e.metaKey) && ['s', 'S'].includes(e.key))
      ) {
        e.preventDefault();
        e.stopImmediatePropagation();
        // Flash the curtain briefly as deterrent
        setHidden(true);
        setTimeout(() => setHidden(false), 1500);
        const player = playerRef.current;
        if (player) player.video.pause();
      }
    };
    document.addEventListener('keydown', block, { capture: true });
    return () => document.removeEventListener('keydown', block, { capture: true });
  }, []);

  // ── Save on unmount ───────────────────────────────────────────────────────
  useEffect(() => {
    const handleBeforeUnload = () => {
      const player = playerRef.current;
      if (player) {
        const duration = player.video.duration || 0;
        const pos = player.video.currentTime;
        const shouldComplete = duration > 0 && pos >= duration * COMPLETION_THRESHOLD;
        saveProgress(pos, shouldComplete, true);
      }
    };

    const handlePageHide = () => {
      const player = playerRef.current;
      if (player) {
        const duration = player.video.duration || 0;
        const pos = player.video.currentTime;
        const shouldComplete = duration > 0 && pos >= duration * COMPLETION_THRESHOLD;
        saveProgress(pos, shouldComplete, true);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handlePageHide);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handlePageHide);
      const player = playerRef.current;
      if (player) {
        const duration = player.video.duration || 0;
        const pos = player.video.currentTime;
        const shouldComplete = duration > 0 && pos >= duration * COMPLETION_THRESHOLD;
        saveProgress(pos, shouldComplete, true);
      }
    };
  }, [saveProgress]);

  if (loading) {
    return (
      <div className="aspect-video bg-black flex items-center justify-center rounded-lg">
        <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="aspect-video bg-black flex items-center justify-center rounded-lg">
        <p className="text-red-400 text-sm px-6 text-center">{error}</p>
      </div>
    );
  }

  if (!otpData) return null;

  const iframeSrc = `https://player.vdocipher.com/v2/?otp=${otpData.otp}&playbackInfo=${otpData.playbackInfo}`;

  return (
    <>
      {/* VdoCipher player SDK — loaded once per page */}
      <Script
        src="https://player.vdocipher.com/v2/api.js"
        strategy="afterInteractive"
        onReady={() => setApiReady(true)}
        onLoad={() => setApiReady(true)}
      />

      <div
        className="relative w-full rounded-lg overflow-hidden bg-black"
        style={{ paddingTop: '56.25%' }}
        onContextMenu={(e) => e.preventDefault()}
      >
        <iframe
          ref={iframeRef}
          src={iframeSrc}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            border: 'none',
          }}
          allow="encrypted-media *"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />

        {/* HTML watermark overlay — rendered on top of iframe */}
        <WatermarkOverlay />

        {/* Security curtain — covers video on tab switch / screenshot key / window blur */}
        {hidden && (
          <div
            className="absolute inset-0 bg-black flex items-center justify-center"
            style={{ zIndex: 20 }}
          >
            <p className="text-white/60 text-sm select-none">
              Playback paused while this page is hidden
            </p>
          </div>
        )}
      </div>
    </>
  );
}
