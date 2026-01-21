"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  children: React.ReactNode;
};

export function StickyFilterBar({ children }: Props) {
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const [isStuck, setIsStuck] = useState(false);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsStuck(!entry.isIntersecting);
      },
      { threshold: 0 },
    );

    observer.observe(sentinel);
    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <>
      <div ref={sentinelRef} className="h-px w-full" />
      <div
        className={`sticky top-0 z-10 inline-flex w-fit bg-white px-2 py-2 shadow-sm dark:bg-slate-900 ${
          isStuck ? "rounded-b-xl sm:rounded-b-full" : "rounded-xl sm:rounded-full"
        }`}
      >
        {children}
      </div>
    </>
  );
}
