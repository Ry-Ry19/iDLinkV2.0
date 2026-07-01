/**
 * RecordsManagement.tsx
 *
 * FIXES IN THIS PASS:
 * - EditScheduleDialog: notification insert is fully isolated in its own
 *   try/catch so a notifications RLS error can never cause "Failed to save
 *   pickup schedule". The schedule update and the notification are two
 *   independent operations — if the notification fails, we log it and move on.
 * - Real Supabase error message is surfaced in the toast so you can see
 *   exactly what went wrong (e.g. RLS violation, missing column, etc.)
 * - Same isolation applied to updateStatus (approve/reject) and
 *   ComposeEmailDialog so notification failures are always non-fatal.
 * - "Connect a mail service" info toast removed from EditScheduleDialog
 *   (it only belongs in ComposeEmailDialog).
 */
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import StaffSidebar from "@/components/StaffSidebar";
import StatusBadge from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Edit, Eye, MoreHorizontal, Search, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/lib/supabaseClient";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function storageUrl(bucket: string, path: string): string {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data?.publicUrl ?? "";
}

function safeBadgeStatus(
  status: string
): "submitted" | "under_review" | "approved" | "returned" | "rejected" | "expired" {
  const map: Record<string, "submitted" | "under_review" | "approved" | "returned" | "rejected" | "expired"> = {
    ready_for_pickup: "approved",
  };
  return (map[status] as any) ?? (status as any);
}

function appendRemark(existing: string | undefined | null, note: string): string {
  const base = (existing ?? "").trim();
  return base ? `${base} ${note}` : note;
}

/**
 * Inserts one row into public.notifications.
 * Returns true on success, false on failure (always non-fatal to the caller).
 */
