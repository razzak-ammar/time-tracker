"use client";

import { TimeEntry, Project } from "@/types";
import { Button } from "@/components/ui/button";
import { useTimeTracking } from "@/hooks/useTimeTracking";
import { format } from "date-fns";
import {
  Square,
  Minimize2,
  Waves,
  Cloud,
  Sparkles,
  Sunset,
  Droplets,
  Palette,
} from "lucide-react";
import { useState, useEffect } from "react";

const TIMER_BG_KEY = "timetracker-fullscreen-bg";

export type TimerBackgroundId =
  | "waves"
  | "aurora"
  | "gradient"
  | "particles"
  | "ocean"
  | "sunset";

const BACKGROUNDS: { id: TimerBackgroundId; label: string; icon: React.ReactNode }[] = [
  { id: "waves", label: "Waves", icon: <Waves className="w-4 h-4" /> },
  { id: "aurora", label: "Aurora", icon: <Cloud className="w-4 h-4" /> },
  { id: "gradient", label: "Gradient", icon: <Palette className="w-4 h-4" /> },
  { id: "particles", label: "Particles", icon: <Sparkles className="w-4 h-4" /> },
  { id: "ocean", label: "Ocean", icon: <Droplets className="w-4 h-4" /> },
  { id: "sunset", label: "Sunset", icon: <Sunset className="w-4 h-4" /> },
];

function getStoredBackground(): TimerBackgroundId {
  if (typeof window === "undefined") return "ocean";
  const stored = localStorage.getItem(TIMER_BG_KEY) as TimerBackgroundId | null;
  return BACKGROUNDS.some((b) => b.id === stored) ? stored! : "ocean";
}

interface FullScreenTimerProps {
  timeEntry: TimeEntry;
  project: Project;
  elapsedTime: string;
  onMinimize: () => void;
}

