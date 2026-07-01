/**
 * StudentDashboard.tsx
 * - Profile card with avatar, name, role, Track/Apply/Profile buttons
 * - Ready-for-pickup banner
 * - Polls every 10s for status updates from staff
 *
 * DESIGN NOTES (this pass):
 * - Same refresh as EmployeeDashboard: split heading, icon profile actions, success-token
 *   banner instead of hardcoded green, status-accented application rows, skeleton loading.
 */
import DashboardCard from "@/components/DashboardCard";
import Footer from "@/components/Footer";
import HighlightedName from "@/components/HighlightedName";
import Navbar from "@/components/Navbar";
import StatusBadge from "@/components/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, Bell, FilePlus2, FileText, Inbox, PackageCheck, Search, UserCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/lib/supabaseClient";

interface UserProfile {
  id: string;
  fullname: string;
  role: string;
  idno: string;
  email: string;
  avatar_url?: string | null;
}

type AppStatus =
  | "submitted"
  | "under_review"
  | "approved"
  | "returned"
  | "rejected"
  | "expired"
  | "ready_for_pickup";

interface Application {
  id: number;
  id_display: string;
  fullname: string;
  idno: string;
  status: AppStatus;
  date: string;
  remarks?: string;
}

const STATUS_ACCENT: Record<AppStatus, string> = {
  submitted: "border-l-info",
  under_review: "border-l-warning",
  approved: "border-l-success",
  ready_for_pickup: "border-l-success",
  returned: "border-l-warning",
  rejected: "border-l-destructive",
  expired: "border-l-muted-foreground",
};

function safeBadgeStatus(
  status: AppStatus
): "submitted" | "under_review" | "approved" | "returned" | "rejected" | "expired" {
  if (status === "ready_for_pickup") return "approved";
  return status;
}

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

const StudentDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [recentApplications, setRecentApplications] = useState<Application[]>([]);
  const [loadingApps, setLoadingApps] = useState(true);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchApplications = async (userId: string, silent = false) => {
    try {
      const { data, error } = await supabase
        .from("applications")
        .select("id, id_display, fullname, idno, status, date, remarks")
        .eq("user_id", userId)
        .order("id", { ascending: false });

      if (error) throw error;

      const mapped: Application[] = (data ?? []).map((app) => ({
        id: Number(app.id),
        id_display: String(app.id_display ?? app.id),
        fullname: String(app.fullname ?? ""),
        idno: String(app.idno ?? ""),
        status: (app.status as AppStatus) ?? "submitted",
        date: app.date
          ? new Date(app.date).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
          : "",
        remarks: app.remarks ?? "",
      }));

      setRecentApplications(mapped);
    } catch (err) {
      console.error("fetchApplications error:", err);
      if (!silent) toast.error("Failed to load your applications");
    } finally {
      if (!silent) setLoadingApps(false);
    }
  };

  useEffect(() => {
    const loadUser = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) { navigate("/login"); return; }

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", authUser.id)
        .single();

      if (error || !profile) { navigate("/login"); return; }

      if (profile.role === "employee") { navigate("/employee/dashboard", { replace: true }); return; }
      if (profile.role === "staff") { navigate("/staff/dashboard", { replace: true }); return; }

      const userData: UserProfile = {
        id: profile.id,
        fullname: profile.fullname,
        role: profile.role,
        idno: profile.idno,
        email: authUser.email ?? "",
        avatar_url: profile.avatar_url ?? null,
      };
      setUser(userData);
      localStorage.setItem("user", JSON.stringify(userData));

      await fetchApplications(profile.id);
      pollRef.current = setInterval(() => fetchApplications(profile.id, true), 10000);
    };

    loadUser();
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [navigate]);

  const readyApps = recentApplications.filter((a) => a.status === "ready_for_pickup");

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar
        isLoggedIn={!!user}
        userRole={(user?.role as "student" | "employee" | "staff") ?? "student"}
        userName={user?.fullname ?? ""}
      />

      <main className="flex-1 bg-background">
        <div className="container mx-auto px-4 py-8">

          {/* ── Header row ── */}
          <div className="mb-8 grid gap-4 md:grid-cols-3 items-start">
            <div className="md:col-span-2">
              <p className="mb-1 flex items-center gap-1.5 text-sm font-medium text-primary">
                Welcome back{user ? "," : ""}
                {user && <HighlightedName name={user.fullname} />}
              </p>
              <h1 className="text-3xl font-bold mb-2">Student Dashboard</h1>
              <p className="text-muted-foreground">Manage your ID applications here with ease.</p>
            </div>

            {/* ── Profile card ── */}
            <div className="md:col-span-1">
              <div className="bg-card p-4 rounded-lg shadow-card border border-border">
                <div className="flex items-center gap-3 mb-4">
                  {user?.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt="Avatar"
                      className="h-11 w-11 rounded-full object-cover border border-border flex-shrink-0"
                    />
                  ) : (
                    <div className="h-11 w-11 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
                      <span className="text-primary font-semibold text-sm">
                        {user ? getInitials(user.fullname) : "?"}
                      </span>
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Signed in as</p>
                    <p className="font-semibold truncate">{user?.fullname}</p>
                    <span className="mt-0.5 inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                      {user?.role?.toUpperCase()}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => navigate("/track")}
                    className="flex flex-col items-center gap-1 rounded-md bg-primary px-2 py-2 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90"
                  >
                    <Search className="h-4 w-4" />
                    Track
                  </button>
                  <button
                    onClick={() => navigate("/apply")}
                    className="flex flex-col items-center gap-1 rounded-md border border-border px-2 py-2 text-xs font-medium transition-colors hover:bg-muted"
                  >
                    <FilePlus2 className="h-4 w-4" />
                    Apply
                  </button>
                  <button
                    onClick={() => navigate("/profile")}
                    className="flex flex-col items-center gap-1 rounded-md border border-border px-2 py-2 text-xs font-medium transition-colors hover:bg-muted"
                  >
                    <UserCircle className="h-4 w-4" />
                    Profile
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ── Ready for pickup banner ── */}
          {readyApps.length > 0 && (
            <div className="mb-6 rounded-lg border border-success/30 bg-success/10 p-4 flex items-start gap-3">
              <PackageCheck className="h-5 w-5 text-success mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-foreground">
                  {readyApps.length === 1 ? "Your ID is ready for pickup!" : `${readyApps.length} IDs are ready for pickup!`}
                </p>
                {readyApps.map((a) => (
                  <p key={a.id} className="text-sm text-muted-foreground mt-0.5">
                    {a.id_display} — {a.remarks || "Please visit the ICTC office."}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* ── Quick Actions ── */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
            <DashboardCard title="Apply for ID" description="Submit new ID application" icon={FileText} onClick={() => navigate("/apply")} />
            <DashboardCard title="Track Status" description="Check application status" icon={BarChart3} onClick={() => navigate("/track")} />
            <DashboardCard title="Notifications" description="View updates & alerts" icon={Bell} iconClassName="text-accent" onClick={() => navigate("/notifications")}>
              <div className="text-2xl font-bold">{readyApps.length > 0 ? readyApps.length : "—"}</div>
              <p className="text-xs text-muted-foreground">{readyApps.length > 0 ? "Ready for pickup" : "No new alerts"}</p>
            </DashboardCard>
          </div>

          {/* ── Recent Applications ── */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>Recent Applications</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {loadingApps ? (
                  <div className="space-y-3">
                    {[0, 1, 2].map((i) => (
                      <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
                    ))}
                  </div>
                ) : recentApplications.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-10 text-center">
                    <Inbox className="h-8 w-8 text-muted-foreground/50" />
                    <p className="text-muted-foreground">You have no applications yet.</p>
                  </div>
                ) : (
                  recentApplications.map((app) => (
                    <div
                      key={app.id}
                      className={`flex items-center justify-between p-4 border border-border border-l-4 ${
                        STATUS_ACCENT[app.status] ?? "border-l-border"
                      } rounded-lg cursor-pointer transition-colors hover:bg-muted/50`}
                      onClick={() => navigate("/track")}
                    >
                      <div>
                        <p className="font-semibold">{app.id_display}</p>
                        <p className="text-sm text-muted-foreground">{app.fullname}</p>
                        {app.status === "ready_for_pickup" && app.remarks && (
                          <p className="text-xs text-success mt-0.5">{app.remarks}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <StatusBadge status={safeBadgeStatus(app.status)} />
                        {app.status === "ready_for_pickup" && (
                          <span className="block text-xs text-success font-medium mt-0.5">Ready for Pickup</span>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">{app.date}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default StudentDashboard;