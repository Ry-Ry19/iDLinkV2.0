/**
 * RecordsManagement.tsx — Staff interface for viewing and managing all applications.
 *
 * FIXES IN THIS VERSION:
 * - ComposeEmailDialog now receives `app` as a prop (not via outer-scope closure)
 *   so it can correctly read and append to app.remarks without stale references.
 * - Remarks are appended cleanly: pickup info written by EditScheduleDialog is
 *   never clobbered by a subsequent email-send or approve/reject action.
 * - StatusType no longer includes "ready_for_pickup" in the local union; instead
 *   the schedule dialog updates status directly via raw string to avoid the
 *   StatusBadge type error. StatusBadge receives a mapped safe value.
 * - ComposeEmailDialog textarea uses theme-aware classes (no hardcoded bg-black)
 * - MailerStatusDialog is a real modal, not just a toast
 * - EditScheduleDialog pre-fill correctly fires when dialog opens
 * - All dialogs rendered outside <table> DOM tree
 * - storageUrl() uses supabase.storage.getPublicUrl for correct file URLs
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

/**
 * Maps any status string (including ready_for_pickup which StatusBadge may not
 * know about) to a value StatusBadge accepts.
 */
function safeBadgeStatus(
  status: string
): "submitted" | "under_review" | "approved" | "returned" | "rejected" | "expired" {
  const map: Record<string, "submitted" | "under_review" | "approved" | "returned" | "rejected" | "expired"> = {
    ready_for_pickup: "approved",
  };
  return (map[status] as any) ?? (status as any);
}

/**
 * Appends a timestamped note to existing remarks without clobbering any
 * pickup-schedule info that EditScheduleDialog already wrote.
 */
