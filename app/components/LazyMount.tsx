"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  children: React.ReactNode;
  rootMargin?: string;
  once?: boolean; // mount only once when visible
};

export default function LazyMount({ children, rootMargin = "200px", once = true }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      // If no IO support, render immediately
      setVisible(true);
      return;
    }

    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true);
            if (once) obs.disconnect();
          }
        });
      },
      { root: null, rootMargin }
    );

    obs.observe(el);
    return () => obs.disconnect();
  }, [rootMargin, once]);

  return <div ref={ref}>{visible ? children : <div aria-hidden />}</div>;
}
