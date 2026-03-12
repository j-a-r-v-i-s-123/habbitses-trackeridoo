import { useState, useEffect, useRef, type ReactNode } from "react";

interface FeatureTooltipProps {
  id: string;
  content: string;
  children: ReactNode;
  position?: "top" | "bottom" | "left" | "right";
  show: boolean;
  onDismiss: (id: string) => void;
}

export default function FeatureTooltip({
  id,
  content,
  children,
  position = "bottom",
  show,
  onDismiss,
}: FeatureTooltipProps) {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => setVisible(true), 300);
      return () => clearTimeout(timer);
    }
    setVisible(false);
  }, [show]);

  function handleDismiss() {
    setVisible(false);
    onDismiss(id);
  }

  const positionClasses: Record<string, string> = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  };

  const arrowClasses: Record<string, string> = {
    top: "top-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-b-transparent border-t-primary-700",
    bottom: "bottom-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-t-transparent border-b-primary-700",
    left: "left-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-r-transparent border-l-primary-700",
    right: "right-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-l-transparent border-r-primary-700",
  };

  return (
    <div className="relative inline-block" ref={ref}>
      {children}
      {visible && (
        <div
          className={`absolute z-50 ${positionClasses[position]}`}
          style={{ minWidth: "200px" }}
        >
          <div className="bg-primary-700 text-white text-xs rounded-lg px-3 py-2 shadow-lg relative">
            <p className="mb-1.5">{content}</p>
            <button
              onClick={handleDismiss}
              className="text-primary-200 hover:text-white text-xs font-medium"
            >
              Got it
            </button>
            <div
              className={`absolute w-0 h-0 border-[5px] ${arrowClasses[position]}`}
            />
          </div>
        </div>
      )}
    </div>
  );
}

const TOOLTIP_STORAGE_KEY = "dismissed_tooltips";

export function useDismissedTooltips() {
  const [dismissed, setDismissed] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem(TOOLTIP_STORAGE_KEY);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  function dismiss(id: string) {
    setDismissed((prev) => {
      const next = new Set(prev);
      next.add(id);
      localStorage.setItem(TOOLTIP_STORAGE_KEY, JSON.stringify([...next]));
      return next;
    });
  }

  function shouldShow(id: string): boolean {
    return !dismissed.has(id);
  }

  return { shouldShow, dismiss };
}
