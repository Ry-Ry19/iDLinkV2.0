/**
 * StaffDashboard.tsx
 * - Removed broken storageUrl (was referencing undefined 'url' variable)
 * - Removed the huge 360px profile photo from the heading
 * - Added clean profile card in the sidebar card (same pattern as student/employee)
 * - Fixed StatusBadge to use safeBadgeStatus for ready_for_pickup
 * - Stats: pending, approved total, rejected total, totalUsers
 */
import Footer from "@/components/Footer";
import HighlightedName from "@/components/HighlightedName";
import Navbar from "@/components/Navbar";
import StaffSidebar from "@/components/StaffSidebar";
import StatusBadge from "@/components/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Clock, Users, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";

type BadgeStatus = "submitted" | "under_review" | "approved" | "returned" | "rejected" | "expired";

function safeBadgeStatus(status: string): BadgeStatus {
  if (status === "ready_for_pickup") return "approved";
  const valid: BadgeStatus[] = ["submitted", "under_review", "approved", "returned", "rejected", "expired"];
  return valid.includes(status as BadgeStatus) ? (status as BadgeStatus) : "submitted";
}

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

function formatRelative(dateStr?: string) {
  if (!dateStr) return "";
  const d = new Date(dateStr.replace(" ", "T"));
  if (isNaN(d.getTime())) return dateStr;
  const diff = Date.now() - d.getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}

const StaffDashboard = () => {
  const navigate = useNavigate();
  const [userName, setUserName] = useState("");
  const [userRole, setUserRole] = useState<"student" | "employee" | "staff" | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0, totalUsers: 0 });
  const [recentActivity, setRecentActivity] = useState<Array<any>>([]);
  const [loading, setLoading] = useState(false);

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

      setUserName(profile.fullname);
      setUserRole(profile.role as "student" | "employee" | "staff");
      setAvatarUrl(profile.avatar_url ?? null);

      localStorage.setItem("user", JSON.stringify({
        fullname: profile.fullname,
        role: profile.role,
        idno: profile.idno,
        email: authUser.email ?? "",
      }));

      if (profile.role !== "staff") { navigate("/"); }
    };
    loadUser();
  }, [navigate]);

  const loadDashboard = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [appsResult, usersResult] = await Promise.all([
        supabase.from("applications").select("*").order("id", { ascending: false }),
        supabase.from("profiles").select("id", { count: "exact" }),
      ]);

      const apps = appsResult.data ?? [];
      const totalUsers = usersResult.data?.length ?? 0;

      const pending = apps.filter((a: any) => a.status === "submitted" || a.status === "under_review").length;
      const approved = apps.filter((a: any) => a.status === "approved" || a.status === "ready_for_pickup").length;
      const rejected = apps.filter((a: any) => a.status === "rejected").length;

      setStats({ pending, approved, rejected, totalUsers });

      const recent = apps.slice(0, 6).map((a: any) => ({
        id: a.id_display || String(a.id),
        applicant: a.fullname,
        action: a.status,
        created_at: a.date || "",
      }));
      setRecentActivity(recent);
    } catch (err) {
      console.error("loadDashboard error:", err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
    const pollId = setInterval(() => loadDashboard(true), 5000);
    return () => clearInterval(pollId);
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar isLoggedIn userRole={userRole} userName={userName} />

      <div className="flex flex-1">
        <StaffSidebar />

        <main className="flex-1 bg-background">
          <div className="container mx-auto px-4 py-8">

            {/* ── Header row ── */}
            <div className="mb-8 grid gap-4 md:grid-cols-3 items-start">
              <div className="md:col-span-2">
                <h1 className="text-3xl font-bold mb-2 flex items-baseline gap-3">
                  ICTC Admin Dashboard
                  <span className="text-sm text-muted-foreground">•</span>
                  <span className="text-sm text-muted-foreground">Welcome back</span>
                  {userName && <HighlightedName name={userName} />}
                </h1>
                <p className="text-muted-foreground">Monitor and manage ID applications system-wide.</p>
              </div>

              {/* ── Profile card (same pattern as student/employee) ── */}
              <div className="md:col-span-1">
                <div className="bg-card p-4 rounded-lg shadow-card border border-border">
                  <div className="flex items-center gap-3 mb-3">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt="Avatar"
                        className="h-10 w-10 rounded-full object-cover border border-border flex-shrink-0"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-primary font-semibold text-sm">
                          {userName ? getInitials(userName) : "ST"}
                        </span>
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">Signed in as</p>
                      <p className="font-semibold truncate">{userName}</p>
                      <p className="text-sm text-muted-foreground">Administrator</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => loadDashboard(true)} className="flex-1 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm text-center">Refresh</button>
                    <button onClick={() => navigate("/staff/users")} className="flex-1 px-3 py-1.5 rounded-md border border-border text-sm text-center">Users</button>
                    <button onClick={() => navigate("/profile")} className="flex-1 px-3 py-1.5 rounded-md border border-border text-sm text-center">Profile</button>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Stats ── */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
              <Card className="shadow-card">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pending</CardTitle>
                  <Clock className="h-5 w-5 text-warning" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{loading ? "—" : stats.pending}</div>
                </CardContent>
              </Card>

              <Card className="shadow-card">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Approved</CardTitle>
                  <CheckCircle className="h-5 w-5 text-success" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{loading ? "—" : stats.approved}</div>
                </CardContent>
              </Card>

              <Card className="shadow-card">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Rejected</CardTitle>
                  <XCircle className="h-5 w-5 text-destructive" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{loading ? "—" : stats.rejected}</div>
                </CardContent>
              </Card>

              <Card className="shadow-card">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                  <Users className="h-5 w-5 text-info" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{loading ? "—" : stats.totalUsers.toLocaleString()}</div>
                </CardContent>
              </Card>
            </div>

            {/* ── Recent Activity ── */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentActivity.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No recent activity</p>
                  ) : (
                    recentActivity.map((activity, idx) => (
                      <div
                        key={`${activity.id}-${idx}`}
                        className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div>
                          <p className="font-semibold">{activity.id}</p>
                          <p className="text-sm text-muted-foreground">{activity.applicant}</p>
                        </div>
                        <div className="text-right">
                          <StatusBadge status={safeBadgeStatus(activity.action)} />
                          {activity.action === "ready_for_pickup" && (
                            <span className="block text-xs text-green-600 font-medium mt-0.5">Ready for Pickup</span>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">{formatRelative(activity.created_at)}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>

      <Footer />
    </div>
  );
};

export default StaffDashboard;