async function insertNotification({
  userId,
  senderId,
  title,
  message,
  type = "staff",
}: {
  userId: string;
  senderId: string | null;
  title: string;
  message: string;
  type?: "system" | "staff";
}): Promise<boolean> {
  try {
    const { error } = await supabase.from("notifications").insert({
      user_id: userId,
      sender_id: senderId,
      title,
      message,
      type,
      is_read: false,
    });
    if (error) {
      // Log the full Supabase error so it's visible in DevTools
      console.error("[insertNotification] Supabase error:", error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[insertNotification] Unexpected error:", err);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type AppStatus =
  | "submitted"
  | "under_review"
  | "approved"
  | "returned"
  | "rejected"
  | "expired"
  | "ready_for_pickup";

const ALL_STATUSES: { value: AppStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "submitted", label: "Submitted" },
  { value: "under_review", label: "Under Review" },
  { value: "approved", label: "Approved" },
  { value: "ready_for_pickup", label: "Ready for Pickup" },
  { value: "returned", label: "Returned" },
  { value: "rejected", label: "Rejected" },
  { value: "expired", label: "Expired" },
];

type UserRole = "student" | "employee" | "staff";

function isUserRole(v: unknown): v is UserRole {
  return v === "student" || v === "employee" || v === "staff";
}

type Application = {
  id: number;
  id_display: string;
  fullname: string;
  idno: string;
  email?: string;
  user_id?: string;
  department_or_course?: string | null;
  status: AppStatus;
  date: string;
  photo?: string;
  signature?: string;
  cor?: string;
  remarks?: string;
};

// ---------------------------------------------------------------------------
// EditScheduleDialog
// ---------------------------------------------------------------------------

function EditScheduleDialog({
  app,
  staffId,
  onSaved,
  open,
  onOpenChange,
}: {
  app: Application;
  staffId: string | null;
  onSaved: () => void;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [date, setDate] = useState("");
  const [batch, setBatch] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const m = (app.remarks ?? "").match(
      /Ready for pickup on (\d{4}-\d{2}-\d{2})(?: \(Batch: ([^)]+)\))?/
    );
    setDate(m?.[1] ?? "");
    setBatch(m?.[2] ?? "");
  }, [open, app.remarks]);

  const save = async () => {
    if (!date) return toast.error("Please choose a pickup date");
    setSaving(true);

    try {
      const scheduleTimestamp = new Date().toISOString();
      const batchLabel = batch && batch !== "none" ? ` (Batch: ${batch})` : "";
      const pickupLine = `Ready for pickup on ${date}${batchLabel} [Scheduled: ${scheduleTimestamp}]`;

      const withoutOldPickup = (app.remarks ?? "")
        .replace(/Ready for pickup on [^\[]+\[Scheduled:[^\]]+\]/g, "")
        .trim();

      const newRemarks = withoutOldPickup
        ? `${pickupLine} ${withoutOldPickup}`
        : pickupLine;

      // ── Step 1: update the application row ────────────────────────────────
      // This is the critical operation. If this fails, we surface the real
      // Supabase error message so you know exactly what went wrong.
      const { error: updateError } = await supabase
        .from("applications")
        .update({ status: "ready_for_pickup", remarks: newRemarks })
        .eq("id", app.id);

      if (updateError) {
        // Surface the actual DB error (e.g. "new row violates row-level security policy")
        console.error("[EditScheduleDialog] update error:", updateError);
        toast.error(`Failed to save: ${updateError.message}`);
        return;
      }

      // ── Step 2: insert notification (independent — never blocks the save) ─
      if (app.user_id) {
        const batchSuffix = batch && batch !== "none" ? ` — ${batch} batch` : "";
        const notifOk = await insertNotification({
          userId: app.user_id,
          senderId: staffId,
          title: "ID Ready for Pickup",
          message: `Your ID (${app.id_display}) is ready for pickup on ${date}${batchSuffix}. Please visit the ICTC office during office hours.`,
        });
        if (!notifOk) {
          // Schedule saved fine; notification silently failed.
          // Warn but don't block — check Supabase RLS on notifications table.
          toast.warning("Schedule saved, but the in-app notification could not be sent. Check notifications RLS policy.");
        }
      }
      // ─────────────────────────────────────────────────────────────────────

      toast.success("Pickup scheduled — applicant will be notified.");
      onSaved();
      onOpenChange(false);

    } catch (err) {
      // Catch anything truly unexpected (network down, etc.)
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[EditScheduleDialog] unexpected error:", err);
      toast.error(`Unexpected error: ${msg}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Schedule Pickup — {app.id_display}</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground -mt-2">
          The pickup date and batch will appear in the applicant's Track Status and Notifications.
        </p>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Pickup date</p>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Batch (optional)</p>
            <Select value={batch} onValueChange={setBatch}>
              <SelectTrigger>
                <SelectValue placeholder="Select batch" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Morning">Morning</SelectItem>
                <SelectItem value="Afternoon">Afternoon</SelectItem>
                <SelectItem value="Batch A">Batch A</SelectItem>
                <SelectItem value="Batch B">Batch B</SelectItem>
                <SelectItem value="none">No Batch</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? "Saving…" : "Save & Notify"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// ComposeEmailDialog
// ---------------------------------------------------------------------------

function ComposeEmailDialog({
  app,
  staffId,
  open,
  onOpenChange,
  onSent,
}: {
  app: Application;
  staffId: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSent?: () => void;
}) {
  const [subject, setSubject] = useState("IDLink Notification");
  const [body, setBody] = useState("Hello,\n\nThis is a message from IDLink.");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (open) {
      setSubject("IDLink Notification");
      setBody("Hello,\n\nThis is a message from IDLink.");
    }
  }, [open]);

  const send = async () => {
    if (!app.email) return toast.error("No recipient email on record for this applicant");
    setSending(true);
    try {
      // Simulated send — replace with a Supabase Edge Function + real mailer
      await new Promise((res) => setTimeout(res, 1000));

      // ── Step 1: append email-sent note to remarks ─────────────────────────
      const emailNote = `[Email sent: ${new Date().toISOString()}]`;
      const { error: updateError } = await supabase
        .from("applications")
        .update({ remarks: appendRemark(app.remarks, emailNote) })
        .eq("id", app.id);

      if (updateError) {
        console.error("[ComposeEmailDialog] remarks update error:", updateError);
        // Non-fatal for the email flow — continue
      }

      // ── Step 2: insert notification (independent) ─────────────────────────
      if (app.user_id) {
        await insertNotification({
          userId: app.user_id,
          senderId: staffId,
          title: subject,
          message: body,
        });
      }
      // ─────────────────────────────────────────────────────────────────────

      toast.success(`Email queued for ${app.email}`);
      toast.info("Connect a mail service (Resend / SendGrid) via a Supabase Edge Function to send real emails.");
      onOpenChange(false);
      onSent?.();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[ComposeEmailDialog] error:", err);
      toast.error(`Failed to send email: ${msg}`);
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Send Email — {app.id_display}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground mb-1">To</p>
            <Input
              value={app.email ?? "(no email on record)"}
              readOnly
              className="text-muted-foreground"
            />
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Subject</p>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Message</p>
            <textarea
              className="w-full rounded-md border border-input bg-background text-foreground p-3 text-sm min-h-[140px] focus:outline-none focus:ring-2 focus:ring-ring resize-y"
              rows={6}
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={send} disabled={sending}>
              {sending ? "Sending…" : "Send"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// MailerStatusDialog
// ---------------------------------------------------------------------------

function MailerStatusDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Mailer Status</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between rounded-lg border p-3">
            <span className="text-muted-foreground">Mode</span>
            <span className="font-medium">Ethereal (simulated)</span>
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <span className="text-muted-foreground">Status</span>
            <span className="font-medium text-green-600">Configured ✓</span>
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <span className="text-muted-foreground">Real sending</span>
            <span className="font-medium text-yellow-600">Not connected</span>
          </div>
          <p className="text-muted-foreground text-xs pt-1">
            To send real emails, connect a mail provider (Resend, SendGrid, etc.)
            via a Supabase Edge Function and replace the simulated send in
            ComposeEmailDialog.
          </p>
          <div className="flex justify-end pt-1">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Close</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// ViewFilesDialog
// ---------------------------------------------------------------------------

function ViewFilesDialog({
  app,
  open,
  onOpenChange,
}: {
  app: Application;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const photoUrl = app.photo ? storageUrl("uploads", app.photo) : null;
  const sigUrl   = app.signature ? storageUrl("uploads", app.signature) : null;
  const corUrl   = app.cor ? storageUrl("uploads", app.cor) : null;
  const hasFiles = photoUrl || sigUrl || corUrl;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Uploaded Files — {app.id_display}</DialogTitle>
        </DialogHeader>
        <div className="space-y-5">
          {!hasFiles && (
            <p className="text-muted-foreground text-sm text-center py-6">
              No files uploaded for this application.
            </p>
          )}
          {photoUrl && (
            <div className="space-y-1">
              <p className="text-sm font-semibold">Photo</p>
              <img
                src={photoUrl}
                alt="Applicant photo"
                className="rounded-lg border max-h-64 object-contain w-full bg-muted"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                  toast.error("Could not load photo");
                }}
              />
              <a href={photoUrl} target="_blank" rel="noreferrer" className="text-xs text-primary underline">
                Open in new tab
              </a>
            </div>
          )}
          {sigUrl && (
            <div className="space-y-1">
              <p className="text-sm font-semibold">Signature</p>
              <img
                src={sigUrl}
                alt="Applicant signature"
                className="rounded-lg border max-h-32 object-contain w-full bg-muted"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                  toast.error("Could not load signature");
                }}
              />
              <a href={sigUrl} target="_blank" rel="noreferrer" className="text-xs text-primary underline">
                Open in new tab
              </a>
            </div>
          )}
          {corUrl && (
            <div className="space-y-1">
              <p className="text-sm font-semibold">COR (Certificate of Registration)</p>
              {app.cor?.toLowerCase().endsWith(".pdf") ? (
                <iframe src={corUrl} title="COR PDF" className="w-full h-64 rounded-lg border" />
              ) : (
                <img
                  src={corUrl}
                  alt="COR"
                  className="rounded-lg border max-h-64 object-contain w-full bg-muted"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = "none";
                  }}
                />
              )}
              <a href={corUrl} target="_blank" rel="noreferrer" className="text-xs text-primary underline">
                Open / Download COR
              </a>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

const RecordsManagement = () => {
  const [records, setRecords]           = useState<Application[]>([]);
  const [searchTerm, setSearchTerm]     = useState("");
  const [filterStatus, setFilterStatus] = useState<AppStatus | "all">("all");
  const [loading, setLoading]           = useState(false);
  const [user, setUser]                 = useState<{ fullname?: string; role?: unknown }>({});
  const [staffId, setStaffId]           = useState<string | null>(null);

  const [scheduleOpenId, setScheduleOpenId]   = useState<number | null>(null);
  const [composeOpenId, setComposeOpenId]     = useState<number | null>(null);
  const [viewFilesOpenId, setViewFilesOpenId] = useState<number | null>(null);
  const [mailerOpen, setMailerOpen]           = useState(false);

  const navigate = useNavigate();

  // Auth
  useEffect(() => {
    const loadUser = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) {
          toast.error("Please sign in.");
          navigate("/login", { replace: true });
          return;
        }

        const { data: profile, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", authUser.id)
          .single();

        if (error || !profile) {
          toast.error("Failed to load profile");
          navigate("/login", { replace: true });
          return;
        }

        setUser({ fullname: profile.fullname, role: profile.role });
        setStaffId(authUser.id);

        if (profile.role !== "staff") {
          toast.error("Access denied. Staff only.");
          navigate("/", { replace: true });
        }
      } catch {
        toast.error("Authentication error");
        navigate("/login", { replace: true });
      }
    };
    loadUser();
  }, [navigate]);

  const fetchRecords = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const { data, error } = await supabase
        .from("applications")
        .select("*")
        .order("id", { ascending: false });
      if (error) throw error;
      setRecords(data ?? []);
    } catch (err) {
      console.error("[fetchRecords] error:", err);
      if (!silent) toast.error("Failed to load records");
      setRecords([]);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    if (isUserRole(user.role) && user.role === "staff") {
      fetchRecords();
      const poll = setInterval(() => fetchRecords(true), 5000);
      return () => clearInterval(poll);
    }
  }, [user]);

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this record permanently?")) return;
    try {
      const { error } = await supabase.from("applications").delete().eq("id", id);
      if (error) throw error;
      toast.success("Record deleted");
      fetchRecords();
    } catch (err) {
      toast.error("Delete failed: " + (err instanceof Error ? err.message : "Unknown error"));
    }
  };

  /**
   * Updates application status and fires a notification independently.
   * A notification failure never rolls back the status change.
   */
  const updateStatus = async (
    app: Application,
    newStatus: AppStatus,
    remarkNote: string,
    notification: { title: string; message: string }
  ) => {
    // Step 1: update application
    const { error: updateError } = await supabase
      .from("applications")
      .update({
        status: newStatus,
        remarks: appendRemark(app.remarks, remarkNote),
      })
      .eq("id", app.id);

    if (updateError) {
      console.error("[updateStatus] Supabase error:", updateError);
      throw new Error(updateError.message);
    }

    // Step 2: notification (non-fatal)
    if (app.user_id) {
      await insertNotification({
        userId: app.user_id,
        senderId: staffId,
        title: notification.title,
        message: notification.message,
      });
    }

    fetchRecords();
  };

  const filteredRecords = records.filter((r) => {
    const q = searchTerm.toLowerCase();
    const matches =
      r.fullname.toLowerCase().includes(q) ||
      r.idno.toLowerCase().includes(q) ||
      r.id_display.toLowerCase().includes(q);
    return matches && (filterStatus === "all" || r.status === filterStatus);
  });

  const scheduleApp = records.find((r) => r.id === scheduleOpenId) ?? null;
  const viewApp     = records.find((r) => r.id === viewFilesOpenId) ?? null;
  const composeApp  = records.find((r) => r.id === composeOpenId) ?? null;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar
        isLoggedIn
        userRole={isUserRole(user.role) ? user.role : "staff"}
        userName={user.fullname || "Staff"}
      />

      <div className="flex flex-1 gap-2">
        <StaffSidebar />

        <main className="flex-1 p-6 bg-muted/10">
          <div className="mb-6">
            <h1 className="text-3xl font-bold">Records Management</h1>
            <p className="text-muted-foreground">Monitor and manage ID applications</p>
          </div>

          <Card className="shadow-lg rounded-xl">
            <CardHeader className="border-b">
              <CardTitle>Applications</CardTitle>
              <CardDescription>Student and Employee ID submissions</CardDescription>
            </CardHeader>

            <CardContent className="space-y-6 mt-4">
              <div className="flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, ID, or App ID"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select
                  value={filterStatus}
                  onValueChange={(v) => setFilterStatus(v as AppStatus | "all")}
                >
                  <SelectTrigger className="md:w-52">
                    <SelectValue placeholder="Filter status" />
                  </SelectTrigger>
                  <SelectContent>
                    {ALL_STATUSES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="rounded-xl border overflow-hidden">
                {loading ? (
                  <p className="p-6 text-center text-muted-foreground">Loading…</p>
                ) : records.length === 0 ? (
                  <p className="p-6 text-center text-muted-foreground">No records found</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead>App ID</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>ID No.</TableHead>
                        <TableHead>Dept / Course</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Quick Actions</TableHead>
                        <TableHead className="text-right">More</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRecords.map((r) => (
                        <TableRow key={r.id} className="hover:bg-muted/20">
                          <TableCell className="font-semibold">{r.id_display}</TableCell>
                          <TableCell>{r.fullname}</TableCell>
                          <TableCell>{r.idno}</TableCell>
                          <TableCell>{r.department_or_course ?? "—"}</TableCell>
                          <TableCell>
                            <StatusBadge status={safeBadgeStatus(r.status)} />
                            {r.status === "ready_for_pickup" && (
                              <span className="ml-1 text-xs text-green-600 font-medium">Ready</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {r.date
                              ? new Date(r.date).toLocaleDateString(undefined, {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                })
                              : "—"}
                          </TableCell>

                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-green-600 border-green-200 hover:bg-green-50"
                                onClick={async () => {
                                  try {
                                    await updateStatus(
                                      r,
                                      "approved",
                                      `[Approved: ${new Date().toISOString()}]`,
                                      {
                                        title: "Application Approved",
                                        message: `Your ID application (${r.id_display}) has been approved. Your ID is being processed.`,
                                      }
                                    );
                                    toast.success("Approved");
                                  } catch (err) {
                                    toast.error("Failed to approve: " + (err instanceof Error ? err.message : "Unknown error"));
                                  }
                                }}
                              >
                                Approve
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-red-600 border-red-200 hover:bg-red-50"
                                onClick={async () => {
                                  try {
                                    await updateStatus(
                                      r,
                                      "rejected",
                                      `[Rejected: ${new Date().toISOString()}]`,
                                      {
                                        title: "Application Rejected",
                                        message: `Your ID application (${r.id_display}) was not approved. Please visit the ICTC office for more information.`,
                                      }
                                    );
                                    toast.success("Rejected");
                                  } catch (err) {
                                    toast.error("Failed to reject: " + (err instanceof Error ? err.message : "Unknown error"));
                                  }
                                }}
                              >
                                Reject
                              </Button>
                            </div>
                          </TableCell>

                          <TableCell className="text-right">
                            <div className="flex justify-end items-center gap-1">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" aria-label="More actions">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onSelect={() => setScheduleOpenId(r.id)}>
                                    <Edit className="mr-2 h-3.5 w-3.5" />
                                    Schedule Pickup
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onSelect={() => setComposeOpenId(r.id)}>
                                    Send Email
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onSelect={() => setMailerOpen(true)}>
                                    Mailer Status
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>

                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label="View files"
                                onClick={() => setViewFilesOpenId(r.id)}
                              >
                                <Eye className="h-4 w-4 text-primary" />
                              </Button>

                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label="Delete"
                                onClick={() => handleDelete(r.id)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>

              <p className="text-sm text-muted-foreground">
                Showing {filteredRecords.length} of {records.length} applications
              </p>
            </CardContent>
          </Card>
        </main>
      </div>

      {scheduleApp && (
        <EditScheduleDialog
          app={scheduleApp}
          staffId={staffId}
          onSaved={fetchRecords}
          open={scheduleOpenId === scheduleApp.id}
          onOpenChange={(v) => setScheduleOpenId(v ? scheduleApp.id : null)}
        />
      )}

      {composeApp && (
        <ComposeEmailDialog
          app={composeApp}
          staffId={staffId}
          open={composeOpenId === composeApp.id}
          onOpenChange={(v) => setComposeOpenId(v ? composeApp.id : null)}
          onSent={fetchRecords}
        />
      )}

      {viewApp && (
        <ViewFilesDialog
          app={viewApp}
          open={viewFilesOpenId === viewApp.id}
          onOpenChange={(v) => setViewFilesOpenId(v ? viewApp.id : null)}
        />
      )}

      <MailerStatusDialog open={mailerOpen} onOpenChange={setMailerOpen} />

      <Footer />
    </div>
  );
};

export default RecordsManagement;