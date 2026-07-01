/**
 * Notifications.tsx
 * - Fetches from public.notifications filtered by the logged-in user's ID
 * - Marks individual notifications as read on click
 * - Mark All as Read button when there are unread notifications
 * - Real-time polling every 15s so newly-inserted notifications (from staff
 *   actions in RecordsManagement) appear without a manual refresh
 * - Type badge distinguishes "system" vs "staff" notifications
 */
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Bell, BellDot, Check, CheckCheck, Users2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";

interface Notification {
  id: string;
  user_id: string;
  sender_id: string | null;
  title: string;
  message: string;
  type: "system" | "staff";
  is_read: boolean;
  created_at: string;
}

interface UserProfile {
  id: string;
  fullname: string;
  role: string;
  idno: string;
  email: string;
  avatar_url?: string | null;
}

// Human-friendly relative timestamp ("2 minutes ago", "Yesterday", etc.)
function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (mins < 1)   return "Just now";
  if (mins < 60)  return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  if (days === 1) return "Yesterday";
  if (days < 7)   return `${days} days ago`;
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

const TYPE_META: Record<
  Notification["type"],
  { icon: React.ReactNode; label: string; labelClass: string }
> = {
  system: {
    icon: <BellDot className="h-4 w-4" />,
    label: "System",
    labelClass: "bg-muted text-muted-foreground",
  },
  staff: {
    icon: <Users2 className="h-4 w-4" />,
    label: "Staff",
    labelClass: "bg-primary/10 text-primary",
  },
};

const Notifications = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<UserProfile | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const fetchNotifications = async (userId: string, silent = false) => {
    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setNotifications(data ?? []);
    } catch (err) {
      console.error("fetchNotifications error:", err);
      if (!silent) toast.error("Failed to load notifications");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) { navigate("/login"); return; }

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", authUser.id)
          .single();

        if (profileError || !profile) { navigate("/login"); return; }

        const userData: UserProfile = {
          id: profile.id,
          fullname: profile.fullname,
          role: profile.role,
          idno: profile.idno,
          email: authUser.email ?? "",
          avatar_url: profile.avatar_url ?? null,
        };
        setUser(userData);

        await fetchNotifications(authUser.id);
        // Poll every 15s so staff-triggered notifications appear promptly
        pollRef.current = setInterval(() => fetchNotifications(authUser.id, true), 15_000);
      } catch (err) {
        console.error("Notifications init error:", err);
        toast.error("Failed to load notifications");
        setLoading(false);
      }
    };

    init();
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [navigate]);

  const markAsRead = async (id: string) => {
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", id);

    if (error) {
      console.error("markAsRead error:", error);
      return;
    }
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
  };

  const markAllAsRead = async () => {
    if (!user) return;
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("is_read", false);

    if (error) {
      toast.error("Failed to mark all as read");
      return;
    }
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    toast.success("All notifications marked as read");
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar isLoggedIn={true} userRole="student" userName="Loading..." />
        <main className="flex-1 bg-background flex items-center justify-center">
          <div className="space-y-3 w-full max-w-2xl px-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar
        isLoggedIn={true}
        userRole={user.role as "student" | "employee" | "staff"}
        userName={user.fullname}
      />

      <main className="flex-1 bg-background">
        <div className="container mx-auto px-4 py-8 max-w-2xl">

          {/* Header */}
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Notifications</h1>
              {unreadCount > 0 && (
                <p className="text-sm text-muted-foreground mt-0.5">
                  {unreadCount} unread notification{unreadCount !== 1 ? "s" : ""}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                    {unreadCount}
                  </span>
                  <button
                    onClick={markAllAsRead}
                    className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted"
                  >
                    <CheckCheck className="h-3.5 w-3.5" />
                    Mark all read
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Empty state */}
          {notifications.length === 0 ? (
            <div className="text-center py-16">
              <Bell className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
              <p className="font-medium text-muted-foreground">No notifications yet</p>
              <p className="text-sm text-muted-foreground/60 mt-1">
                You'll be notified here when staff update your application.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map((n) => {
                const meta = TYPE_META[n.type] ?? TYPE_META.system;
                return (
                  <Card
                    key={n.id}
                    className={`transition-colors cursor-pointer border ${
                      !n.is_read
                        ? "border-primary/40 bg-primary/5 hover:bg-primary/10"
                        : "border-border hover:bg-muted/40"
                    }`}
                    onClick={() => { if (!n.is_read) markAsRead(n.id); }}
                  >
                    <CardHeader className="pb-2 pt-4 px-4">
                      <div className="flex items-start justify-between gap-3">
                        {/* Left: icon + title + message */}
                        <div className="flex items-start gap-3 min-w-0">
                          {/* Unread dot */}
                          <span className={`mt-1 h-2 w-2 flex-shrink-0 rounded-full ${!n.is_read ? "bg-primary" : "bg-transparent"}`} />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              {/* Type badge */}
                              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${meta.labelClass}`}>
                                {meta.icon}
                                {meta.label}
                              </span>
                              <p className="text-sm font-semibold leading-tight">{n.title}</p>
                            </div>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                              {n.message}
                            </p>
                          </div>
                        </div>

                        {/* Right: timestamp + read status */}
                        <div className="text-right flex-shrink-0 space-y-1">
                          <p className="text-xs text-muted-foreground whitespace-nowrap">
                            {relativeTime(n.created_at)}
                          </p>
                          <p className={`text-xs font-medium ${n.is_read ? "text-muted-foreground" : "text-primary"}`}>
                            {n.is_read ? "Read" : "Unread"}
                          </p>
                        </div>
                      </div>
                    </CardHeader>

                    {/* Mark-as-read button — only for unread */}
                    {!n.is_read && (
                      <CardContent className="pt-0 pb-3 px-4">
                        <button
                          onClick={(e) => { e.stopPropagation(); markAsRead(n.id); }}
                          className="flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
                          aria-label="Mark as read"
                        >
                          <Check className="h-3.5 w-3.5" />
                          Mark as read
                        </button>
                      </CardContent>
                    )}
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

export default Notifications;