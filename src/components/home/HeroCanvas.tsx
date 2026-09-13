"use client";

import React, { useEffect, useRef } from "react";

export function HeroCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = canvas.offsetWidth || 800);
    let height = (canvas.height = canvas.offsetHeight || 360);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.offsetWidth || 800;
      height = canvas.height = canvas.offsetHeight || 360;
    };
    window.addEventListener("resize", handleResize);

    const isMobile =
      typeof window !== "undefined" &&
      (window.innerWidth < 768 ||
        ("ontouchstart" in window) ||
        navigator.maxTouchPoints > 0);

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let prefersReduced = mediaQuery.matches;

    const handleMotionChange = (e: MediaQueryListEvent) => {
      prefersReduced = e.matches;
    };
    mediaQuery.addEventListener("change", handleMotionChange);

    // Mouse coordinates for desktop
    let mouseX = width / 2;
    let mouseY = height / 2;
    const handleMouseMove = (e: MouseEvent) => {
      if (isMobile) return;
      const rect = canvas.getBoundingClientRect();
      mouseX = e.clientX - rect.left;
      mouseY = e.clientY - rect.top;
    };
    window.addEventListener("mousemove", handleMouseMove);

    // 30fps cap for mobile, 60fps for desktop
    const targetFps = isMobile ? 30 : 60;
    const frameInterval = 1000 / targetFps;
    let lastFrameTime = 0;

    const render = (time: number) => {
      if (prefersReduced) {
        // Accessibility: Static non-oscillating ambient gradient mesh
        ctx.clearRect(0, 0, width, height);

        const grad1 = ctx.createRadialGradient(
          width * 0.35,
          height * 0.45,
          10,
          width * 0.35,
          height * 0.45,
          width * 0.45
        );
        grad1.addColorStop(0, "rgba(99, 102, 241, 0.12)");
        grad1.addColorStop(1, "rgba(99, 102, 241, 0)");
        ctx.fillStyle = grad1;
        ctx.fillRect(0, 0, width, height);

        const grad2 = ctx.createRadialGradient(
          width * 0.65,
          height * 0.55,
          10,
          width * 0.65,
          height * 0.55,
          width * 0.4
        );
        grad2.addColorStop(0, "rgba(6, 182, 212, 0.09)");
        grad2.addColorStop(1, "rgba(6, 182, 212, 0)");
        ctx.fillStyle = grad2;
        ctx.fillRect(0, 0, width, height);
        return;
      }

      animId = requestAnimationFrame(render);

      // Throttling for mobile (30fps cap)
      const elapsed = time - lastFrameTime;
      if (elapsed < frameInterval) {
        return;
      }
      lastFrameTime = time - (elapsed % frameInterval);

      ctx.clearRect(0, 0, width, height);

      // Auto-oscillation via sine waves on mobile, or cursor-reactive on desktop
      let cx1: number, cy1: number, cx2: number, cy2: number;
      if (isMobile) {
        // Autonomous sine wave oscillation (no cursor required)
        const t = time * 0.0015;
        cx1 = width * 0.35 + Math.sin(t) * 45;
        cy1 = height * 0.45 + Math.cos(t * 1.3) * 28;
        cx2 = width * 0.65 + Math.cos(t * 0.9) * 40;
        cy2 = height * 0.55 + Math.sin(t * 1.1) * 30;
      } else {
        // Desktop smooth cursor attraction
        const t = time * 0.001;
        const targetX = width * 0.35 + (mouseX - width / 2) * 0.15;
        const targetY = height * 0.45 + (mouseY - height / 2) * 0.15;
        cx1 = targetX + Math.sin(t) * 20;
        cy1 = targetY + Math.cos(t) * 15;
        cx2 = width * 0.65 - (mouseX - width / 2) * 0.1 + Math.cos(t * 0.8) * 25;
        cy2 = height * 0.55 - (mouseY - height / 2) * 0.1 + Math.sin(t * 0.8) * 20;
      }

      // Orb 1: Indigo glow
      const grad1 = ctx.createRadialGradient(cx1, cy1, 15, cx1, cy1, width * 0.45);
      grad1.addColorStop(0, "rgba(99, 102, 241, 0.16)");
      grad1.addColorStop(0.6, "rgba(168, 85, 247, 0.06)");
      grad1.addColorStop(1, "rgba(99, 102, 241, 0)");
      ctx.fillStyle = grad1;
      ctx.fillRect(0, 0, width, height);

      // Orb 2: Cyan ambient
      const grad2 = ctx.createRadialGradient(cx2, cy2, 10, cx2, cy2, width * 0.4);
      grad2.addColorStop(0, "rgba(6, 182, 212, 0.14)");
      grad2.addColorStop(0.7, "rgba(59, 130, 246, 0.04)");
      grad2.addColorStop(1, "rgba(6, 182, 212, 0)");
      ctx.fillStyle = grad2;
      ctx.fillRect(0, 0, width, height);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
      mediaQuery.removeEventListener("change", handleMotionChange);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="absolute inset-0 w-full h-full pointer-events-none opacity-80 dark:opacity-60 -z-10 rounded-3xl"
    />
  );
}