export function FullScreenTimer({
  timeEntry,
  project,
  elapsedTime,
  onMinimize,
}: FullScreenTimerProps) {
  const { stopTracking } = useTimeTracking();
  const [background, setBackground] = useState<TimerBackgroundId>("ocean");
  const [showBgPicker, setShowBgPicker] = useState(false);

  useEffect(() => {
    setBackground(getStoredBackground());
  }, []);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    const prevPosition = document.body.style.position;
    const prevTop = document.body.style.top;
    const prevWidth = document.body.style.width;
    const prevMargin = document.body.style.margin;
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = "0";
    document.body.style.width = "100%";
    document.body.style.margin = "0";
    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.position = prevPosition;
      document.body.style.top = prevTop;
      document.body.style.width = prevWidth;
      document.body.style.margin = prevMargin;
    };
  }, []);

  const handleBackgroundChange = (id: TimerBackgroundId) => {
    setBackground(id);
    localStorage.setItem(TIMER_BG_KEY, id);
    setShowBgPicker(false);
  };

  const handleStop = async () => {
    await stopTracking();
    onMinimize();
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col h-[100dvh] max-h-[100dvh] w-full min-w-full m-0 p-0 border-0 overflow-visible">
      {/* Animated background layer - extends 2px past edges to eliminate border/crop artifacts */}
      <div
        className="absolute overflow-hidden pointer-events-none"
        style={{
          top: -2,
          left: -2,
          width: "calc(100% + 4px)",
          height: "calc(100% + 4px)",
        }}
        aria-hidden
      >
        <BackgroundLayer background={background} />
      </div>

      {/* Content overlay */}
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 text-white">
        {/* Top bar: minimize + background picker */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4 md:p-6">
          <Button
            variant="ghost"
            size="lg"
            onClick={onMinimize}
            className="text-white/90 hover:bg-white/15 hover:text-white rounded-full gap-2"
            aria-label="Minimize timer"
          >
            <Minimize2 className="w-5 h-5" />
            <span className="hidden sm:inline">Back to dashboard</span>
          </Button>

          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowBgPicker((v) => !v)}
              className="text-white/90 hover:bg-white/15 hover:text-white rounded-full"
              aria-label="Change background"
            >
              <Palette className="w-5 h-5" />
            </Button>
            {showBgPicker && (
              <>
                <div
                  className="fixed inset-0 z-0"
                  aria-hidden
                  onClick={() => setShowBgPicker(false)}
                />
                <div className="absolute right-0 top-full mt-2 py-2 rounded-xl bg-black/40 backdrop-blur-xl border border-white/10 shadow-xl z-10 min-w-[160px]">
                  <p className="px-3 py-1.5 text-xs font-medium text-white/70 uppercase tracking-wider">
                    Background
                  </p>
                  {BACKGROUNDS.map((bg) => (
                    <button
                      key={bg.id}
                      type="button"
                      onClick={() => handleBackgroundChange(bg.id)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left text-white/90 hover:bg-white/15 transition-colors"
                    >
                      {bg.icon}
                      <span>{bg.label}</span>
                      {background === bg.id && (
                        <span className="ml-auto text-cyan-300">✓</span>
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Center: timer content */}
        <div className="flex flex-col items-center text-center max-w-lg mx-auto">
          <div
            className="w-4 h-4 rounded-full mb-4 shadow-lg"
            style={{ backgroundColor: project.color }}
          />
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-semibold text-white drop-shadow-md mb-2">
            {project.name}
          </h1>
          <p className="text-5xl sm:text-6xl md:text-7xl font-mono font-bold tabular-nums tracking-tight text-white drop-shadow-lg mb-2">
            {elapsedTime}
          </p>
          <p className="text-white/80 text-sm sm:text-base mb-10">
            Started at {format(timeEntry.startTime, "h:mm a")}
          </p>
          <Button
            variant="destructive"
            size="lg"
            onClick={handleStop}
            className="px-10 h-14 text-lg rounded-full shadow-xl"
          >
            <Square className="w-5 h-5 mr-2 fill-current" />
            Stop session
          </Button>
        </div>
      </div>
    </div>
  );
}

function BackgroundLayer({ background }: { background: TimerBackgroundId }) {
  const baseClass = "absolute inset-0";
  let backgroundNode = <WavesBackground className={baseClass} />;

  switch (background) {
    case "waves":
      backgroundNode = <WavesBackground className={baseClass} />;
      break;
    case "aurora":
      backgroundNode = <AuroraBackground className={baseClass} />;
      break;
    case "gradient":
      backgroundNode = <GradientBackground className={baseClass} />;
      break;
    case "particles":
      backgroundNode = <ParticlesBackground className={baseClass} />;
      break;
    case "ocean":
      backgroundNode = <OceanBackground className={baseClass} />;
      break;
    case "sunset":
      backgroundNode = <SunsetBackground className={baseClass} />;
      break;
    default:
      backgroundNode = <WavesBackground className={baseClass} />;
  }

  return (
    <div className={baseClass}>
      {backgroundNode}
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60" />
      <div
        className="absolute inset-0 opacity-30 mix-blend-soft-light"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.2), transparent 35%), radial-gradient(circle at 80% 30%, rgba(255,255,255,0.15), transparent 40%), radial-gradient(circle at 50% 80%, rgba(255,255,255,0.12), transparent 45%)",
        }}
      />
    </div>
  );
}

function WavesBackground({ className }: { className?: string }) {
  return (
    <div className={`bg-gradient-to-b from-slate-950 via-indigo-950/90 to-slate-950 ${className}`}>
      <div
        className="absolute inset-0 opacity-70"
        style={{
          background:
            "radial-gradient(circle at 20% 30%, rgba(59,130,246,0.35), transparent 45%), radial-gradient(circle at 70% 20%, rgba(99,102,241,0.3), transparent 40%), radial-gradient(circle at 40% 80%, rgba(139,92,246,0.25), transparent 50%)",
          animation: "glow-drift 18s ease-in-out infinite",
        }}
      />
      <svg
        className="absolute opacity-45"
        style={{ 
          bottom: 0, 
          left: "-30%", 
          width: "160%",
          top: "35%", 
          minHeight: "65%" 
        }}
        viewBox="0 0 1440 400"
        preserveAspectRatio="none"
      >
        <path
          fill="rgba(59, 130, 246, 0.5)"
          d="M0,160L48,176C96,192,192,224,288,213.3C384,203,480,149,576,154.7C672,160,768,224,864,224C960,224,1056,160,1152,128C1248,96,1344,96,1392,96L1440,96L1440,400L1392,400C1344,400,1248,400,1152,400C1056,400,960,400,864,400C768,400,672,400,576,400C480,400,384,400,288,400C192,400,96,400,48,400L0,400Z"
          style={{
            animation:
              "wave-shift 18s ease-in-out infinite, wave-rise 6s ease-in-out infinite",
          }}
        />
        <path
          fill="rgba(99, 102, 241, 0.4)"
          d="M0,192L48,197.3C96,203,192,213,288,197.3C384,181,480,139,576,138.7C672,139,768,181,864,186.7C960,192,1056,160,1152,138.7C1248,117,1344,107,1392,101.3L1440,96L1440,400L1392,400C1344,400,1248,400,1152,400C1056,400,960,400,864,400C768,400,672,400,576,400C480,400,384,400,288,400C192,400,96,400,48,400L0,400Z"
          style={{
            animation:
              "wave-shift 22s ease-in-out infinite reverse, wave-rise 7s ease-in-out infinite",
            animationDelay: "1s",
          }}
        />
        <path
          fill="rgba(139, 92, 246, 0.3)"
          d="M0,224L48,208C96,192,192,160,288,165.3C384,171,480,213,576,218.7C672,224,768,192,864,165.3C960,139,1056,117,1152,122.7C1248,128,1344,160,1392,176L1440,192L1440,400L1392,400C1344,400,1248,400,1152,400C1056,400,960,400,864,400C768,400,672,400,576,400C480,400,384,400,288,400C192,400,96,400,48,400L0,400Z"
          style={{
            animation:
              "wave-shift 26s ease-in-out infinite, wave-rise 8s ease-in-out infinite",
            animationDelay: "2s",
          }}
        />
      </svg>
    </div>
  );
}

function AuroraBackground({ className }: { className?: string }) {
  return (
    <div className={`bg-slate-950 overflow-hidden ${className}`}>
      <div
        className="absolute w-[200%] h-[200%] -top-1/2 -left-1/2 rounded-full bg-gradient-to-br from-indigo-500/45 via-purple-500/35 to-cyan-500/45 blur-[120px] mix-blend-screen"
        style={{
          animation: "aurora-drift 15s ease-in-out infinite",
        }}
      />
      <div
        className="absolute w-[150%] h-[150%] top-1/4 -right-1/4 rounded-full bg-gradient-to-bl from-violet-500/35 to-blue-600/35 blur-[120px] mix-blend-screen"
        style={{
          animation: "aurora-drift 18s ease-in-out infinite reverse",
          animationDelay: "3s",
        }}
      />
      <div
        className="absolute w-[180%] h-[180%] -bottom-1/2 left-1/4 rounded-full bg-gradient-to-tr from-cyan-400/25 to-emerald-500/30 blur-[120px] mix-blend-screen"
        style={{
          animation: "aurora-drift 20s ease-in-out infinite",
          animationDelay: "5s",
        }}
      />
      <div
        className="absolute inset-0 opacity-60"
        style={{
          background:
            "radial-gradient(circle at 20% 20%, rgba(56,189,248,0.2), transparent 40%), radial-gradient(circle at 80% 30%, rgba(217,70,239,0.25), transparent 45%), radial-gradient(circle at 50% 80%, rgba(16,185,129,0.2), transparent 45%)",
          backgroundSize: "200% 200%",
          animation: "gradient-pan 18s ease-in-out infinite",
        }}
      />
    </div>
  );
}

function GradientBackground({ className }: { className?: string }) {
  return (
    <div
      className={className}
      style={{
        background:
          "linear-gradient(-45deg, #0b1021, #1e1b4b, #312e81, #0f2f4a, #0b1021)",
        backgroundSize: "400% 400%",
        animation: "gradient-rotate 16s ease infinite",
      }}
    >
      <div
        className="absolute inset-0 opacity-70"
        style={{
          background:
            "radial-gradient(circle at 30% 20%, rgba(59,130,246,0.35), transparent 45%), radial-gradient(circle at 70% 80%, rgba(236,72,153,0.25), transparent 45%)",
          animation: "glow-drift 20s ease-in-out infinite",
        }}
      />
    </div>
  );
}

function ParticlesBackground({ className }: { className?: string }) {
  const colors = [
    "rgba(129, 140, 248, 0.75)",
    "rgba(59, 130, 246, 0.6)",
    "rgba(236, 72, 153, 0.5)",
    "rgba(34, 211, 238, 0.55)",
  ];
  const particles = Array.from({ length: 36 }, (_, i) => ({
    id: i,
    size: 4 + (i % 4) * 4,
    left: (i * 7 + 10) % 90 + 5,
    top: (i * 11 + 20) % 85 + 5,
    delay: (i * 0.35) % 4,
    duration: 7 + (i % 5),
    color: colors[i % colors.length],
  }));

  return (
    <div className={`bg-slate-900 ${className}`}>
      <div
        className="absolute inset-0 opacity-60"
        style={{
          background:
            "radial-gradient(circle at 20% 20%, rgba(99,102,241,0.2), transparent 40%), radial-gradient(circle at 80% 70%, rgba(236,72,153,0.15), transparent 45%)",
          animation: "gradient-pan 22s ease-in-out infinite",
        }}
      />
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full blur-[0.5px]"
          style={{
            width: p.size,
            height: p.size,
            left: `${p.left}%`,
            top: `${p.top}%`,
            animation: `float ${p.duration}s ease-in-out infinite`,
            animationDelay: `${p.delay}s`,
            backgroundColor: p.color,
          }}
        />
      ))}
    </div>
  );
}

