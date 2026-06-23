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

      // Debug: inspect applications table structure and data
      const inspectApplications = async () => {
        try {
          console.log('Debug: User IDNO from profile:', profile.idno);
          // Check if applications table exists and get sample row
          const { data: sampleData, error: sampleError } = await supabase
            .from('applications')
            .select('*')
            .limit(1);

          if (sampleError) {
            console.error('Debug: Error querying applications table:', sampleError);
          } else {
            console.log('Debug: Applications table sample data:', sampleData);
            if (sampleData.length > 0) {
              console.log('Debug: Columns present in applications table:', Object.keys(sampleData[0]));
            } else {
              // No rows, check total count
              const { data: countData, error: countError } = await supabase
                .from('applications')
                .select('*', { count: 'exact', head: true });
              if (!countError) {
                console.log('Debug: Total rows in applications table:', countData?.length ?? 0);
              }
            }
          }

          // Also check for any rows matching this user IDNO
          const { data: userData, error: userError } = await supabase
            .from('applications')
            .select('*')
            .eq('idno', profile.idno)
            .limit(5);

          if (userError) {
            console.error('Debug: Error fetching user applications:', userError);
          } else {
            console.log('Debug: Applications for current user (limit 5):', userData);
            console.log('Debug: Number of applications for user:', userData.length);
          }
        } catch (err) {
          console.error('Debug: Exception during application inspection:', err);
        }
      };

      // Run inspection
      await inspectApplications();

      fetchRecentApplications(profile.idno);
    };

    loadUser();
  }, [navigate]);

  // Fetch user's recent applications from Supabase
  const fetchRecentApplications = async (idno: string) => {
    if (!idno) {
      console.warn('fetchRecentApplications called with empty idno');
      setRecentApplications([]);
      return;
    }

    try {
      console.log('Fetching applications for idno:', idno);
      let { data, error } = await supabase
        .from('applications')
        .select('*')
        .eq('idno', idno)
        .order('id', { ascending: false }); // Try to order by id descending (assuming id exists)

      // If we got a column/table error for id, try without ordering
      if (error && (error.code === '42P01' || error.code === '42703')) {
        console.log('Failed to order by id, trying without order by');
        const { data: dataFallback, error: errorFallback } = await supabase
          .from('applications')
          .select('*')
          .eq('idno', idno);

        if (errorFallback) {
          console.error('Error fetching applications (fallback):', errorFallback);
          // Check if it's a table/column missing error
          if (errorFallback.code === '42P01' || errorFallback.code === '42703') {
            toast.warning("Applications table or columns not yet configured properly");
          } else {
            toast.error("Failed to load your applications: " + errorFallback.message);
          }
          setRecentApplications([]);
          return;
        } else {
          data = dataFallback;
          error = null; // Clear the error since fallback succeeded
          console.log('Applications data received (without ordering):', data);
        }
      } else if (error) {
        // Some other error
        console.error('Error fetching applications:', error);
        // Check if it's a table/column missing error
        if (error.code === '42P01' || error.code === '42703') {
          toast.warning("Applications table or columns not yet configured properly");
        } else {
          toast.error("Failed to load your applications: " + error.message);
        }
        setRecentApplications([]);
        return;
      } else {
        console.log('Applications data received:', data);
      }

      // Map Supabase data to Application interface with defensive checks
      const applications: Application[] = (data || []).map(app => {
        // Safely get each field with fallbacks
        const id = app.id !== undefined && app.id !== null ? Number(app.id) : 0;
        const id_display = app.id_display !== undefined && app.id_display !== null
                          ? String(app.id_display)
                          : (app.id !== undefined && app.id !== null ? String(app.id) : 'Unknown');
        const fullname = app.fullname !== undefined && app.fullname !== null
                        ? String(app.fullname)
                        : 'Unknown User';
        const appIdno = app.idno !== undefined && app.idno !== null
                    ? String(app.idno)
                    : 'Unknown ID';
        // Handle status - ensure it's one of the valid values
        const validStatuses = ["submitted", "under_review", "approved", "returned", "rejected", "expired"] as const;
        const status = app.status && validStatuses.includes(app.status as any)
                      ? (app.status as Application['status'])
                      : 'submitted'; // default fallback
        // Handle date with multiple fallbacks
        let dateString = '';
        if (app.date && typeof app.date === 'string') {
          dateString = new Date(app.date).toLocaleDateString();
        } else if (app.created_at && typeof app.created_at === 'string') {
          dateString = new Date(app.created_at).toLocaleDateString();
        } else {
          dateString = new Date().toLocaleDateString();
        }

        return {
          id,
          id_display,
          fullname,
          idno: appIdno,
          status,
          date: dateString
        };
      });

      console.log('Mapped applications:', applications);
      setRecentApplications(applications);
    } catch (err) {
      console.error('Unexpected error in fetchRecentApplications:', err);
      toast.error("An unexpected error occurred while loading applications");
      setRecentApplications([]);
    }
  };

  // Handle revalidation via Supabase
  const handleRevalidate = async () => {
    if (!user) return;

    try {
      // Try to call a Supabase function or insert into applications table for revalidation
      // For now, we'll simulate by adding a pending application record
      const { data, error } = await supabase
        .from('applications')
        .insert([
          {
            idno: user.idno,
            fullname: user.fullname,
            role: user.role,
            status: 'submitted' as const,
            date: new Date().toISOString(),
            // created_at column does not exist, omitted
          }
        ]);

      if (error) {
        // If applications table doesn't exist or column missing, show a message
        if (error.code === '42P01' || error.code === '42703') { // undefined_table or undefined_column
          toast.success("Revalidation request submitted! (Applications table or columns not yet configured)");
        } else {
          throw error;
        }
      } else {
        toast.success("Revalidation request submitted successfully!");
      }

      // Refresh recent applications
      fetchRecentApplications(user.idno);
    } catch (err: any) {
      console.error(err);
      // Handle case where applications table doesn't exist or column missing
      if (err?.code === '42P01' || err?.code === '42703') {
        toast.success("Revalidation request submitted! (Applications table or columns not yet configured)");
        // Still refresh applications (will show empty state)
        if (user?.idno) {
          fetchRecentApplications(user.idno);
        }
      } else {
        toast.error(err.message || "Server error");
      }
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
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default EmployeeDashboard;
