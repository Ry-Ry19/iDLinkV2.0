import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import StaffSidebar from "@/components/StaffSidebar";
import StatusBadge from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Edit, Eye, Search, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

// Small dialog component to schedule pickup for an application
function EditScheduleDialog({ app, onSaved, open: controlledOpen, onOpenChange }: { app: Application; onSaved: () => void; open?: boolean; onOpenChange?: (v: boolean) => void }) {
  const [date, setDate] = useState<string>("");
  const [batch, setBatch] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [internalOpen, setInternalOpen] = useState(false);
  const open = typeof controlledOpen === "boolean" ? controlledOpen : internalOpen;
  const setOpen = (v: boolean) => {
    if (typeof controlledOpen === "boolean") onOpenChange?.(v);
    else setInternalOpen(v);
  };

  useEffect(() => {
    // Try to parse existing remarks like "Ready for pickup on 2025-01-01 (Batch: X)"
    const m = (app.remarks || "").match(/Ready for pickup on (\d{4}-\d{2}-\d{2})(?: \(Batch: ([^)]+)\))?/);
    if (m) {
      setDate(m[1]);
      if (m[2]) setBatch(m[2]);
    }
  }, [app]);

  // debug: track dialog open state
  useEffect(() => {
    console.log('Schedule dialog open:', open, 'for app id', app.id);
  }, [open, app.id]);

  const save = async () => {
    if (!date) return toast.error("Please choose a pickup date");
    setSaving(true);
    try {
      const remarks = `Ready for pickup on ${date}${batch ? ` (Batch: ${batch})` : ""}`;
      const res = await fetch(`http://localhost:5000/api/applications/${app.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "ready_for_pickup", remarks, notify: true, pickup_date: date, batch }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        console.error('Failed to save:', json);
        throw new Error("Failed to save");
      }
      toast.success("Scheduled and notified successfully");
      // If backend returned an Ethereal preview URL, open it for inspection
      if (json?.preview) {
        try {
          window.open(json.preview, "_blank");
          toast.success("Opened email preview in a new tab");
        } catch (e) {
          console.log("Could not open preview URL", e);
        }
      }
      onSaved();
      setOpen(false);
    } catch (err) {
      toast.error("Failed to schedule pickup");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {/* If uncontrolled, render a trigger button so it still works standalone */}
      {!controlledOpen && (
        <DialogTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Schedule pickup" onClick={() => setOpen(true)}>
            <Edit className="h-4 w-4" />
          </Button>
        </DialogTrigger>
      )}

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Schedule Pickup</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">Select pickup date</p>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>

          <div>
            <p className="text-sm text-muted-foreground">Batch (optional)</p>
            <Select value={batch} onValueChange={(v) => setBatch(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select batch or type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Morning">Morning</SelectItem>
                <SelectItem value="Afternoon">Afternoon</SelectItem>
                <SelectItem value="Batch A">Batch A</SelectItem>
                <SelectItem value="Batch B">Batch B</SelectItem>
                <SelectItem value="">No Batch</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving}>{saving ? "Saving..." : "Save & Notify"}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Dialog to compose and send a custom email
function ComposeEmailDialog({ to, open, onOpenChange }: { to?: string; open?: boolean; onOpenChange?: (v: boolean) => void }) {
  const [subject, setSubject] = useState("IDLink Notification");
  const [text, setText] = useState("Hello,\n\nThis is a message from IDLink.");
  const [sending, setSending] = useState(false);
  const [mailerStatus, setMailerStatus] = useState<{ mode?: string; configured?: boolean } | null>(null);

  useEffect(() => {
    if (open) {
      fetch("http://localhost:5000/api/mailer-status")
        .then((r) => r.json())
        .then((j) => setMailerStatus(j))
        .catch(() => setMailerStatus(null));
    }
  }, [open]);

  const send = async () => {
    if (!to) return toast.error("No recipient available");
    if (mailerStatus && !mailerStatus.configured) return toast.error("Mail transporter not configured");
    setSending(true);
    try {
      const res = await fetch("http://localhost:5000/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to, subject, text }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        console.error('Send email failed:', json);
        toast.error(json?.message || "Failed to send email");
        return;
      }
      toast.success("Email sent");
      if (json?.preview) {
        try { window.open(json.preview, "_blank"); toast.success("Opened email preview"); } catch (e) { /* ignore */ }
      }
      onOpenChange?.(false);
    } catch (err) {
      console.error('Send email error:', err);
      toast.error("Network error: Failed to send email");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={!!open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        {/* invisible trigger - parent will control opening */}
        <span />
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Send Email</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">To</p>
            <Input value={to || ""} readOnly />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Subject</p>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Message</p>
            <textarea className="w-full rounded-md border p-2 bg-black text-white" rows={6} value={text} onChange={(e) => setText(e.target.value)} />
            {mailerStatus && !mailerStatus.configured && (
              <p className="text-xs text-red-400 mt-1">Mailer not configured ({mailerStatus.mode})</p>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => onOpenChange?.(false)}>Cancel</Button>
            <Button onClick={send} disabled={sending}>{sending ? "Sending..." : "Send"}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

type StatusType = "submitted" | "under_review" | "approved" | "returned" | "rejected" | "expired";

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
  department?: string | null;
  course?: string | null;
  status: StatusType;
  date: string;
  photo?: string;
  signature?: string;
  cor?: string;
  remarks?: string;
};

const RecordsManagement = () => {
  const [records, setRecords] = useState<Application[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<StatusType | "all">("all");
  const [loading, setLoading] = useState(false);

  const [user, setUser] = useState<{ fullname?: string; role?: unknown }>({});
  const [scheduleOpenId, setScheduleOpenId] = useState<number | null>(null);
  const [composeOpenId, setComposeOpenId] = useState<number | null>(null);
  const navigate = useNavigate();

  // Load logged-in user and enforce staff-only access
  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) {
      const parsed = JSON.parse(stored);
      setUser(parsed);

      if (!isUserRole(parsed.role) || parsed.role !== "staff") {
        toast.error("Access denied. Staff only.");
        navigate("/login", { replace: true });
      }
    } else {
      toast.error("Please sign in as staff to access this page.");
      navigate("/login", { replace: true });
    }
  }, [navigate]);

  // Fetch Applications (silent mode suppresses loading state and error toasts)
  const fetchRecords = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await fetch("http://localhost:5000/api/applications");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setRecords(data);
    } catch (err) {
      if (!silent) toast.error("Failed to load records");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // Only fetch records when a staff user is present
  useEffect(() => {
    if (isUserRole(user.role) && user.role === "staff") {
      // Initial load
      fetchRecords();

      // Poll for updates every 5 seconds (silent to avoid UI flicker)
      const poll = setInterval(() => fetchRecords(true), 5000);
      return () => clearInterval(poll);
    }
  }, [user]);

  // Delete
  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure?")) return;
    try {
      const res = await fetch(`http://localhost:5000/api/applications/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Deleted successfully");
      fetchRecords();
    } catch {
      toast.error("Delete failed");
    }
  };

  // Filtering
  const filteredRecords = records.filter((r) => {
    const q = searchTerm.toLowerCase();
    const matches =
      r.fullname.toLowerCase().includes(q) ||
      r.idno.toLowerCase().includes(q) ||
      r.id_display.toLowerCase().includes(q);
    return matches && (filterStatus === "all" || r.status === filterStatus);
  });

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar
        isLoggedIn
        userRole={isUserRole(user.role) ? user.role : "staff"}
        userName={user.fullname || "User"}
      />

      <div className="flex flex-1 gap-2">
        <StaffSidebar />

        <main className="flex-1 p-6 bg-muted/10">
          <div className="mb-6 flex flex-col gap-2">
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

                <Select value={filterStatus} onValueChange={(val) => setFilterStatus(val as any)}>
                  <SelectTrigger className="md:w-52">
                    <SelectValue placeholder="Filter status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="submitted">Submitted</SelectItem>
                    <SelectItem value="under_review">Under Review</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="returned">Returned</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Table */}
              <div className="rounded-xl border overflow-hidden">
                {loading ? (
                  <p className="p-6 text-center text-muted-foreground">Loading...</p>
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
                        <TableHead>Revalidate</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>

                    <TableBody>
                      {filteredRecords.map((r) => (
                        <TableRow key={r.id} className="hover:bg-muted/20">
                          <TableCell className="font-semibold">{r.id_display}</TableCell>
                          <TableCell>{r.fullname}</TableCell>
                          <TableCell>{r.idno}</TableCell>
                          <TableCell>{r.department ?? r.course ?? "—"}</TableCell>
                          <TableCell><StatusBadge status={r.status} /></TableCell>
                          <TableCell>{r.date}</TableCell>

                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={async () => {
                                  try {
                                    const res = await fetch(`http://localhost:5000/api/applications/${r.id}`, {
                                      method: "PUT",
                                      headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({ status: "approved", remarks: "Revalidation accepted", notify: true }),
                                    });
                                    const json = await res.json().catch(() => ({}));
                                    if (!res.ok) throw new Error(json?.message || "Failed to accept");
                                    toast.success("Revalidation accepted");
                                    if (json?.preview) {
                                      try { window.open(json.preview, "_blank"); toast.success("Opened email preview"); } catch (e) { /* ignore */ }
                                    }
                                    fetchRecords();
                                  } catch (err) {
                                    toast.error("Failed to accept");
                                  }
                                }}
                                className="text-success"
                              >
                                Accept
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={async () => {
                                  try {
                                    const res = await fetch(`http://localhost:5000/api/applications/${r.id}`, {
                                      method: "PUT",
                                      headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({ status: "rejected", remarks: "Revalidation rejected", notify: true }),
                                    });
                                    const json = await res.json().catch(() => ({}));
                                    if (!res.ok) throw new Error(json?.message || "Failed to reject");
                                    toast.success("Revalidation rejected");
                                    if (json?.preview) {
                                      try { window.open(json.preview, "_blank"); toast.success("Opened email preview"); } catch (e) { /* ignore */ }
                                    }
                                    fetchRecords();
                                  } catch (err) {
                                    toast.error("Failed to reject");
                                  }
                                }}
                                className="text-destructive"
                              >
                                Reject
                              </Button>
                            </div>
                          </TableCell>

                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>

                                <DropdownMenuContent>
                                  <DropdownMenuItem onSelect={() => setScheduleOpenId(r.id)}>Schedule Pickup</DropdownMenuItem>
                                  <DropdownMenuItem onSelect={() => setComposeOpenId(r.id)}>Send Email</DropdownMenuItem>
                                  <DropdownMenuItem onSelect={async () => {
                                    try {
                                      const res = await fetch('http://localhost:5000/api/mailer-status');
                                      const json = await res.json();
                                      toast.success(`Mailer: ${json.mode} (configured=${json.configured})`);
                                    } catch (e) { toast.error('Failed to get mailer status'); }
                                  }}>Mailer Status</DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                              <EditScheduleDialog app={r} onSaved={() => fetchRecords()} open={scheduleOpenId === r.id} onOpenChange={(v) => setScheduleOpenId(v ? r.id : null)} />
                              <ComposeEmailDialog to={r.email} open={composeOpenId === r.id} onOpenChange={(v) => setComposeOpenId(v ? r.id : null)} />

                              {/* View Files */}
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <Eye className="h-4 w-4 text-primary" />
                                  </Button>
                                </DialogTrigger>

                                <DialogContent className="sm:max-w-xl">
                                  <DialogHeader>
                                    <DialogTitle>Uploaded Files</DialogTitle>
                                  </DialogHeader>

                                  <div className="space-y-4">
                                    {r.photo && (
                                      <div>
                                        <p className="font-medium">Photo</p>
                                        <img
                                          src={`http://localhost:5000/uploads/${r.photo}`}
                                          className="rounded-xl max-h-64 border object-contain"
                                        />
                                      </div>
                                    )}

                                    {r.signature && (
                                      <div>
                                        <p className="font-medium">Signature</p>
                                        <img
                                          src={`http://localhost:5000/uploads/${r.signature}`}
                                          className="rounded-xl max-h-32 border object-contain"
                                        />
                                      </div>
                                    )}

                                    {r.cor && (
                                      <div>
                                        <p className="font-medium">COR File</p>
                                        <a
                                          href={`http://localhost:5000/uploads/${r.cor}`}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="text-primary underline"
                                        >
                                          Open COR
                                        </a>
                                      </div>
                                    )}

                                    {!r.photo && !r.signature && !r.cor && (
                                      <p className="text-muted-foreground">No files uploaded</p>
                                    )}
                                  </div>
                                </DialogContent>
                              </Dialog>

                              <Button variant="ghost" size="icon" onClick={() => handleDelete(r.id)}>
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

      <Footer />
    </div>
  );
};

export default RecordsManagement;
