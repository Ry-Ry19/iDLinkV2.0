/**
 * Profile.tsx
 * - Avatar upload to Supabase Storage bucket "avatars"
 * - Reads/writes avatar_url column in profiles table
 * - Shows all profile fields: fullname, idno, role, email, course, year
 * - Email is read-only (from auth.users)
 * - Saves to profiles table via upsert
 *
 * IMPORTANT — run this SQL first in Supabase if avatar_url column doesn't exist:
 *   ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url text;
 * And create storage bucket "avatars" with public access in Storage settings.
 */
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Camera, Loader2, UserPen } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/lib/supabaseClient";

const validateRole = (role: unknown): "student" | "employee" | "staff" => {
  if (role === "student" || role === "employee" || role === "staff") return role;
  return "student";
};

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

interface ProfileData {
  id: string;
  fullname: string;
  idno: string;
  role: "student" | "employee" | "staff";
  email: string;
  course?: string | null;
  year?: string | null;
  avatar_url?: string | null;
  created_at?: string;
}

const Profile = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [authUser, setAuthUser] = useState<any>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Form fields
  const [fullname, setFullname] = useState("");
  const [idno, setIdno] = useState("");
  const [role, setRole] = useState<"student" | "employee" | "staff">("student");
  const [course, setCourse] = useState("");
  const [year, setYear] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data: { user: au } } = await supabase.auth.getUser();
      if (!au) { navigate("/login"); return; }
      setAuthUser(au);

      const { data: p, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", au.id)
        .single();

      if (error && error.code !== "PGRST116") {
        toast.error("Failed to load profile");
        setLoading(false);
        return;
      }

      if (p) {
        setProfile(p);
        setFullname(p.fullname ?? "");
        setIdno(p.idno ?? "");
        setRole(validateRole(p.role));
        setCourse(p.course ?? "");
        setYear(p.year ?? "");
        setAvatarUrl(p.avatar_url ?? null);
      } else {
        const m = au.user_metadata ?? {};
        setFullname(m.fullname ?? "");
        setIdno(m.idno ?? "");
        setRole(validateRole(m.role));
      }
      setLoading(false);
    };
    load();
  }, [navigate]);

  const handleAvatarClick = () => fileInputRef.current?.click();

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !authUser) return;

    // Validate: max 2 MB, image only
    if (file.size > 2 * 1024 * 1024) { toast.error("Image must be under 2 MB"); return; }
    if (!file.type.startsWith("image/")) { toast.error("Please upload an image file"); return; }

    setUploadingAvatar(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${authUser.id}/avatar.${ext}`;

      // Upload to "avatars" bucket (create it as public in Supabase Storage)
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type });

      if (upErr) throw upErr;

      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      const newUrl = data.publicUrl + `?t=${Date.now()}`; // cache-bust

      // Save to profile
      const { error: dbErr } = await supabase
        .from("profiles")
        .update({ avatar_url: data.publicUrl })
        .eq("id", authUser.id);

      if (dbErr) throw dbErr;

      setAvatarUrl(newUrl);
      toast.success("Profile photo updated");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to upload photo");
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

 const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!authUser) return;
  setSaving(true);
  try {
    const { error } = await supabase
      .from("profiles")
      .upsert({
        id: authUser.id,
        fullname: fullname.trim(),
        idno: idno.trim(),
        role,
        course: course.trim() || null,
        year: year.trim() || null,
        email: authUser.email, // 👈 This line ensures the email field is sent during creation
      }, { onConflict: "id" });

    if (error) throw error;

    // Keep auth metadata in sync
    await supabase.auth.updateUser({ data: { fullname: fullname.trim(), idno: idno.trim(), role } });

    toast.success("Profile updated successfully");

    // Refresh profile state
    const { data: fresh } = await supabase.from("profiles").select("*").eq("id", authUser.id).single();
    if (fresh) setProfile(fresh);
  } catch (err: any) {
    console.error(err);
    toast.error(err.message || "Failed to update profile");
  } finally {
    setSaving(false);
  }
};


  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar isLoggedIn userRole="student" userName="Loading…" />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar
        isLoggedIn
        userRole={validateRole(authUser?.user_metadata?.role)}
        userName={fullname || "User"}
      />

      <main className="flex-1 p-6">
        <div className="container mx-auto max-w-2xl">
          <div className="mb-6 flex items-center gap-2">
            <h1 className="text-3xl font-bold">Profile</h1>
            <UserPen className="h-6 w-6 text-primary" />
          </div>

          {/* ── Avatar section ── */}
          <div className="flex flex-col items-center mb-8">
            <div className="relative group cursor-pointer" onClick={handleAvatarClick}>
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Profile"
                  className="h-28 w-28 rounded-full object-cover border-2 border-border shadow-md"
                />
              ) : (
                <div className="h-28 w-28 rounded-full bg-primary/20 flex items-center justify-center border-2 border-border shadow-md">
                  <span className="text-primary font-bold text-2xl">
                    {fullname ? getInitials(fullname) : "?"}
                  </span>
                </div>
              )}
              <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                {uploadingAvatar
                  ? <Loader2 className="h-6 w-6 text-white animate-spin" />
                  : <Camera className="h-6 w-6 text-white" />
                }
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Click to change photo (max 2 MB)</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>

          {/* ── Form ── */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Full name */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">Full Name</label>
              <input
                type="text"
                value={fullname}
                onChange={(e) => setFullname(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                placeholder="Enter your full name"
                required
                disabled={saving}
              />
            </div>

            {/* ID Number */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">ID Number</label>
              <input
                type="text"
                value={idno}
                onChange={(e) => setIdno(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                placeholder="Enter your ID number"
                required
                disabled={saving}
              />
            </div>

            {/* Email — read only from auth */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">Email</label>
              <input
                type="email"
                value={authUser?.email ?? ""}
                readOnly
                className="w-full rounded-md border border-input bg-muted px-3 py-2.5 text-sm text-muted-foreground cursor-not-allowed"
              />
              <p className="text-xs text-muted-foreground">Email is managed byuser account and cannot be changed here.</p>
            </div>

            {/* Role */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as "student" | "employee" | "staff")}
                className="w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                disabled={saving}
              >
                <option value="student">Student</option>
                <option value="employee">Employee</option>
                <option value="staff">Staff (ICTC)</option>
              </select>
            </div>

            {/* Course + Year — students only */}
            {role === "student" && (
              <>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-muted-foreground">Course</label>
                  <input
                    type="text"
                    value={course}
                    onChange={(e) => setCourse(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                    placeholder="e.g. BS Computer Science"
                    disabled={saving}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-muted-foreground">Year Level</label>
                  <input
                    type="text"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                    placeholder="e.g. 3rd Year"
                    disabled={saving}
                  />
                </div>
              </>
            )}

            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={saving} className="w-40">
                {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</> : "Update Profile"}
              </Button>
            </div>
          </form>

          {/* ── Info display ── */}
          {profile && (
            <div className="mt-10 pt-6 border-t border-border space-y-4">
              <h2 className="text-lg font-semibold">Account Info</h2>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Member since</p>
                  <p className="font-medium">
                    {profile.created_at ? new Date(profile.created_at).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }) : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">User ID</p>
                  <p className="font-mono text-xs break-all">{profile.id}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Profile;