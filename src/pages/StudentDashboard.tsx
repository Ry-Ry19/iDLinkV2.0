/**
 * LEARNER'S NOTE:
 * StudentDashboard.tsx is the main dashboard for student users.
 *
 * KEY CONCEPTS:
 * - Role enforcement: Redirects staff members to /staff/dashboard if they try to access
 * - User state initialization: Reads user from localStorage on component mount
 * - API integration: Fetches recent applications from /api/applications endpoint
 * - Revalidation: POST to /api/applications/revalidate with user idno, fullname, and role
 * - DashboardCard component: Reusable clickable cards for quick actions (Apply, Revalidate, Track, Notifications)
 * - HighlightedName component: Displays the logged-in user's name with visual emphasis
 * - Auto-refresh: After revalidation, refreshes application list to show updated status
 */
import DashboardCard from "@/components/DashboardCard";
import Footer from "@/components/Footer";
import HighlightedName from "@/components/HighlightedName";
import Navbar from "@/components/Navbar";
import StatusBadge from "@/components/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, Bell, FileText, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/lib/supabaseClient";

interface User {
  fullname: string;
  role: string;
  idno: string;
  email: string;
}

interface Application {
  id: number;
  id_display: string;
  fullname: string;
  idno: string;
  status: "submitted" | "under_review" | "approved" | "returned" | "rejected" | "expired";
  date: string;
}

const StudentDashboard = () => {
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

      // Role verification for student dashboard
      if (profile.role !== "student") {
        // Redirect to appropriate dashboard based on role
        if (profile.role === "employee") {
          navigate("/employee/dashboard", { replace: true });
        } else if (profile.role === "staff") {
          navigate("/staff/dashboard", { replace: true });
        } else {
          navigate("/login");
        }
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

  // Handle automatic revalidation
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
      <Navbar
        isLoggedIn={!!user}
        userRole={(user?.role as "student" | "employee" | "staff") || "student"}
        userName={user?.fullname || ""}
      />

      <main className="flex-1 bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8 grid gap-4 md:grid-cols-3 items-start">
            <div className="md:col-span-2">
              <h1 className="text-3xl font-bold mb-2 flex items-baseline gap-3">
                Student Dashboard
                <span className="text-sm text-muted-foreground">•</span>
                <span className="text-sm text-muted-foreground">Welcome back</span>
                {user && <HighlightedName name={user.fullname} />}
              </h1>
              <p className="text-muted-foreground">Manage your ID applications here with ease.</p>
            </div>

            <div className="md:col-span-1">
              <div className="bg-card p-4 rounded-lg shadow-card border border-border">
                <p className="text-xs text-muted-foreground">Signed in as</p>
                <p className="font-semibold mt-1">{user?.fullname}</p>
                <p className="text-sm text-muted-foreground mt-1">{user?.role?.toUpperCase()}</p>
                <div className="mt-3 flex gap-2">
                  <button onClick={() => navigate('/track')} className="px-3 py-1 rounded-md bg-primary text-white text-sm">Track</button>
                  <button onClick={() => navigate('/apply')} className="px-3 py-1 rounded-md border border-border text-sm">Apply</button>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
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
              title="Notifications"
              description="View updates & alerts"
              icon={Bell}
              iconClassName="text-accent"
            >
              <div className="text-2xl font-bold">3</div>
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

          {/* Optional Footer Revalidate Button */}
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

export default StudentDashboard;
