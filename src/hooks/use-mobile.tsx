/**
 * LEARNER'S NOTE:
 * use-mobile.tsx is a custom hook that detects if the viewport is mobile-sized.
 *
 * KEY CONCEPTS:
 * - window.matchMedia: API for querying media queries (e.g., max-width: 767px)
 * - Event listener: Listens for changes to viewport size (orientation change, resize)
 * - Breakpoint constant: MOBILE_BREAKPOINT = 768 (screens < 768px are considered mobile)
 * - Undefined initial state: Prevents flash of wrong layout on initial render
 * - Cleanup: Removes event listener when component unmounts to prevent memory leaks
 * - Usage: Used throughout the app to conditionally render mobile-specific UI
 */
import * as React from "react";

const MOBILE_BREAKPOINT = 768;

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined);

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    mql.addEventListener("change", onChange);
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return !!isMobile;
}
