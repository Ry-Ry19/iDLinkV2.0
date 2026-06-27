/**
 * TrackStatus.tsx
 * - Replaced localhost:5000 API with Supabase query (user_id based)
 * - Added ready_for_pickup to status type and timeline
 * - Polls every 10s so staff changes appear automatically
 * - Shows pickup date/batch from remarks when ready_for_pickup
 */
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import StatusBadge from "@/components/StatusBadge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Circle, PackageCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/lib/supabaseClient";

type AppStatus =
  | "submitted"
  | "under_review"
  | "approved"
  | "returned"
  | "rejected"
  | "expired"
  | "ready_for_pickup";

type BadgeStatus = "submitted" | "under_review" | "approved" | "returned" | "rejected" | "expired";

function safeBadgeStatus(status: AppStatus): BadgeStatus {
  if (status === "ready_for_pickup") return "approved";
  return status as BadgeStatus;
}

interface TimelineStep {
  label: string;
  date: string | null;
  completed: boolean;
  isCurrent: boolean;
}

interface Application {
  id: number;
  id_display: string;
  status: AppStatus;
  date: string;
  remarks?: string;
}

interface UserState {
  id: string;
  fullname: string;
  role: string;
  idno: string;
}

const STATUS_FLOW: AppStatus[] = ["submitted", "under_review", "approved", "ready_for_pickup"];

function getTimeline(app: Application): TimelineStep[] {
  // For terminal states (rejected/returned/expired), collapse to 2 steps
  if (app.status === "rejected" || app.status === "returned" || app.status === "expired") {
    return [
      { label: "Submitted", date: app.date, completed: true, isCurrent: false },
      { label: app.status.charAt(0).toUpperCase() + app.status.slice(1), date: app.date, completed: true, isCurrent: true },
    ];
  }

  const currentIndex = STATUS_FLOW.indexOf(app.status);
  const labels = ["Submitted", "Under Review", "Approved", "Ready for Pickup"];

  return STATUS_FLOW.map((s, i) => ({
    label: labels[i],
    date: i <= currentIndex ? app.date : null,
    completed: i <= currentIndex,
    isCurrent: i === currentIndex,
  }));
}

function getApplicationType(app: Application): string {
  const r = app.remarks ?? "";
  if (r.toLowerCase().includes("revalidat")) return "ID Revalidation";
  return "New ID Application";
}

const TrackStatus = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<UserState | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchApplications = async (userId: string, silent = false) => {
    try {
      const { data, error } = await supabase
        .from("applications")
        .select("id, id_display, status, date, remarks")
        .eq("user_id", userId)
        .order("id", { ascending: false });

      if (error) throw error;

      const mapped: Application[] = (data ?? []).map((app) => ({
        id: Number(app.id),
        id_display: String(app.id_display ?? app.id),
        status: (app.status as AppStatus) ?? "submitted",
        date: app.date
          ? new Date(app.date).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
          : "",
        remarks: app.remarks ?? "",
      }));

      setApplications(mapped);
    } catch (err) {
      console.error("fetchApplications error:", err);
      if (!silent) toast.error("Failed to load applications");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    const loadUser = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) { navigate("/login"); return; }

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("id, fullname, role, idno")
        .eq("id", authUser.id)
        .single();

      if (error || !profile) { navigate("/login"); return; }

      if (profile.role === "staff") {
        toast.error("Staff cannot access this page");
        navigate("/staff/dashboard", { replace: true });
        return;
      }

      setUser({ id: profile.id, fullname: profile.fullname, role: profile.role, idno: profile.idno });

      await fetchApplications(profile.id);
      pollRef.current = setInterval(() => fetchApplications(profile.id, true), 10000);
    };

    loadUser();
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [navigate]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar
        isLoggedIn={!!user}
        userRole={(user?.role as "student" | "employee" | "staff") ?? "student"}
        userName={user?.fullname ?? ""}
      />

      <main className="flex-1 bg-background">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Track Application Status</h1>
            <p className="text-muted-foreground">
              Monitor the progress of your ID applications in real time.
            </p>
          </div>

          {loading ? (
            <p className="text-center text-muted-foreground py-12">Loading your applications…</p>
          ) : applications.length === 0 ? (
            <Card className="shadow-card">
              <CardContent className="pt-8 pb-8 text-center">
                <p className="text-muted-foreground">You have no applications yet.</p>
                <button
                  onClick={() => navigate("/apply")}
                  className="mt-4 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm"
                >
                  Apply for an ID
                </button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {applications.map((app) => {
                const timeline = getTimeline(app);
                const appType = getApplicationType(app);
                const isReady = app.status === "ready_for_pickup";

                return (
                  <Card
                    key={app.id}
                    className={`shadow-card ${isReady ? "border-green-300" : ""}`}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            {appType}
                            {isReady && (
                              <PackageCheck className="h-5 w-5 text-green-600" />
                            )}
                          </CardTitle>
                          <CardDescription>Application ID: {app.id_display}</CardDescription>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <StatusBadge status={safeBadgeStatus(app.status)} />
                          {isReady && (
                            <p className="text-xs text-green-600 font-medium mt-1">Ready for Pickup</p>
                          )}
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-6">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <p className="text-sm text-muted-foreground">Submitted Date</p>
                          <p className="font-semibold">{app.date}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Current Status</p>
                          <p className="font-semibold capitalize">
                            {app.status === "ready_for_pickup" ? "Ready for Pickup" : app.status.replace(/_/g, " ")}
                          </p>
                        </div>
                      </div>

                      {/* Remarks — especially important for pickup schedule */}
                      {app.remarks && (
                        <div className={`rounded-lg p-3 ${isReady ? "bg-green-50 border border-green-200" : "bg-muted/40"}`}>
                          <p className="text-sm font-medium mb-1">
                            {isReady ? "📅 Pickup Information" : "Remarks"}
                          </p>
                          <p className={`text-sm ${isReady ? "text-green-800" : "text-muted-foreground"}`}>
                            {app.remarks}
                          </p>
                        </div>
                      )}

                      {/* Timeline */}
                      <div>
                        <p className="text-sm font-semibold mb-4">Application Timeline</p>
                        <div className="space-y-0">
                          {timeline.map((step, index) => (
                            <div key={index} className="flex gap-4">
                              <div className="flex flex-col items-center">
                                {step.completed ? (
                                  <CheckCircle className={`h-6 w-6 ${step.isCurrent && isReady ? "text-green-500" : "text-success"}`} />
                                ) : (
                                  <Circle className="h-6 w-6 text-muted-foreground" />
                                )}
                                {index < timeline.length - 1 && (
                                  <div className={`w-0.5 h-10 mt-1 ${step.completed ? "bg-success" : "bg-border"}`} />
                                )}
                              </div>
                              <div className="flex-1 pb-4 pt-0.5">
                                <p className={`font-medium text-sm ${step.completed ? "text-foreground" : "text-muted-foreground"}`}>
                                  {step.label}
                                  {step.isCurrent && (
                                    <span className="ml-2 text-xs rounded-full bg-primary/10 text-primary px-2 py-0.5">Current</span>
                                  )}
                                </p>
                                {step.date && (
                                  <p className="text-xs text-muted-foreground mt-0.5">{step.date}</p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default TrackStatus;