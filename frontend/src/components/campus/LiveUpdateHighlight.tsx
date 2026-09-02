// frontend/src/components/campus/LiveUpdateHighlight.tsx
// --duration-base flash from --color-accent-subtle → transparent on value change.
// Fires once per change. prefers-reduced-motion: no animation.

import { useEffect, useRef, useState } from "react";

interface LiveUpdateHighlightProps {
  value: number | string;
  children: React.ReactNode;
}

export function LiveUpdateHighlight({ value, children }: LiveUpdateHighlightProps) {
  const [flash, setFlash] = useState(false);
  const prevRef = useRef(value);

  useEffect(() => {
    if (prevRef.current !== value) {
      prevRef.current = value;
      setFlash(true);
      const id = setTimeout(() => setFlash(false), 600);
      return () => clearTimeout(id);
    }
  }, [value]);

  return (
    <span
      className={`inline-block rounded transition-colors duration-slow ease-standard ${
        flash ? "bg-accent-subtle" : "bg-transparent"
      }`}
      aria-live="polite"
      aria-atomic="true"
    >
      {children}
    </span>
  );
}
