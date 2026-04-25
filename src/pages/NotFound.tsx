/**
 * LEARNER'S NOTE:
 * NotFound.tsx is the catch-all 404 page shown when no routes match.
 *
 * KEY CONCEPTS:
 * - useLocation: Accesses the current pathname to log the attempted route
 * - useEffect: Side effect to log 404 errors to console for debugging
 * - Simple layout: Centered text with "Return to Home" link
 * - Route pattern: Rendered via <Route path="*" /> in App.tsx
 */
import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">404</h1>
        <p className="mb-4 text-xl text-muted-foreground">Oops! Page not found</p>
        <a href="/" className="text-primary underline hover:text-primary/90">
          Return to Home
        </a>
      </div>
    </div>
  );
};

export default NotFound;
