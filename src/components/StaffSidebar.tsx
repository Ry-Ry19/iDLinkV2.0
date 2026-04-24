import { NavLink } from "@/components/NavLink";
import {
  Database,
  LayoutDashboard
} from "lucide-react";

const StaffSidebar = () => {
  const navItems = [
    { title: "Dashboard", url: "/staff/dashboard", icon: LayoutDashboard },
    { title: "Manage Records", url: "/staff/records", icon: Database },
  ];

  return (
    <aside className="hidden md:flex w-64 flex-col border-r border-border bg-sidebar min-h-screen">
      <div className="flex h-16 items-center border-b border-sidebar-border px-6">
        <h2 className="text-lg font-semibold text-sidebar-foreground">ICTC Admin</h2>
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {navItems.map((item) => (
          <NavLink
            key={item.url}
            to={item.url}
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground transition-base hover:bg-sidebar-accent"
            activeClassName="bg-sidebar-accent font-medium"
          >
            <item.icon className="h-5 w-5" />
            <span>{item.title}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
};

export default StaffSidebar;
