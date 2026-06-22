/**
 * LEARNER'S NOTE:
 * EmployeeDashboard.tsx is the main dashboard for employee users.
 *
 * KEY CONCEPTS:
 * - Similar structure to StudentDashboard but with additional contract monitoring features
 * - Role enforcement: Redirects non-employee users to their appropriate dashboards
 * - Contract alert: Shows warning banner when contract expires within 60 days
 * - Additional DashboardCard: "Contract Info" card for viewing contract details
 * - Alert component: Uses shadcn/ui Alert for warning messages with icon
 * - Navigation: Quick access buttons for Apply, Track, and Contract pages
 * - Revalidation: Same API endpoint as students for ID renewal
 */
import DashboardCard from "@/components/DashboardCard";
import Footer from "@/components/Footer";
import HighlightedName from "@/components/HighlightedName";
import Navbar from "@/components/Navbar";
import StatusBadge from "@/components/StatusBadge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, Bell, Calendar, FileText, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/lib/supabaseClient";

interface User {
  fullname: string;
  role: string;
  idno: string;
}

interface Application {
  id: number;
  id_display: string;
  fullname: string;
  idno: string;
  status: "submitted" | "under_review" | "approved" | "returned" | "rejected" | "expired";
  date: string;
}

const EmployeeDashboard = () => {
  const navigate = useNavigate();

  const [user, setUser] = useState<User | null>(null);
  const [recentApplications, setRecentApplications] = useState<Application[]>([]);

  // Load logged-in user from Supabase auth and profile
  useEffect(() => {
    const loadUser = async () => {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (!authUser) {
        navigate("/login");
        return;
      }

      // Fetch profile from profiles table
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (error) {
        console.error("Error fetching profile:", error);
        navigate("/login");
        return;
      }

      // Map profile to User interface (adjust as needed)
      const userData = {
        fullname: profile.fullname,
        role: profile.role as "student" | "employee" | "staff",
        idno: profile.idno,
        email: authUser.email ?? "",
      };

      setUser(userData);
      // Store in localStorage for consistency with other parts
      localStorage.setItem("user", JSON.stringify(userData));

      // Role verification for employee dashboard
      if (profile.role === "staff") {
        // Redirect staff to their dashboard
        navigate("/staff/dashboard", { replace: true });
        return;
      }
      if (profile.role !== "employee" && profile.role !== "student") {
        // Unexpected role, redirect to login
        navigate("/login");
        return;
      }

      fetchRecentApplications(profile.idno);
    };

    loadUser();
  }, [navigate]);

  // Fetch user's recent applications from backend
  const fetchRecentApplications = async (idno: string) => {
    try {
      const res = await fetch(`http://localhost:5000/api/applications?user=${idno}`);
      if (!res.ok) throw new Error("Failed to fetch applications");
      const data: Application[] = await res.json();
      setRecentApplications(data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load your applications");
    }
  };

  // Handle revalidation
  const handleRevalidate = async () => {
    if (!user) return;

    try {
      const res = await fetch("http://localhost:5000/api/applications/revalidate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idno: user.idno,
          fullname: user.fullname,
          role: user.role
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to submit");

      toast.success(data.message);

      // Refresh recent applications after submission
      fetchRecentApplications(user.idno);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Server error");
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Now using actual logged-in user */}
      <Navbar isLoggedIn={!!user} userRole={(user?.role as "student" | "employee" | "staff") || "employee"} userName={user?.fullname || ""} />

      <main className="flex-1 bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8 grid gap-4 md:grid-cols-3 items-start">
            <div className="md:col-span-2">
              <h1 className="text-3xl font-bold mb-2 flex items-baseline gap-3">
                Employee Dashboard
                <span className="text-sm text-muted-foreground">•</span>
                <span className="text-sm text-muted-foreground">Welcome back</span>
                {user && <HighlightedName name={user.fullname} />}
              </h1>
              <p className="text-muted-foreground">Manage your ID and track contract status.</p>
            </div>

            <div className="md:col-span-1">
              <div className="bg-card p-4 rounded-lg shadow-card border border-border">
                <p className="text-xs text-muted-foreground">Signed in as</p>
                <p className="font-semibold mt-1">{user?.fullname}</p>
                <p className="text-sm text-muted-foreground mt-1">{user?.role?.toUpperCase()}</p>
                <div className="mt-3 flex gap-2">
                  <button onClick={() => navigate('/apply')} className="px-3 py-1 rounded-md bg-primary text-white text-sm">Apply</button>
                  <button onClick={() => navigate('/contract')} className="px-3 py-1 rounded-md border border-border text-sm">Contract</button>
                </div>
              </div>
            </div>
          </div>

          {/* Contract Alert */}
          <Alert className="mb-6 border-warning bg-warning/10">
            <Calendar className="h-4 w-4 text-warning" />
            <AlertDescription className="text-warning-foreground">
              Your contract expires in <strong>45 days</strong> (March 15, 2024). Please process renewal soon.
            </AlertDescription>
          </Alert>

          {/* Quick Actions */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5 mb-8">
            <DashboardCard
              title="Apply for ID"
              description="Submit new ID application"
              icon={FileText}
              onClick={() => navigate("/apply")}
            />
            <DashboardCard
              title="Revalidate ID"
              description="Renew your existing ID"
              icon={RefreshCw}
              onClick={handleRevalidate}
            />
            <DashboardCard
              title="Track Status"
              description="Check application status"
              icon={BarChart3}
              onClick={() => navigate("/track")}
            />
            <DashboardCard
              title="Contract Info"
              description="View contract details"
              icon={Calendar}
              iconClassName="text-accent"
              onClick={() => navigate("/contract")}
            />
            <DashboardCard
              title="Notifications"
              description="View updates & alerts"
              icon={Bell}
              iconClassName="text-accent"
            >
              <div className="text-2xl font-bold">2</div>
              <p className="text-xs text-muted-foreground">New notifications</p>
            </DashboardCard>
          </div>

          {/* Recent Applications */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>Recent Applications</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentApplications.length === 0 ? (
                  <p className="text-muted-foreground">You have no applications yet.</p>
                ) : (
                  recentApplications.map((app) => (
                    <div
                      key={app.id}
                      className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-base cursor-pointer"
                      onClick={() => navigate("/track")}
                    >
                      <div>
                        <p className="font-semibold">{app.id_display}</p>
                        <p className="text-sm text-muted-foreground">{app.fullname}</p>
                      </div>
                      <div className="text-right">
                        <StatusBadge status={app.status} />
                        <p className="text-xs text-muted-foreground mt-1">{app.date}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Footer Revalidate Button */}
          <div className="mt-6 text-center">
            <button
              onClick={handleRevalidate}
              className="px-6 py-2 bg-primary text-white rounded-md hover:bg-primary/80 transition"
            >
              Revalidate ID
            </button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default EmployeeDashboard;
