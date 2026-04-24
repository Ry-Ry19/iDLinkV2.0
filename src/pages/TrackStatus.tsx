import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import StatusBadge from "@/components/StatusBadge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Circle } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface TimelineStep {
  label: string;
  date: string | null;
  completed: boolean;
}

interface Application {
  id: number;
  id_display: string;
  status: "submitted" | "under_review" | "approved" | "returned" | "rejected" | "expired";
  date: string;
  remarks?: string;
  created_at?: string;
}

interface User {
  fullname: string;
  role: string;
  idno: string;
}

const TrackStatus = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(false);

  // Load user and fetch applications
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      const parsed = JSON.parse(storedUser);
      
      // Prevent staff from accessing this page
      if (parsed.role === "staff") {
        toast.error("Staff cannot access this page");
        navigate("/staff/dashboard", { replace: true });
        return;
      }

      setUser(parsed);
      fetchUserApplications(parsed.idno);

      // Set up auto-refresh: poll for updates every 5 seconds (silent mode)
      const pollInterval = setInterval(() => {
        fetchUserApplications(parsed.idno, true);
      }, 5000);

      // Cleanup interval on unmount
      return () => clearInterval(pollInterval);
    } else {
      navigate("/login");
    }
  }, [navigate]);

  // Fetch user's applications from backend (silent refresh for polling)
  const fetchUserApplications = async (idno: string, silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch(`http://localhost:5000/api/applications?user=${idno}`);
      if (!res.ok) throw new Error("Failed to fetch applications");
      const data: Application[] = await res.json();
      setApplications(data);
    } catch (err) {
      console.error(err);
      if (!silent) toast.error("Failed to load applications");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // Generate timeline based on status
  const getTimeline = (app: Application): TimelineStep[] => {
    const statusFlow = ["submitted", "under_review", "approved", "ready_for_pickup"];
    const currentIndex = statusFlow.indexOf(app.status);

    return [
      {
        label: "Submitted",
        date: app.date || null,
        completed: currentIndex >= 0,
      },
      {
        label: "Under Review",
        date: currentIndex >= 1 ? app.created_at?.split(" ")[0] || app.date : null,
        completed: currentIndex >= 1,
      },
      {
        label: "Approved",
        date: currentIndex >= 2 ? app.date : null,
        completed: currentIndex >= 2,
      },
      {
        label: "Ready for Pickup",
        date: currentIndex >= 3 ? app.date : null,
        completed: currentIndex >= 3,
      },
    ];
  };

  // Get application type
  const getApplicationType = (app: Application): string => {
    const remarks = app.remarks || "";
    if (remarks.includes("Revalidation") || remarks.includes("revalidate")) {
      return "ID Revalidation";
    }
    return "New ID Application";
  };


  return (
    <div className="min-h-screen flex flex-col">
      <Navbar
        isLoggedIn={!!user}
        userRole={(user?.role as "student" | "employee" | "staff") || "student"}
        userName={user?.fullname || ""}
      />
      
      <main className="flex-1 bg-background">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Track Application Status</h1>
            <p className="text-muted-foreground">Monitor the progress of your ID applications and revalidations.</p>
          </div>

          {loading ? (
            <p className="text-center text-muted-foreground">Loading your applications...</p>
          ) : applications.length === 0 ? (
            <Card className="shadow-card">
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">You have no applications yet.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {applications.map((app) => {
                const timeline = getTimeline(app);
                const appType = getApplicationType(app);

                return (
                  <Card key={app.id} className="shadow-card">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle>{appType}</CardTitle>
                          <CardDescription>Application ID: {app.id_display}</CardDescription>
                        </div>
                        <StatusBadge status={app.status} />
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
                          <p className="font-semdibold capitalize">{app.status.replace("_", " ")}</p>
                        </div>
                      </div>

                      {app.remarks && (
                        <div>
                          <p className="text-sm text-muted-foreground mb-2">Remarks</p>
                          <p className="text-sm">{app.remarks}</p>
                        </div>
                      )}

                      {/* Timeline */}
                      <div>
                        <p className="text-sm font-semibold mb-4">Application Timeline</p>
                        <div className="space-y-4">
                          {timeline.map((step, index) => (
                            <div key={index} className="flex gap-4">
                              <div className="flex flex-col items-center">
                                {step.completed ? (
                                  <CheckCircle className="h-6 w-6 text-success" />
                                ) : (
                                  <Circle className="h-6 w-6 text-muted-foreground" />
                                )}
                                {index < timeline.length - 1 && (
                                  <div className={`w-0.5 h-12 ${step.completed ? "bg-success" : "bg-border"}`} />
                                )}
                              </div>
                              <div className="flex-1 pb-4">
                                <p className={`font-medium ${step.completed ? "text-foreground" : "text-muted-foreground"}`}>
                                  {step.label}
                                </p>
                                {step.date && (
                                  <p className="text-sm text-muted-foreground">{step.date}</p>
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
