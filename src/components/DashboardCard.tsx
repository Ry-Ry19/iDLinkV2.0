/**
 * LEARNER'S NOTE:
 * DashboardCard.tsx is a reusable card component for dashboard quick actions.
 *
 * KEY CONCEPTS:
 * - Props interface: title, description, icon (LucideIcon), children (optional content), onClick, className, iconClassName
 * - Icon prop: Accepts any Lucide icon component and renders it with customizable color
 * - Children slot: Optional content area below the header (e.g., notification count)
 * - Conditional cursor: onClick prop makes the card clickable (cursor-pointer)
 * - Shadow transitions: shadow-card to shadow-hover on hover for interactivity
 * - Reusable pattern: Used in StudentDashboard and EmployeeDashboard for action cards
 */
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { ReactNode } from "react";

interface DashboardCardProps {
  title: string;
  description?: string;
  icon: LucideIcon;
  children?: ReactNode;
  onClick?: () => void;
  className?: string;
  iconClassName?: string;
}

const DashboardCard = ({
  title,
  description,
  icon: Icon,
  children,
  onClick,
  className = "",
  iconClassName = "text-primary",
}: DashboardCardProps) => {
  return (
    <Card
      className={`shadow-card transition-smooth hover:shadow-hover ${
        onClick ? "cursor-pointer" : ""
      } ${className}`}
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="space-y-1">
          <CardTitle className="text-xl">{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </div>
        <Icon className={`h-8 w-8 ${iconClassName}`} />
      </CardHeader>
      {children && <CardContent>{children}</CardContent>}
    </Card>
  );
};

export default DashboardCard;