function OceanBackground({ className }: { className?: string }) {
  return (
    <div className={`bg-gradient-to-b from-cyan-950 via-blue-900 to-slate-900 ${className}`}>
      <div
        className="absolute inset-0 opacity-60"
        style={{
          background:
            "radial-gradient(circle at 15% 25%, rgba(34,211,238,0.25), transparent 40%), radial-gradient(circle at 80% 35%, rgba(59,130,246,0.2), transparent 45%), radial-gradient(circle at 50% 80%, rgba(14,165,233,0.18), transparent 45%)",
          animation: "glow-drift 20s ease-in-out infinite",
        }}
      />
      {/* viewBox 0 0 1440 280: waves fill from top to bottom (y=280) */}
      <svg
        className="absolute opacity-50"
        style={{ 
          bottom: 0, 
          left: "-20%", 
          width: "140%",
          top: "35%", 
          minHeight: "70%",
          WebkitMaskImage: "linear-gradient(to top, black 0%, black 70%, transparent 100%)",
          maskImage: "linear-gradient(to top, black 0%, black 70%, transparent 100%)",
          WebkitMaskSize: "100% 100%",
          maskSize: "100% 100%",
        }}
        viewBox="0 0 1440 280"
        preserveAspectRatio="none"
      >
        <path
          fill="rgba(6, 182, 212, 0.4)"
          d="M0,100 Q360,50 720,100 T1440,100 L1440,280 L0,280 Z"
          style={{ animation: "ocean-wave 6s ease-in-out infinite", transformOrigin: "bottom center" }}
        />
        <path
          fill="rgba(14, 165, 233, 0.35)"
          d="M0,120 Q360,70 720,120 T1440,120 L1440,280 L0,280 Z"
          style={{
            animation: "ocean-wave 7s ease-in-out infinite",
            animationDelay: "0.5s",
            transformOrigin: "bottom center",
          }}
        />
        <path
          fill="rgba(59, 130, 246, 0.3)"
          d="M0,140 Q360,90 720,140 T1440,140 L1440,280 L0,280 Z"
          style={{
            animation: "ocean-wave 8s ease-in-out infinite",
            animationDelay: "1s",
            transformOrigin: "bottom center",
          }}
        />
      </svg>
    </div>
  );
}

function SunsetBackground({ className }: { className?: string }) {
  return (
    <div
      className={className}
      style={{
        background:
          "linear-gradient(180deg, #1e1b4b 0%, #7c3aed 25%, #f59e0b 50%, #dc2626 75%, #451a03 100%)",
        animation: "sunset-pulse 6s ease-in-out infinite",
      }}
    >
      <div
        className="absolute inset-0 opacity-60"
        style={{
          background:
            "linear-gradient(120deg, rgba(236,72,153,0.3), rgba(14,165,233,0.2), rgba(250,204,21,0.25))",
          backgroundSize: "200% 200%",
          animation: "gradient-pan 16s ease-in-out infinite",
        }}
      />
    </div>
  );
}
