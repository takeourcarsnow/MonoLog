"use client";

import React, { useRef, useState, useEffect } from "react";
import { throttle } from "@/lib/utils";

interface AutoScrollProps {
  children: React.ReactNode;
  className?: string;
  /** style applied to outer container (overflow:hidden) */
  style?: React.CSSProperties;
  /** style applied to inner scrolling element (recommended for layout like inline-flex) */
  innerStyle?: React.CSSProperties;
}

export default function AutoScroll({ children, className, style, innerStyle }: AutoScrollProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const innerRef = useRef<HTMLDivElement | null>(null);
  const [animate, setAnimate] = useState(false);
  const [distance, setDistance] = useState(0);
  const [duration, setDuration] = useState(0);
  // gap in pixels inserted between copies when animating to avoid icons/text
  // from different copies touching. Tune as needed or expose as prop.
  const GAP_PX = 12;

  useEffect(() => {
    const c = containerRef.current;
    const i = innerRef.current;
    if (!c || !i) return;

    function update() {
      // measure overflow; read refs at time of call to avoid null issues
      const cEl = containerRef.current;
      const iEl = innerRef.current;
      if (!cEl || !iEl) return;
      // Compute the available width for the scrolling track. Prefer the
      // container's clientWidth, but if this AutoScroll lives inside a
      // `.card-head` layout with a sibling `.post-actions` (buttons), the
      // visual available width should exclude that sibling. To handle that
      // we detect the ancestor `.card-head` and subtract the distance from
      // the container's left edge to the left edge of the `.post-actions`
      // element so the measurement matches the visible gap between date
      // and buttons (prevents the track from overlaying the buttons).
      let cw = cEl.clientWidth;
      try {
        let ancestor: HTMLElement | null = cEl;
        while (ancestor && !ancestor.classList.contains('card-head')) {
          ancestor = ancestor.parentElement as HTMLElement | null;
        }
        if (ancestor) {
          const actions = ancestor.querySelector('.post-actions') as HTMLElement | null;
          if (actions) {
            const contRect = cEl.getBoundingClientRect();
            const actionsRect = actions.getBoundingClientRect();
            // Prefer measuring the gap between the visible date area and the
            // actions so the scrolling track fills that exact space. Attempt
            // to find the date element inside the user-meta block.
            let avail = 0;
            try {
              const userMeta = ancestor.querySelector('.user-meta') as HTMLElement | null;
              const dateEl = userMeta?.querySelector('.dim') as HTMLElement | null;
              if (dateEl) {
                const dateRect = dateEl.getBoundingClientRect();
                avail = Math.max(0, Math.floor(actionsRect.left - dateRect.right - 6));
              }
            } catch (e) {
              avail = 0;
            }
            // Fallback: if we couldn't find the date element, fall back to
            // measuring from the container left edge to actions left edge.
            if (!avail) {
              avail = Math.max(0, Math.floor(actionsRect.left - contRect.left - 6));
            }
            if (avail > 24) {
              cw = Math.min(cw, avail);
              try { cEl.style.maxWidth = `${avail}px`; } catch (_) { /* ignore */ }
            } else {
              try { cEl.style.maxWidth = ''; } catch (_) { /* ignore */ }
            }
          }
        }
      } catch (e) {
        // ignore and fallback to clientWidth
      }
      // Determine the natural content width (single copy). If the inner
      // element already contains the duplicated track, measure the first
      // child's width to avoid using the doubled scrollWidth.
      let contentWidth = 0;
      const track = iEl.querySelector('.auto-scroll-track') as HTMLElement | null;
      if (track && track.children && track.children.length >= 1) {
        const first = track.children[0] as HTMLElement | undefined;
        contentWidth = first ? first.scrollWidth : Math.floor(track.scrollWidth / 2);
      } else {
        contentWidth = iEl.scrollWidth;
      }
      const diff = Math.max(0, contentWidth - cw);
      if (diff > 2) {
        // For a seamless carousel we duplicate content and animate by the full
        // natural content width (contentWidth). This produces a continuous leftward loop
        // without a back-and-forth motion.
        setDistance(contentWidth + GAP_PX);
        // duration proportional to distance (pixels per second)
        const pxPerSec = 50; // tuned speed
        const dur = Math.max(3, (contentWidth + GAP_PX) / pxPerSec);
        setDuration(dur);
        setAnimate(true);
      } else {
        setAnimate(false);
      }
    }

    update();
    const throttledUpdate = throttle(update, 100);
    const ro = new ResizeObserver(throttledUpdate);
    ro.observe(c);
    ro.observe(i);
    window.addEventListener('orientationchange', throttledUpdate);
    return () => {
      ro.disconnect();
      window.removeEventListener('orientationchange', throttledUpdate);
    };
  }, [children]);

  // CSS variables for animation
  const cssVars: React.CSSProperties = animate ? {
    ["--autoscroll-distance" as any]: `${distance}px`,
    ["--autoscroll-duration" as any]: `${duration}s`,
    ["--autoscroll-gap" as any]: `${GAP_PX}px`
  } : {};

  return (
    <div
      ref={containerRef}
      className={`auto-scroll-container ${className || ""}`.trim()}
      style={{ overflow: 'hidden', display: 'inline-block', verticalAlign: 'middle', ...cssVars, ...style }}
      aria-hidden={false}
    >
      {animate && <span className="auto-scroll-fade left" aria-hidden />}
      <div
        ref={innerRef}
        className={`auto-scroll-inner ${animate ? 'animate' : ''}`}
        style={{ display: 'inline-block', whiteSpace: 'nowrap', ...innerStyle }}
      >
        {animate ? (
          // Render content twice for seamless carousel looping. The animation
          // will translate the track by `--autoscroll-distance` (the width of
          // one copy) and because a second copy follows, the loop appears
          // continuous. The second copy is aria-hidden for accessibility so
          // screen readers don't announce duplicate content.
          <div className="auto-scroll-track" style={{ display: 'inline-flex', whiteSpace: 'nowrap', alignItems: 'center' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center' }}>{children}</div>
            <div className="auto-scroll-gap" aria-hidden role="presentation" style={{ width: `${GAP_PX}px`, flex: '0 0 auto' }} />
            <div aria-hidden="true" role="presentation" style={{ display: 'inline-flex', alignItems: 'center' }}>{children}</div>
          </div>
        ) : (
          <>{children}</>
        )}
      </div>
      {animate && <span className="auto-scroll-fade right" aria-hidden />}
    </div>
  );
}
