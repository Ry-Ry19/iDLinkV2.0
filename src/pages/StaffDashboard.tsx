import Footer from "@/components/Footer";
import HighlightedName from "@/components/HighlightedName";
import Navbar from "@/components/Navbar";
import StaffSidebar from "@/components/StaffSidebar";
import StatusBadge from "@/components/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Clock, Users, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

function formatRelative(dateStr?: string) {
  if (!dateStr) return "";
  // Ensure parsable ISO string
  const iso = dateStr.replace(" ", "T");
  const d = new Date(iso);
  if (isNaN(d.getTime())) return dateStr;
  const diff = Date.now() - d.getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec} sec${sec !== 1 ? "s" : ""} ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} min${min !== 1 ? "s" : ""} ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hour${hr !== 1 ? "s" : ""} ago`;
  const days = Math.floor(hr / 24);
  return `${days} day${days !== 1 ? "s" : ""} ago`;
}

const StaffDashboard = () => {
  const navigate = useNavigate();

  const [userName, setUserName] = useState("");
  const [userRole, setUserRole] = useState<"student" | "employee" | "staff" | null>(null);

  const [stats, setStats] = useState({ pending: 0, approvedToday: 0, returned: 0, totalUsers: 0 });
  const [recentActivity, setRecentActivity] = useState<Array<any>>([]);
  const [loading, setLoading] = useState(false);

  // Load user info from localStorage
  useEffect(() => {
    const storedUser = localStorage.getItem("user");

    if (!storedUser) {
      navigate("/login");
      return;
    }

    const parsed = JSON.parse(storedUser);
    setUserName(parsed.fullname);
    setUserRole(parsed.role);

    // ❗ Prevent students/employees from accessing staff dashboard
    if (parsed.role !== "staff") {
      navigate("/");
    }
  }, [navigate]);

  // Fetch dashboard data from backend (callable). Use `silent` to avoid loading state during polling.
  const loadDashboard = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [appsRes, usersRes] = await Promise.all([
        fetch("http://localhost:5000/api/applications"),
        fetch("http://localhost:5000/api/users/count"),
      ]);

      if (!appsRes.ok) throw new Error("Failed to fetch applications");
      if (!usersRes.ok) throw new Error("Failed to fetch users count");

      const apps = await appsRes.json();
      const usersJson = await usersRes.json();

      // pending = submitted + under_review
      const pending = apps.filter((a: any) => a.status === "submitted" || a.status === "under_review").length;

      // approvedToday = approved where date is today
      const today = new Date().toISOString().slice(0, 10);
      const approvedToday = apps.filter((a: any) => a.status === "approved" && (a.date === today || (a.created_at && a.created_at.slice(0,10) === today))).length;

      const returned = apps.filter((a: any) => a.status === "returned").length;

      const totalUsers = usersJson.count ?? 0;

      setStats({ pending, approvedToday, returned, totalUsers });

      // Recent activity: take first 6 latest applications and map
      const recent = apps.slice(0, 6).map((a: any) => ({
        id: a.id_display || a.app_id || a.id,
        applicant: a.fullname,
        action: a.status,
        created_at: a.created_at || a.date,
      }));

      setRecentActivity(recent);
    } catch (err) {
      console.error(err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    // initial load
    loadDashboard();

    // Poll dashboard every 5 seconds silently
    const pollId = setInterval(() => {
      loadDashboard(true);
    }, 5000);

    return () => clearInterval(pollId);
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar isLoggedIn userRole={userRole} userName={userName} />

      <div className="flex flex-1">
        <StaffSidebar />

        <main className="flex-1 bg-background">
          <div className="container mx-auto px-4 py-8">
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

              <div className="md:col-span-1">
                <div className="bg-card p-4 rounded-lg shadow-card border border-border">
                  <p className="text-xs text-muted-foreground">Signed in as</p>
                  <p className="font-semibold mt-1">{userName}</p>
                  <p className="text-sm text-muted-foreground mt-1">Administrator</p>
                  <div className="mt-3 flex gap-2">
                    <button onClick={() => loadDashboard(true)} className="px-3 py-1 rounded-md bg-primary text-white text-sm">Refresh</button>
                    <button onClick={() => navigate('/staff/users')} className="px-3 py-1 rounded-md border border-border text-sm">Users</button>
                  </div>
                </div>
              </div>
            </div>

            {/* Statistics */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
              <Card className="shadow-card">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pending Applications</CardTitle>
                  <Clock className="h-5 w-5 text-warning" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{loading ? "—" : stats.pending}</div>
                </CardContent>
              </Card>

              <Card className="shadow-card">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Approved Today</CardTitle>
                  <CheckCircle className="h-5 w-5 text-success" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{loading ? "—" : stats.approvedToday}</div>
                </CardContent>
              </Card>

              <Card className="shadow-card">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Returned Applications</CardTitle>
                  <XCircle className="h-5 w-5 text-destructive" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{loading ? "—" : stats.returned}</div>
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

            {/* Recent Activity */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentActivity.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-base"
                    >
                      <div>
                        <p className="font-semibold">{activity.id}</p>
                        <p className="text-sm text-muted-foreground">{activity.applicant}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium"><StatusBadge status={activity.action} /></p>
                        <p className="text-xs text-muted-foreground">{formatRelative(activity.created_at)}</p>
                      </div>
                    </div>
                  ))}
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
