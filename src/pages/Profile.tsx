/**
 * LEARNER'S NOTE:
 * Profile.tsx allows users to view and edit their profile information.
 *
 * KEY CONCEPTS:
 * - Authentication check: Validates user from localStorage, redirects to /login if not found
 * - Supabase integration: Uses supabase.auth.getUser() to get current user
 * - Form state management: Uses useState for fullname, idno, and role fields
 * - Profile loading: Fetches user profile data from the profiles table
 * - Form submission: Updates profile data in the profiles table using Supabase
 * - Loading states: Shows loading indicators during data fetch and submission
 * - Success/error handling: Uses toast notifications for user feedback
 */
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import {
  CheckCircle,
  ChevronDown,
  Square,
  UserPen
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/lib/supabaseClient";

// Helper function to validate role from Supabase data
const validateRole = (role: string | null | undefined): "student" | "employee" | "staff" => {
  const validRoles = ["student", "employee", "staff"] as const;
  if (role && validRoles.includes(role as typeof validRoles[number])) {
    return role as typeof validRoles[number];
  }
  return "student"; // default fallback
};

interface UserProfile {
  id: string;
  fullname: string;
  idno: string;
  role: "student" | "employee" | "staff";
  // Additional fields that might be in the profiles table
  course?: string | null;
  year?: string | null;
  created_at?: string;
  updated_at?: string;
}

const Profile = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);

  // Form state
  const [fullname, setFullname] = useState<string>("");
  const [idno, setIdno] = useState<string>("");
  const [role, setRole] = useState<"student" | "employee" | "staff">("student");
  const [course, setCourse] = useState<string | null>(null);
  const [year, setYear] = useState<string | null>(null);

  // Load user and profile data
  useEffect(() => {
    const loadUserAndProfile = async () => {
      try {
        setLoading(true);

        // Get current user from Supabase auth
        const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();

        if (userError) {
          throw userError;
        }

        if (!currentUser) {
          navigate("/login");
          return;
        }

        setUser(currentUser);

        // Fetch profile data from profiles table
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', currentUser.id)
          .single();

        if (profileError && profileError.code !== 'PGRST116') { // PGRST116 means no rows returned
          throw profileError;
        }

        if (profileData) {
          setProfile(profileData);
          // Set form state from profile data
          setFullname(profileData.fullname);
          setIdno(profileData.idno);
          setRole(validateRole(profileData.role));
          setCourse(profileData.course ?? null);
          setYear(profileData.year ?? null);
        } else {
          // If no profile exists yet, use data from user_metadata
          const metadata = currentUser.user_metadata || {};
          setProfile({
            id: currentUser.id,
            fullname: metadata.fullname || "",
            idno: metadata.idno || "",
            role: validateRole(metadata.role),
            course: metadata.course ?? null,
            year: metadata.year ?? null
          });

          // Set form state from user_metadata
          setFullname(metadata.fullname || "");
          setIdno(metadata.idno || "");
          setRole(validateRole(metadata.role));
          setCourse(metadata.course ?? null);
          setYear(metadata.year ?? null);
        }
      } catch (err: any) {
        console.error("Error loading profile:", err);
        toast.error("Failed to load profile data");
      } finally {
        setLoading(false);
      }
    };

    loadUserAndProfile();
  }, [navigate]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error("User not found");
      return;
    }

    setSaving(true);
    try {
      // Update profile in the profiles table
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          fullname: fullname,
          idno: idno,
          role: role,
          course: course,
          year: year,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'id'
        });

      if (error) {
        throw error;
      }

      // Also update user_metadata in auth.users for consistency
      const { error: metaError } = await supabase.auth.updateUser({
        data: {
          fullname,
          idno,
          role,
          course,
          year
        }
      });

      if (metaError) {
        console.warn("Failed to update user metadata:", metaError);
        // Don't throw error here as the main profile update succeeded
      }

      // Refresh current user so Navbar updates immediately
      const { data: refreshedUser } = await supabase.auth.getUser();

      if (refreshedUser.user) {
        setUser(refreshedUser.user);
      }

      toast.success("Profile updated successfully");

      // Update local state
      setProfile({
        id: user.id,
        fullname,
        idno,
        role,
        course,
        year,
        updated_at: new Date().toISOString()
      });
    } catch (err: any) {
      console.error("Error updating profile:", err);
      toast.error(err.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar isLoggedIn userRole="student" userName="Loading..." />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
            <p className="mt-4 text-muted-foreground">Loading profile...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!user) {
    // This should be caught by the useEffect redirect, but just in case
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar isLoggedIn userRole="student" userName="Redirecting..." />
        <main className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">Redirecting to login...</p>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar
        isLoggedIn
        userRole={validateRole(user.user_metadata?.role)}
        userName={(user.user_metadata?.fullname || "User")}
      />

      <main className="flex-1 p-6">
        <div className="container mx-auto">
          <div className="mb-6">
            <h1 className="text-3xl font-bold mb-2">
              User Profile
              <UserPen className="h-5 w-5 ml-2 text-primary" />
            </h1>
            <p className="text-muted-foreground">
              View and update your profile information
            </p>
          </div>

          {/* Profile Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Full Name Field */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-muted-foreground">
                Full Name
              </label>
              <input
                type="text"
                value={fullname}
                onChange={(e) => setFullname(e.target.value)}
                className="block w-full rounded-md border border-border p-3 bg-background/50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-0 disabled:opacity-50"
                placeholder="Enter your full name"
                required
                disabled={saving}
              />
            </div>

            {/* ID Number Field */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-muted-foreground">
                ID Number
              </label>
              <input
                type="text"
                value={idno}
                onChange={(e) => setIdno(e.target.value)}
                className="block w-full rounded-md border border-border p-3 bg-background/50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-0 disabled:opacity-50"
                placeholder="Enter your ID number"
                required
                disabled={saving}
              />
            </div>

            {/* Role Selection */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-muted-foreground">
                Role
              </label>
              <div className="relative">
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as "student" | "employee" | "staff")}
                  className="block w-full rounded-md border border-border p-3 pl-10 pr-3 bg-background/50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-0 disabled:opacity-50"
                  disabled={saving}
                >
                  <option value="student">Student</option>
                  <option value="employee">Employee</option>
                  <option value="staff">Staff (ICTC)</option>
                </select>
                <svg
                  className="absolute inset-y-0 right-3 flex items-center pointer-events-none h-4 w-4 text-muted-foreground"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <ChevronDown />
                </svg>
              </div>
            </div>

            {/* Course Field (conditional for students) */}
            {role === "student" && (
              <>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-muted-foreground">
                    Course
                  </label>
                  <input
                    type="text"
                    value={course || ""}
                    onChange={(e) => setCourse(e.target.value || null)}
                    className="block w-full rounded-md border border-border p-3 bg-background/50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-0 disabled:opacity-50"
                    placeholder="Enter your course"
                    disabled={saving}
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-muted-foreground">
                    Year Level
                  </label>
                  <input
                    type="text"
                    value={year || ""}
                    onChange={(e) => setYear(e.target.value || null)}
                    className="block w-full rounded-md border border-border p-3 bg-background/50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-0 disabled:opacity-50"
                    placeholder="Enter your year level"
                    disabled={saving}
                  />
                </div>
              </>
            )}

            {/* Submit Button */}
            <div className="flex justify-end">
              <Button
                type="submit"
                className="gradient-primary text-primary-foreground w-48"
                disabled={saving}
              >
                {saving ? "Saving..." : "Update Profile"}
              </Button>
            </div>
          </form>

          {/* Profile Info Display */}
          {!saving && profile && (
            <div className="mt-8 pt-6 border-t border-border">
              <h2 className="text-2xl font-bold mb-4">
                Current Profile Information
              </h2>
              <div className="space-y-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Full Name</p>
                  <p className="text-lg font-semibold">{profile.fullname}</p>
                </div>

                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">ID Number</p>
                  <p className="text-lg font-mono">{profile.idno}</p>
                </div>

                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Role</p>
                  <p className="text-lg font-semibold capitalize">
                    {profile.role}
                  </p>
                </div>

                {profile.role === "student" && (
                  <>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground">Course</p>
                      <p className="text-lg font-semibold">{profile.course || "Not specified"}</p>
                    </div>

                    <div className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground">Year Level</p>
                      <p className="text-lg font-semibold">{profile.year || "Not specified"}</p>
                    </div>
                  </>
                )}

                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Member Since</p>
                  <p className="text-lg font-mono text-muted-foreground">
                    {profile.created_at ? new Date(profile.created_at).toLocaleDateString() : "Unknown"}
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Last Updated</p>
                  <p className="text-lg font-mono text-muted-foreground">
                    {profile.updated_at ? new Date(profile.updated_at).toLocaleDateString() : "Unknown"}
                  </p>
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