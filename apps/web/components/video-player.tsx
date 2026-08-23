'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface VideoPlayerProps {
  lessonId: string;
  userEmail?: string;
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

const SAVE_INTERVAL_MS = 8000;
const COMPLETION_THRESHOLD = 0.9;

// Multi-position watermark that moves every few seconds
function WatermarkOverlay({ email }: { email: string }) {
  const [positions, setPositions] = useState<WatermarkPos[]>([
    { x: 10, y: 10, opacity: 0.22 },
    { x: 55, y: 45, opacity: 0.18 },
    { x: 20, y: 75, opacity: 0.20 },
  ]);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const move = () => {
      setPositions([
        { x: Math.random() * 60 + 5, y: Math.random() * 30 + 5, opacity: 0.18 + Math.random() * 0.1 },
        { x: Math.random() * 60 + 5, y: Math.random() * 30 + 40, opacity: 0.16 + Math.random() * 0.1 },
        { x: Math.random() * 60 + 5, y: Math.random() * 30 + 65, opacity: 0.17 + Math.random() * 0.1 },
      ]);
    };

    const interval = setInterval(move, 3500);

    const onVisibility = () => {
      if (document.hidden) {
        setVisible(false);
      } else {
        setVisible(true);
      }
    };

    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  if (!visible) return null;

  const label = email.length > 32 ? email.slice(0, 29) + '…' : email;
  const date = new Date().toLocaleDateString('en-IN');

  return (
    <div
      className="absolute inset-0 pointer-events-none select-none"
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
            textShadow: '0 1px 2px rgba(0,0,0,0.8)',
            userSelect: 'none',
            pointerEvents: 'none',
          }}
        >
          {label} · {date}
        </span>
      ))}
    </div>
  );
}

// Black curtain shown on visibility loss (tab switch / window blur)
function SecurityCurtain({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div
      className="absolute inset-0 bg-black flex items-center justify-center"
      style={{ zIndex: 20 }}
    >
      <p className="text-white text-sm opacity-70 select-none">
        Switch back to continue watching
      </p>
    </div>
  );
}

export function VideoPlayer({ lessonId, userEmail = '' }: VideoPlayerProps) {
  const [otpData, setOtpData] = useState<OtpData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [resumeAt, setResumeAt] = useState(0);
  const [hidden, setHidden] = useState(false);

  const positionRef = useRef(0);
  const durationRef = useRef(0);
  const saveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const savedRef = useRef(0); // last saved position — avoid redundant writes

  // ── Fetch resume position ─────────────────────────────────────────────────
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
  const fetchOtp = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/video-otp/${lessonId}`, {
        method: 'POST',
        cache: 'no-store',
      });
      if (res.status === 403) { setError('You are not enrolled in this course.'); return; }
      if (res.status === 404) { setError('Video not available.'); return; }
      if (!res.ok) { setError('Playback unavailable. Try refreshing.'); return; }
      const json = await res.json();
      setOtpData(json);
    } catch {
      setError('Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  }, [lessonId]);

  useEffect(() => { fetchOtp(); }, [fetchOtp]);

  // ── Save progress ─────────────────────────────────────────────────────────
  const saveProgress = useCallback((pos: number, completed: boolean) => {
    if (Math.abs(pos - savedRef.current) < 3 && !completed) return; // skip tiny diffs
    savedRef.current = pos;
    const dto: Record<string, unknown> = {
      last_position_seconds: Math.floor(pos),
      status: completed ? 'completed' : 'in_progress',
    };
    if (durationRef.current > 0) {
      dto.progress_percent = Math.min(100, Math.round((pos / durationRef.current) * 100));
    }
    fetch(`/api/progress/${lessonId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dto),
    }).catch(() => null);
  }, [lessonId]);

  // ── Periodic save every SAVE_INTERVAL_MS ─────────────────────────────────
  useEffect(() => {
    saveTimerRef.current = setInterval(() => {
      if (positionRef.current > 0) saveProgress(positionRef.current, false);
    }, SAVE_INTERVAL_MS);
    return () => {
      if (saveTimerRef.current) clearInterval(saveTimerRef.current);
    };
  }, [saveProgress]);

  // ── VdoCipher postMessage events ──────────────────────────────────────────
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // VdoCipher sends messages from player.vdocipher.com
      if (!event.origin.includes('vdocipher.com')) return;
      const msg = event.data;
      if (!msg || typeof msg !== 'object') return;

      if (msg.event === 'timeupdate' && typeof msg.currentTime === 'number') {
        positionRef.current = msg.currentTime;
        if (typeof msg.duration === 'number' && msg.duration > 0) {
          durationRef.current = msg.duration;
        }
        // Auto-complete at 90%
        if (
          durationRef.current > 0 &&
          msg.currentTime / durationRef.current >= COMPLETION_THRESHOLD
        ) {
          saveProgress(msg.currentTime, true);
        }
      }

      if (msg.event === 'ended') {
        saveProgress(positionRef.current, true);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [saveProgress]);

  // ── Visibility / focus — hide video when tab loses focus ─────────────────
  useEffect(() => {
    const onVisibility = () => {
      const isHidden = document.hidden;
      setHidden(isHidden);
      // Pause via postMessage to player
      if (iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.postMessage(
          { event: isHidden ? 'pause' : 'play' },
          'https://player.vdocipher.com',
        );
      }
      // Save position on hide
      if (isHidden && positionRef.current > 0) {
        saveProgress(positionRef.current, false);
      }
    };

    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [saveProgress]);

  // ── Block common screenshot/recording keyboard shortcuts ─────────────────
  useEffect(() => {
    const block = (e: KeyboardEvent) => {
      // PrintScreen, Win+Shift+S, Win+G (Xbox game bar), Cmd+Shift+3/4/5
      if (
        e.key === 'PrintScreen' ||
        (e.shiftKey && e.metaKey && ['3', '4', '5', 's', 'S'].includes(e.key)) ||
        (e.shiftKey && e.ctrlKey && ['s', 'S'].includes(e.key))
      ) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    document.addEventListener('keydown', block, { capture: true });
    return () => document.removeEventListener('keydown', block, { capture: true });
  }, []);

  // ── Save on unmount ───────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (positionRef.current > 0) saveProgress(positionRef.current, false);
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

  const iframeSrc =
    `https://player.vdocipher.com/v2/?otp=${otpData.otp}&playbackInfo=${otpData.playbackInfo}` +
    (resumeAt > 5 ? `&starttime=${resumeAt}` : '');

  return (
    <div
      className="relative w-full rounded-lg overflow-hidden bg-black"
      style={{ paddingTop: '56.25%' }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <iframe
        ref={iframeRef}
        src={iframeSrc}
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
        allow="encrypted-media *"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
      />
      {userEmail && <WatermarkOverlay email={userEmail} />}
      <SecurityCurtain show={hidden} />
    </div>
  );
}