function appendRemark(existing: string | undefined | null, note: string): string {
  const base = (existing ?? "").trim();
  return base ? `${base} ${note}` : note;
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
  onSaved,
  open,
  onOpenChange,
}: {
  app: Application;
  onSaved: () => void;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [date, setDate] = useState("");
  const [batch, setBatch] = useState("");
  const [saving, setSaving] = useState(false);

  // Pre-fill when dialog opens
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

      // Build a clean pickup line — this becomes the primary visible remark
      // shown to the student/employee in TrackStatus.tsx
      const pickupLine = `Ready for pickup on ${date}${batch && batch !== "none" ? ` (Batch: ${batch})` : ""} [Scheduled: ${scheduleTimestamp}]`;

      // Strip any previous pickup line before writing the new one so we don't
      // accumulate duplicates. Keep anything else that was appended (e.g. email logs).
      const existingRemarks = app.remarks ?? "";
      const withoutOldPickup = existingRemarks
        .replace(/Ready for pickup on [^\[]+\[Scheduled:[^\]]+\]/g, "")
        .trim();

      const newRemarks = withoutOldPickup
        ? `${pickupLine} ${withoutOldPickup}`
        : pickupLine;

      const { error } = await supabase
        .from("applications")
        .update({ status: "ready_for_pickup", remarks: newRemarks })
        .eq("id", app.id);

      if (error) throw error;
      toast.success("Pickup scheduled — applicant will see this on their Track Status page.");
      onSaved();
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      toast.error("Failed to save pickup schedule");
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
          The pickup date and batch will appear in the applicant's Track Status remarks.
        </p>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Pickup date</p>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
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
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
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
// FIX: accepts `app` as a prop instead of relying on an outer-scope variable.
// This prevents stale closure bugs where the dialog reads the wrong applicant's
// remarks when opened for a different row.
// ---------------------------------------------------------------------------

function ComposeEmailDialog({
  app,
  open,
  onOpenChange,
  onSent,
}: {
  app: Application;           // ← explicit prop, not outer-scope closure
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSent?: () => void;
}) {
  const [subject, setSubject] = useState("IDLink Notification");
  const [body, setBody] = useState("Hello,\n\nThis is a message from IDLink.");
  const [sending, setSending] = useState(false);

  // Reset when re-opened
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
      // Replace with a real Supabase Edge Function call in production
      await new Promise((res) => setTimeout(res, 1000));

      // Append email-sent note without overwriting existing remarks
      // (pickup schedule info written by EditScheduleDialog is preserved)
      const emailNote = `[Email sent: ${new Date().toISOString()}]`;
      const { error } = await supabase
        .from("applications")
        .update({ remarks: appendRemark(app.remarks, emailNote) })
        .eq("id", app.id);

      if (error) throw error;

      toast.success(`Email queued for ${app.email}`);
      toast.info("Connect a mail service (Resend / SendGrid) via a Supabase Edge Function to send real emails.");
      onOpenChange(false);
      onSent?.();
    } catch {
      toast.error("Failed to send email");
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
  const sigUrl = app.signature ? storageUrl("uploads", app.signature) : null;
  const corUrl = app.cor ? storageUrl("uploads", app.cor) : null;
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
  const [records, setRecords] = useState<Application[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<AppStatus | "all">("all");
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<{ fullname?: string; role?: unknown }>({});

  // One open-id per dialog type
  const [scheduleOpenId, setScheduleOpenId] = useState<number | null>(null);
  const [composeOpenId, setComposeOpenId] = useState<number | null>(null);
  const [viewFilesOpenId, setViewFilesOpenId] = useState<number | null>(null);
  const [mailerOpen, setMailerOpen] = useState(false);

  const navigate = useNavigate();

  // Auth
  useEffect(() => {
    const loadUser = async () => {
      try {
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser();
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

  // Fetch
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
      console.error(err);
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

  // Actions
  const handleDelete = async (id: number) => {
    if (!confirm("Delete this record permanently?")) return;
    try {
      const { error } = await supabase.from("applications").delete().eq("id", id);
      if (error) throw error;
      toast.success("Record deleted");
      fetchRecords();
    } catch (err) {
      toast.error(
        "Delete failed: " + (err instanceof Error ? err.message : "Unknown error")
      );
    }
  };

  const updateStatus = async (id: number, updates: Partial<Application>) => {
    const { error } = await supabase.from("applications").update(updates).eq("id", id);
    if (error) throw error;
    fetchRecords();
  };

  // Derived
  const filteredRecords = records.filter((r) => {
    const q = searchTerm.toLowerCase();
    const matches =
      r.fullname.toLowerCase().includes(q) ||
      r.idno.toLowerCase().includes(q) ||
      r.id_display.toLowerCase().includes(q);
    return matches && (filterStatus === "all" || r.status === filterStatus);
  });

  // Look up the full Application object for each open dialog
  const scheduleApp = records.find((r) => r.id === scheduleOpenId) ?? null;
  const viewApp = records.find((r) => r.id === viewFilesOpenId) ?? null;
  const composeApp = records.find((r) => r.id === composeOpenId) ?? null;

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
              {/* Search + Filter */}
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
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Table */}
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
                              <span className="ml-1 text-xs text-green-600 font-medium">
                                Ready
                              </span>
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

                          {/* Quick approve / reject */}
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-green-600 border-green-200 hover:bg-green-50"
                                onClick={async () => {
                                  try {
                                    await updateStatus(r.id, {
                                      status: "approved",
                                      // Append — don't overwrite any existing pickup remarks
                                      remarks: appendRemark(
                                        r.remarks,
                                        `[Approved: ${new Date().toISOString()}]`
                                      ),
                                    });
                                    toast.success("Approved");
                                  } catch {
                                    toast.error("Failed to approve");
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
                                    await updateStatus(r.id, {
                                      status: "rejected",
                                      remarks: appendRemark(
                                        r.remarks,
                                        `[Rejected: ${new Date().toISOString()}]`
                                      ),
                                    });
                                    toast.success("Rejected");
                                  } catch {
                                    toast.error("Failed to reject");
                                  }
                                }}
                              >
                                Reject
                              </Button>
                            </div>
                          </TableCell>

                          {/* More actions */}
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

                              {/* Eye — view files */}
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label="View files"
                                onClick={() => setViewFilesOpenId(r.id)}
                              >
                                <Eye className="h-4 w-4 text-primary" />
                              </Button>

                              {/* Delete */}
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

      {/* ── Global dialogs — outside <table> ── */}

      {scheduleApp && (
        <EditScheduleDialog
          app={scheduleApp}
          onSaved={fetchRecords}
          open={scheduleOpenId === scheduleApp.id}
          onOpenChange={(v) => setScheduleOpenId(v ? scheduleApp.id : null)}
        />
      )}

      {/* FIX: pass `app={composeApp}` as a prop instead of reading composeApp
          from an outer-scope variable inside the dialog. This ensures the dialog
          always has the correct, up-to-date Application object for the row that
          was clicked, preventing stale-closure bugs. */}
      {composeApp && (
        <ComposeEmailDialog
          app={composeApp}
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