"use client";

// Canvas required: Time-Lapse export uses captureStream

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Download, Pause, Play, RotateCcw } from "lucide-react";
import type { ActivityData } from "@/types/dashboard";

const C_TOP = "#bcd6ff";
const C_BASE_HI = "#6f9bf2";
const C_BASE_LO = "#2f63d8";
const C_DARK = "#16356f";
const C_EMPTY_TOP = "#141c2e";
const C_EMPTY_SIDE = "#0d1424";
const GRID_LINE = "rgba(120,150,220,0.16)";
const STAGE_TOP = "#10182b";
const STAGE_BOTTOM = "#070a12";

const ROWS = 7;
const DEFAULT_DAYS = 98;

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function mix(a: string, b: string, t: number): string {
  const pa = hexToRgb(a);
  const pb = hexToRgb(b);
  const m = pa.map((v, i) => Math.round(v + (pb[i] - v) * t));
  return `rgb(${m[0]},${m[1]},${m[2]})`;
}

interface CubeSpec {
  col: number;
  row: number;
  height: number;
  count: number;
  date: string;
  intensity: number;
}

interface TooltipState {
  x: number;
  y: number;
  date: string;
  count: number;
}

const monthLabel = (date: string) => new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });

export interface ContributionCityProps {
  data: ActivityData[];
  days?: number;
}

