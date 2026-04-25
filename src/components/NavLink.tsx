/**
 * LEARNER'S NOTE:
 * NavLink.tsx is a wrapper around react-router-dom's NavLink that adds
 * custom className handling for active and pending states.
 *
 * KEY CONCEPTS:
 * - forwardRef: Allows parent components to access the underlying <a> element
 * - Omit utility: Removes "className" from NavLinkProps to redefine it
 * - Active/pending states: Uses router's isActive and isPending to conditionally apply classes
 * - cn utility: Combines classNames using the tw-merge library (clsx + tailwind-merge)
 * - displayName: Required for proper debugging with forwardRef components
 */
import { NavLink as RouterNavLink, NavLinkProps } from "react-router-dom";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";

interface NavLinkCompatProps extends Omit<NavLinkProps, "className"> {
  className?: string;
  activeClassName?: string;
  pendingClassName?: string;
}

const NavLink = forwardRef<HTMLAnchorElement, NavLinkCompatProps>(
  ({ className, activeClassName, pendingClassName, to, ...props }, ref) => {
    return (
      <RouterNavLink
        ref={ref}
        to={to}
        className={({ isActive, isPending }) =>
          cn(className, isActive && activeClassName, isPending && pendingClassName)
        }
        {...props}
      />
    );
  },
);

NavLink.displayName = "NavLink";

export { NavLink };
