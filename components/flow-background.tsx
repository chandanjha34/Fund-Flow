import React from "react"

type FlowBackgroundProps = {
  /** Flexible pixel-based height with responsive clamp, e.g., 'clamp(180px, 24vw, 360px)' */
  height?: string
  /** Flexible pixel-based top offset with responsive clamp, e.g., 'clamp(40px, 8vw, 120px)' */
  top?: string
}

// Subtle animated water/flow background using the accent color
// Uses transform-based animations for better performance
export function FlowBackground({
  height = "clamp(180px, 24vw, 360px)",
  top = "clamp(40px, 8vw, 120px)",
}: FlowBackgroundProps) {
  const maskStyle: React.CSSProperties = {
    maskImage:
      "linear-gradient(to bottom, transparent 0%, black 12%, black 88%, transparent 100%)",
    WebkitMaskImage:
      "linear-gradient(to bottom, transparent 0%, black 12%, black 88%, transparent 100%)",
  }

  const vars: React.CSSProperties = {
    // CSS custom properties to allow calc on layers
    ["--flow-top" as any]: top,
    ["--flow-height" as any]: height,
  }

  return (
    <div
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      style={{ ...maskStyle, ...vars }}
    >
      {/* Soft top/bottom fades to blend into background */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-transparent to-background opacity-70" />

      {/* Layer 1 - wide wave, increased amplitude and blur */}
      <div
        className="absolute left-0 w-[200%] text-accent/12 will-change-transform animate-flow-slow mix-blend-multiply blur-[6px]"
        style={{
          top: "var(--flow-top)",
          height: "calc(var(--flow-height) * 0.95)",
        }}
      >
        <div className="w-full h-full animate-drift-slow">
          <svg className="w-full h-full" viewBox="0 0 1600 400" preserveAspectRatio="none" aria-hidden>
            <path
              d="M0 200 C 300 60 520 340 800 200 C 1080 60 1300 340 1600 200 L 1600 360 L 0 360 Z"
              fill="currentColor"
            />
            {/* Duplicate wave to allow seamless sliding */}
            <path
              d="M1600 200 C 1900 60 2120 340 2400 200 C 2680 60 2900 340 3200 200 L 3200 360 L 1600 360 Z"
              fill="currentColor"
            />
          </svg>
        </div>
      </div>

      {/* Layer 2 - offset wave, more amplitude and blur */}
      <div
        className="absolute left-0 w-[200%] text-accent/14 blur-[10px] will-change-transform animate-flow-fast mix-blend-multiply"
        style={{
          top: "calc(var(--flow-top) + var(--flow-height) * 0.14)",
          height: "calc(var(--flow-height) * 0.8)",
        }}
      >
        <div className="w-full h-full animate-drift-medium">
          <svg className="w-full h-full" viewBox="0 0 1600 400" preserveAspectRatio="none" aria-hidden>
            <path
              d="M0 220 C 260 90 540 330 800 220 C 1060 110 1340 330 1600 220 L 1600 360 L 0 360 Z"
              fill="currentColor"
            />
            <path
              d="M1600 220 C 1860 90 2140 330 2400 220 C 2660 110 2940 330 3200 220 L 3200 360 L 1600 360 Z"
              fill="currentColor"
            />
          </svg>
        </div>
      </div>

      {/* Layer 3 - highlight wave, stronger blur */}
      <div
        className="absolute left-0 w-[200%] text-accent/10 blur-[14px] will-change-transform animate-flow-medium mix-blend-multiply"
        style={{
          top: "calc(var(--flow-top) + var(--flow-height) * 0.3)",
          height: "calc(var(--flow-height) * 0.6)",
        }}
      >
        <div className="w-full h-full animate-drift-fast">
          <svg className="w-full h-full" viewBox="0 0 1600 400" preserveAspectRatio="none" aria-hidden>
            <path
              d="M0 240 C 320 140 480 320 800 240 C 1120 140 1280 320 1600 240 L 1600 360 L 0 360 Z"
              fill="currentColor"
            />
            <path
              d="M1600 240 C 1920 140 2080 320 2400 240 C 2720 140 2880 320 3200 240 L 3200 360 L 1600 360 Z"
              fill="currentColor"
            />
          </svg>
        </div>
      </div>

      {/* Extra bottom fade to soften any sharp edge */}
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent via-background/70 to-background" />
    </div>
  )
}

// Full-page fixed backdrop version (end-to-end across the app)
export function FlowBackdrop() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-transparent to-background opacity-90" />

      <div className="absolute left-0 top-1/3 w-[200%] h-[40%] text-accent/20 will-change-transform animate-flow-slow">
        <svg className="w-full h-full" viewBox="0 0 1600 400" preserveAspectRatio="none" aria-hidden>
          <path d="M0 200 C 300 120 520 280 800 200 C 1080 120 1300 280 1600 200 L 1600 400 L 0 400 Z" fill="currentColor" />
          <path d="M1600 200 C 1900 120 2120 280 2400 200 C 2680 120 2900 280 3200 200 L 3200 400 L 1600 400 Z" fill="currentColor" />
        </svg>
      </div>

      <div className="absolute left-0 top-[46%] w-[200%] h-[36%] text-accent/28 blur-[1px] will-change-transform animate-flow-fast">
        <svg className="w-full h-full" viewBox="0 0 1600 400" preserveAspectRatio="none" aria-hidden>
          <path d="M0 220 C 260 160 540 260 800 220 C 1060 180 1340 260 1600 220 L 1600 400 L 0 400 Z" fill="currentColor" />
          <path d="M1600 220 C 1860 160 2140 260 2400 220 C 2660 180 2940 260 3200 220 L 3200 400 L 1600 400 Z" fill="currentColor" />
        </svg>
      </div>

      <div className="absolute left-0 top-[58%] w-[200%] h-[24%] text-accent/16 blur-[2px] will-change-transform animate-flow-medium">
        <svg className="w-full h-full" viewBox="0 0 1600 400" preserveAspectRatio="none" aria-hidden>
          <path d="M0 240 C 320 220 480 260 800 240 C 1120 220 1280 260 1600 240 L 1600 400 L 0 400 Z" fill="currentColor" />
          <path d="M1600 240 C 1920 220 2080 260 2400 240 C 2720 220 2880 260 3200 240 L 3200 400 L 1600 400 Z" fill="currentColor" />
        </svg>
      </div>
    </div>
  )
}