export default function ContributionCity({ data, days = DEFAULT_DAYS }: ContributionCityProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hoverDataRef = useRef<{ x: number; y: number; count: number; date: string; radius: number }[]>([]);

  const [isDragging, setIsDragging] = useState(false);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const [isReplaying, setIsReplaying] = useState(false);
  const [replayIndex, setReplayIndex] = useState<number | null>(null);
  const replayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [timeLapse, setTimeLapse] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackIndex, setPlaybackIndex] = useState(days);
  const [isExporting, setIsExporting] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  const cameraRef = useRef({ rotY: 0.45, tiltX: 0.52, zoom: 1, dragStartX: 0, dragStartY: 0, startRotY: 0, startTiltX: 0 });

  const recent = useMemo(() => data.slice(-days), [data, days]);
  const totalDays = recent.length;
  const maxIndex = Math.min(days, recent.length);

  const currentMonth = useMemo(() => {
    const idx = isReplaying && replayIndex !== null ? replayIndex : playbackIndex;
    const day = recent[Math.min(Math.max(idx - 1, 0), recent.length - 1)];
    return day ? monthLabel(day.date) : "";
  }, [isReplaying, replayIndex, playbackIndex, recent]);

  const stopReplay = useCallback(() => {
    if (replayTimerRef.current) clearTimeout(replayTimerRef.current);
    setIsReplaying(false);
    setReplayIndex(null);
  }, []);

  const startReplay = useCallback(() => {
    if (replayTimerRef.current) clearTimeout(replayTimerRef.current);
    setIsReplaying(true);
    setReplayIndex(1);
  }, []);

  useEffect(() => {
    if (!isReplaying || replayIndex === null) return;
    if (replayIndex >= totalDays) {
      replayTimerRef.current = setTimeout(() => stopReplay(), 800);
      return;
    }
    const delay = replayIndex < 10 ? 30 : 12;
    replayTimerRef.current = setTimeout(() => setReplayIndex((prev) => (prev !== null ? prev + 1 : null)), delay);
    return () => {
      if (replayTimerRef.current) clearTimeout(replayTimerRef.current);
    };
  }, [isReplaying, replayIndex, totalDays, stopReplay]);

  useEffect(() => {
    if (!timeLapse) {
      setPlaybackIndex(days);
      setIsPlaying(false);
      return;
    }
    if (!isPlaying) return;

    let frame = 0;
    let lastTime = performance.now();
    const tick = (time: number) => {
      if (time - lastTime > 60) {
        setPlaybackIndex((prev) => {
          if (prev >= maxIndex) {
            setIsPlaying(false);
            return maxIndex;
          }
          return Math.min(prev + 7, maxIndex);
        });
        lastTime = time;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [timeLapse, isPlaying, maxIndex, days]);

  useEffect(
    () => () => {
      if (replayTimerRef.current) clearTimeout(replayTimerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") mediaRecorderRef.current.stop();
    },
    [],
  );

  const handleExport = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (typeof window === "undefined" || !window.MediaRecorder) {
      window.alert("Your browser does not support the MediaRecorder API needed for export.");
      return;
    }

    try {
      const stream = (canvas as HTMLCanvasElement & { captureStream(fps?: number): MediaStream }).captureStream(60);

      let mimeType = "";
      for (const candidate of ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm", "video/mp4"]) {
        if (typeof MediaRecorder.isTypeSupported !== "function" || MediaRecorder.isTypeSupported(candidate)) {
          mimeType = candidate;
          break;
        }
      }

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recordedChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) recordedChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const ext = mimeType.includes("mp4") ? "mp4" : "webm";
        const blob = new Blob(recordedChunksRef.current, { type: mimeType || "video/webm" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.style.display = "none";
        a.href = url;
        a.download = `contribution-timelapse.${ext}`;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }, 100);
        setIsExporting(false);
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsExporting(true);
      setPlaybackIndex(7);
      setIsPlaying(true);
    } catch {
      window.alert("Failed to start export recording. Make sure your browser supports captureStream.");
      setIsExporting(false);
    }
  }, []);

  useEffect(() => {
    if (!isExporting || isPlaying || playbackIndex < maxIndex) return;
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();
  }, [isExporting, isPlaying, playbackIndex, maxIndex]);

  const cubes = useCallback((): CubeSpec[] => {
    const max = Math.max(...recent.map((d) => d.count), 1);
    const visibleData = timeLapse ? recent.slice(0, playbackIndex) : recent;
    const visibleCount = replayIndex !== null ? replayIndex : visibleData.length;

    return visibleData.map((d, i) => ({
      col: Math.floor(i / ROWS),
      row: i % ROWS,
      height: i >= visibleCount ? 0.04 : d.count === 0 ? 0.04 : 0.1 + 0.9 * (d.count / max),
      count: i >= visibleCount ? 0 : d.count,
      date: d.date,
      intensity: i >= visibleCount ? 0 : d.intensity,
    }));
  }, [recent, timeLapse, playbackIndex, replayIndex]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const bg = ctx.createRadialGradient(W / 2, 0, 0, W / 2, 0, Math.max(W, H) * 1.1);
    bg.addColorStop(0, STAGE_TOP);
    bg.addColorStop(0.7, STAGE_BOTTOM);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    const cam = cameraRef.current;
    const zoom = cam.zoom;
    const baseW = Math.min(W, H) * 0.065 * zoom;
    const tileW = baseW;
    const tileH = baseW * 0.5;
    const maxCubeHeight = Math.min(W, H) * 0.35 * zoom;

    const cosY = Math.cos(cam.rotY);
    const sinY = Math.sin(cam.rotY);
    const cosX = Math.cos(cam.tiltX);
    const sinX = Math.sin(cam.tiltX);

    const specs = cubes();
    const cols = Math.max(1, Math.ceil(recent.length / ROWS));
    const gridH = (cols + ROWS) * (tileH / 2);
    const offsetX = W / 2;
    const offsetY = H / 2;

    const project = (wx: number, wy: number, wz: number) => {
      const rx = wx * cosY - wz * sinY;
      const rz = wx * sinY + wz * cosY;
      const ry2 = wy * cosX - rz * sinX;
      const rz2 = wy * sinX + rz * cosX;
      return { cx: offsetX + rx * tileW, cy: offsetY - ry2 * tileH - rz2 * (tileH * 0.1) + gridH * 0.25 };
    };

    const sorted = [...specs].sort((a, b) => a.col * sinY + a.row * cosY - (b.col * sinY + b.row * cosY));
    hoverDataRef.current = [];

    const drawFace = (pts: { cx: number; cy: number }[], color: string) => {
      ctx.beginPath();
      ctx.moveTo(pts[0].cx, pts[0].cy);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].cx, pts[i].cy);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = STAGE_BOTTOM;
      ctx.lineWidth = 0.5;
      ctx.stroke();
    };

    for (const cube of sorted) {
      const { col, row, height } = cube;
      const cubeH = height * maxCubeHeight;
      const wx = col - cols / 2;
      const wz = row - ROWS / 2;

      const b0 = project(wx, 0, wz);
      const b1 = project(wx + 1, 0, wz);
      const b2 = project(wx + 1, 0, wz + 1);
      const b3 = project(wx, 0, wz + 1);

      const cubeHWorld = cubeH / tileH;
      const t0 = project(wx, cubeHWorld, wz);
      const t1 = project(wx + 1, cubeHWorld, wz);
      const t2 = project(wx + 1, cubeHWorld, wz + 1);
      const t3 = project(wx, cubeHWorld, wz + 1);

      const centerX = (t0.cx + t1.cx + t2.cx + t3.cx) / 4;
      const centerY = (t0.cy + t1.cy + t2.cy + t3.cy) / 4;
      hoverDataRef.current.push({ x: centerX, y: centerY, count: cube.count, date: cube.date, radius: tileW * 0.45 });

      const t = cube.intensity / 4;
      const empty = cube.count === 0;
      const topColor = empty ? C_EMPTY_TOP : mix(C_BASE_HI, C_TOP, 0.35 + t * 0.65);
      const leftColor = empty ? C_EMPTY_SIDE : mix(C_DARK, C_BASE_LO, 0.45 + t * 0.4);
      const rightColor = empty ? C_EMPTY_SIDE : mix(C_DARK, C_BASE_HI, 0.3 + t * 0.35);

      drawFace([b0, b3, t3, t0], leftColor);
      drawFace([b1, b2, t2, t1], rightColor);
      drawFace([t0, t1, t2, t3], topColor);

      if (cube.intensity >= 3 && cube.count > 0) {
        const glowRadius = tileW * 0.35;
        const grd = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, glowRadius);
        grd.addColorStop(0, `${C_TOP}88`);
        grd.addColorStop(1, `${C_TOP}00`);
        ctx.beginPath();
        ctx.ellipse(centerX, centerY, glowRadius, glowRadius * 0.5, 0, 0, Math.PI * 2);
        ctx.fillStyle = grd;
        ctx.fill();
      }
    }

    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = GRID_LINE;
    ctx.lineWidth = 0.8;
    for (let c = 0; c <= cols; c++) {
      const a = project(c - cols / 2, 0, -ROWS / 2);
      const b = project(c - cols / 2, 0, ROWS / 2);
      ctx.beginPath();
      ctx.moveTo(a.cx, a.cy);
      ctx.lineTo(b.cx, b.cy);
      ctx.stroke();
    }
    for (let r = 0; r <= ROWS; r++) {
      const a = project(-cols / 2, 0, r - ROWS / 2);
      const b = project(cols / 2, 0, r - ROWS / 2);
      ctx.beginPath();
      ctx.moveTo(a.cx, a.cy);
      ctx.lineTo(b.cx, b.cy);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }, [cubes, recent.length]);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(container.clientWidth * dpr);
      canvas.height = Math.round(container.clientHeight * dpr);
      canvas.style.width = `${container.clientWidth}px`;
      canvas.style.height = `${container.clientHeight}px`;
      draw();
    };

    const ro = new ResizeObserver(resize);
    ro.observe(container);
    resize();
    return () => ro.disconnect();
  }, [draw]);

  useEffect(() => {
    draw();
  }, [draw]);

  const canvasScale = () => {
    const canvas = canvasRef.current;
    if (!canvas) return 1;
    const rect = canvas.getBoundingClientRect();
    return rect.width > 0 ? canvas.width / rect.width : 1;
  };

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setIsDragging(true);
    const cam = cameraRef.current;
    cam.dragStartX = e.clientX;
    cam.dragStartY = e.clientY;
    cam.startRotY = cam.rotY;
    cam.startTiltX = cam.tiltX;
    setTooltip(null);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const cam = cameraRef.current;
    if (isDragging) {
      cam.rotY = cam.startRotY + (e.clientX - cam.dragStartX) * 0.008;
      cam.tiltX = Math.max(0.1, Math.min(1.2, cam.startTiltX + (e.clientY - cam.dragStartY) * 0.005));
      draw();
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scale = canvasScale();
    const mouseX = (e.clientX - rect.left) * scale;
    const mouseY = (e.clientY - rect.top) * scale;

    const hit = hoverDataRef.current.find((tower) => Math.hypot(mouseX - tower.x, mouseY - tower.y) <= tower.radius);
    if (hit) {
      setTooltip({ x: hit.x / scale, y: hit.y / scale, count: hit.count, date: hit.date });
    } else {
      setTooltip(null);
    }
  };

  const onPointerUp = () => setIsDragging(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      const cam = cameraRef.current;
      cam.zoom = Math.max(0.4, Math.min(2.5, cam.zoom - e.deltaY * 0.001));
      draw();
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, [draw]);

  const lastPinchRef = useRef<number | null>(null);
  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length !== 2) return;
    const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
    if (lastPinchRef.current !== null) {
      const cam = cameraRef.current;
      cam.zoom = Math.max(0.4, Math.min(2.5, cam.zoom + (dist - lastPinchRef.current) * 0.003));
      draw();
    }
    lastPinchRef.current = dist;
  };

  const tabStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "7px 10px",
    borderRadius: "12px",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "rgba(120,160,255,0.4)",
    background: "rgba(70,110,235,0.16)",
    backdropFilter: "blur(10px)",
    color: "#9cc0ff",
  };

  const iconBtn = (active = false): React.CSSProperties => ({
    display: "grid",
    placeItems: "center",
    width: "28px",
    height: "28px",
    borderRadius: "8px",
    background: active ? "rgba(120,160,255,0.22)" : "transparent",
    color: "#9cc0ff",
    transition: "background .18s",
  });

  const divider = <span style={{ width: "1px", height: "18px", background: "rgba(120,160,255,0.28)" }} />;

  const progress = isReplaying && replayIndex !== null ? (replayIndex / Math.max(1, totalDays)) * 100 : timeLapse ? (playbackIndex / Math.max(1, maxIndex)) * 100 : 0;

  return (
    <div style={{ position: "relative", width: "100%" }}>
      <div ref={containerRef} style={{ width: "100%", minHeight: "420px", height: "420px", cursor: isDragging ? "grabbing" : "grab", touchAction: "none" }}>
        <canvas
          ref={canvasRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerLeave={() => setTooltip(null)}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onTouchMove={onTouchMove}
          onTouchEnd={() => {
            lastPinchRef.current = null;
          }}
          style={{ display: "block" }}
        />
      </div>

      {}
      <div className="ui" style={{ position: "absolute", left: "16px", top: "16px", zIndex: 2, display: "flex", alignItems: "center", gap: "11px" }}>
        {!timeLapse && (
          <button
            onClick={isReplaying ? stopReplay : startReplay}
            title={isReplaying ? "Stop replay" : "Replay My Year"}
            style={{
              ...tabStyle,
              padding: "9px 16px",
              fontSize: "13px",
              fontWeight: 600,
              background: isReplaying ? "rgba(120,160,255,0.3)" : "rgba(70,110,235,0.16)",
              borderColor: isReplaying ? "rgba(150,185,255,0.7)" : "rgba(120,160,255,0.4)",
            }}
          >
            {isReplaying ? (
              <svg width={11} height={11} viewBox="0 0 10 10" fill="currentColor" aria-hidden>
                <rect x="1" y="1" width="8" height="8" rx="1" />
              </svg>
            ) : (
              <svg width={11} height={11} viewBox="0 0 10 10" fill="currentColor" aria-hidden>
                <polygon points="2,1 9,5 2,9" />
              </svg>
            )}
            {isReplaying ? "Stop" : "Replay My Year"}
          </button>
        )}

        {}
        {isReplaying && (
          <span className="mono" style={{ fontSize: "12.5px", fontWeight: 600, color: "#9cc0ff", letterSpacing: ".02em" }}>
            {currentMonth}
          </span>
        )}

        {!isReplaying && !timeLapse && (
          <button
            onClick={() => {
              setTimeLapse(true);
              setPlaybackIndex(7);
              setIsPlaying(true);
            }}
            title="Turn on Time-Lapse"
            style={{ ...tabStyle, padding: "9px 16px", fontSize: "13px", fontWeight: 600 }}
          >
            <Play size={12} />
            Time-Lapse
          </button>
        )}

        {}
        {timeLapse && (
          <div style={tabStyle}>
            <button
              onClick={() => {
                if (playbackIndex >= maxIndex) setPlaybackIndex(7);
                setIsPlaying((v) => !v);
              }}
              disabled={isExporting}
              aria-label={isPlaying ? "Pause" : "Play"}
              title={isPlaying ? "Pause" : "Play"}
              style={{ ...iconBtn(), opacity: isExporting ? 0.5 : 1, cursor: isExporting ? "not-allowed" : "pointer" }}
            >
              {isPlaying ? <Pause size={16} /> : <Play size={16} />}
            </button>
            <button
              onClick={() => {
                setPlaybackIndex(7);
                setIsPlaying(true);
              }}
              disabled={isExporting}
              aria-label="Restart"
              title="Restart"
              style={{ ...iconBtn(), opacity: isExporting ? 0.5 : 1, cursor: isExporting ? "not-allowed" : "pointer" }}
            >
              <RotateCcw size={16} />
            </button>
            {divider}
            <span className="mono" style={{ fontSize: "12.5px", fontWeight: 600, minWidth: "68px", textAlign: "center" }}>
              {currentMonth}
            </span>
            {divider}
            <button onClick={handleExport} disabled={isExporting} title="Export as WebM video" style={{ ...iconBtn(isExporting), width: "auto", padding: "0 10px", gap: "6px", display: "inline-flex", fontSize: "12.5px", fontWeight: 600, cursor: isExporting ? "wait" : "pointer" }}>
              {isExporting ? (
                <>
                  <span style={{ width: "12px", height: "12px", borderRadius: "50%", border: "2px solid rgba(156,192,255,0.3)", borderTopColor: "#9cc0ff", animation: "sf-spin .8s linear infinite" }} />
                  Recording…
                </>
              ) : (
                <>
                  <Download size={14} />
                  Export
                </>
              )}
            </button>
            {divider}
            <button
              onClick={() => {
                setTimeLapse(false);
                setIsPlaying(false);
              }}
              disabled={isExporting}
              aria-label="Exit Time-Lapse"
              title="Exit Time-Lapse"
              style={{ ...iconBtn(), opacity: isExporting ? 0.5 : 1, cursor: isExporting ? "not-allowed" : "pointer" }}
            >
              <svg width={13} height={13} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
                <path d="M4 4l8 8M12 4l-8 8" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {tooltip && (
        <div
          className="ui"
          style={{
            position: "absolute",
            left: `${tooltip.x}px`,
            top: `${tooltip.y}px`,
            transform: "translate(-50%,-120%)",
            pointerEvents: "none",
            zIndex: 3,
            padding: "9px 13px",
            borderRadius: "12px",
            background: "rgba(9,12,22,0.92)",
            borderWidth: "1px",
            borderStyle: "solid",
            borderColor: "rgba(120,160,255,0.4)",
            whiteSpace: "nowrap",
            boxShadow: "0 10px 30px -12px rgba(0,0,0,.8)",
          }}
        >
          <div style={{ fontSize: "13px", fontWeight: 600, color: "#cfe0ff" }}>
            {tooltip.count} contribution{tooltip.count === 1 ? "" : "s"}
          </div>
          <div className="mono" style={{ fontSize: "11.5px", color: "rgba(156,192,255,0.7)", marginTop: "2px" }}>
            {tooltip.date}
          </div>
        </div>
      )}

      <div className="ui" style={{ position: "absolute", right: "16px", bottom: "14px", fontSize: "12px", color: "rgba(160,180,220,0.55)", pointerEvents: "none" }}>
        Drag to rotate · Scroll to zoom
      </div>

      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "3px", background: "rgba(120,150,220,0.12)" }}>
        <div style={{ height: "100%", width: `${progress}%`, background: "linear-gradient(90deg,#3470ee,#6f9bf2)", transition: "width .1s linear" }} />
      </div>
    </div>
  );
}
