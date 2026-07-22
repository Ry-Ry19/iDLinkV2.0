/**
 * LEARNER'S NOTE:
 * Login.tsx handles user authentication.
 *
 * KEY CONCEPTS:
 * - State management: Uses useState for email, password, role, and password visibility
 * - Form handling: onSubmit event triggers handleLogin function
 * - API integration: Supabase signInWithPassword for authentication
 * - localStorage: Stores user info (fullname, role, idno, email) on successful login (from user_metadata)
 * - Role-based navigation: Redirects to different dashboards based on user role
 *   (student → /student/dashboard, employee → /employee/dashboard, staff → /staff/dashboard)
 * - Toast notifications: Uses sonner for success/error feedback
 * - UI layout: One unified card split into two equal-height halves — form on the left,
 *   video on the right (video hidden on mobile)
 *
 * DESIGN NOTES (this pass — matched to a reference institutional portal screenshot):
 * - Card is now borderless (just a shadow), white panel + full-bleed photo, instead of a
 *   bordered card — closer to a real campus portal than a "marketing" card.
 * - Inputs lost their visible <Label> text (labels are now sr-only, so screen readers still
 *   get them) in favor of placeholder-only fields, matching the reference's plain look.
 * - "Forgot password?" now sits in the same row as the submit button instead of stacked
 *   below it, and the button itself is no longer full-width.
 * - Dropped the second descriptive subtitle line under the heading — one plain line plus the
 *   logo lockup reads cleaner, same as the reference.
 * - Removed the colored ambient blur shapes behind the card; the reference sits on a flat,
 *   neutral background, so the card needs to do all the work via shadow alone.
 * - Added a small dynamic copyright caption under the card (year computed at render time, not
 *   hardcoded), mirroring the reference's footer line without inventing a fixed date.
 */

import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Briefcase,
  Eye,
  EyeOff,
  GraduationCap,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/lib/supabaseClient";

type Role = "student" | "employee" | "staff";

const ROLE_OPTIONS: {
  value: Role;
  label: string;
  icon: typeof GraduationCap;
}[] = [
  { value: "student", label: "Student", icon: GraduationCap },
  { value: "employee", label: "Employee", icon: Briefcase },
  { value: "staff", label: "ICTC Staff", icon: ShieldCheck },
];

const Login = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<Role>("student");

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error("Please enter email and password");
      return;
    }
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      if (!data.user) throw new Error("No user data returned");

      // 🚀 Fetch the authentic database profile role record
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("fullname, role, idno")
        .eq("id", data.user.id)
        .single();

      if (profileError || !profile) {
        throw new Error(
          "Profile records not found in database. Please signup first.",
        );
      }

      localStorage.setItem(
        "user",
        JSON.stringify({
          fullname: profile.fullname,
          role: profile.role,
          idno: profile.idno,
          email: data.user.email,
        }),
      );

      toast.success("Login successful");
      // 🚀 Route strictly using database validation values
      let redirectPath = "/login"; // fallback
      if (profile.role === "student") {
        redirectPath = "/student/dashboard";
      } else if (profile.role === "employee") {
        redirectPath = "/employee/dashboard";
      } else if (profile.role === "staff") {
        redirectPath = "/staff/dashboard";
      }
      navigate(redirectPath);
    } catch (err: unknown) {
      console.error(err);
      if (
        err instanceof Error &&
        err.message?.toLowerCase().includes("email not confirmed")
      ) {
        toast.error(
          "Please check your email to confirm your account before logging in.",
        );
      } else {
        toast.error(err instanceof Error ? err.message : "Login failed");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 flex flex-col items-center justify-center bg-muted px-4 py-12">
        {/* ONE unified container: form + video as equal-height halves */}
        <div className="relative mx-auto grid w-full max-w-7xl overflow-hidden rounded-2xl bg-card shadow-2xl md:grid-cols-[2fr_3fr]">
          {/* LEFT: LOGIN FORM */}
          <div className="flex flex-col p-8 md:p-8">
            <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center">
              {/* Logo lockup + plain heading, no separate subtitle line */}
              <div className="mb-8 flex flex-col items-center gap-5 text-center">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                    <GraduationCap className="h-5 w-5 text-primary" />
                  </div>
                  <span className="text-lg font-bold tracking-tight">
                    IDLink
                  </span>
                </div>
                <h1 className="text-base font-medium text-muted-foreground">
                  Login to continue
                </h1>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="sr-only">
                    Email
                  </Label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-9"
                      autoComplete="email"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="password" className="sr-only">
                    Password
                  </Label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-9 pr-9"
                      autoComplete="current-password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm">I am a:</Label>
                  <RadioGroup
                    value={role}
                    onValueChange={(value) => setRole(value as Role)}
                    className="grid grid-cols-3 gap-2"
                  >
                    {ROLE_OPTIONS.map(({ value, label, icon: Icon }) => {
                      const active = role === value;
                      return (
                        <label
                          key={value}
                          htmlFor={value}
                          className={`flex cursor-pointer flex-col items-center gap-1.5 rounded-xl border p-2.5 text-center transition-all ${
                            active
                              ? "border-primary bg-primary/5 shadow-sm"
                              : "border-border hover:border-primary/40 hover:bg-background"
                          }`}
                        >
                          <RadioGroupItem
                            value={value}
                            id={value}
                            className="sr-only"
                          />
                          <Icon
                            className={`h-5 w-5 ${active ? "text-primary" : "text-muted-foreground"}`}
                          />
                          <span
                            className={`text-xs font-medium leading-tight ${active ? "text-primary" : "text-foreground"}`}
                          >
                            {label}
                          </span>
                        </label>
                      );
                    })}
                  </RadioGroup>
                </div>

                {/* Forgot password + Login button share one row, like the reference */}
                <div className="flex items-center justify-between gap-4 pt-1">
                  <a
                    href="#"
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    Forgot password?
                  </a>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="gradient-primary px-8 text-primary-foreground"
                  >
                    {loading && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {loading ? "Logging in..." : "Login"}
                  </Button>
                </div>
              </form>

              <p className="mt-6 text-center text-sm text-muted-foreground">
                Don't have an account?{" "}
                <a
                  href="/register"
                  className="font-medium text-primary hover:underline"
                >
                  Register here
                </a>
              </p>
            </div>
          </div>

          {/* RIGHT: VIDEO — fills the full height of its grid cell, edge to edge */}
          <div className="relative hidden md:block">
            <video
              autoPlay
              muted
              loop
              playsInline
              controls
              poster="/video-poster.svg"
              className="absolute inset-0 h-full w-full object-cover"
            >
              <source src="/assets/iit.mp4" type="video/mp4" />
              Your browser does not support the video tag.
            </video>

            {/* legibility gradient + caption — pointer-events-none so video controls stay clickable */}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0" />
            <span className="pointer-events-none absolute left-4 top-4 inline-flex items-center rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
              Campus tour
            </span>
          </div>
        </div>

        {/* Small footer caption under the card, year computed at render time */}
        <p className="mt-6 text-center text-30 text-muted-bold">
          Copyright © {new Date().getFullYear()} IDLink — MSU-Iligan Institute
          of Technology. 9200 Iligan City, Philippines.
        </p>
      </main>
    </div>
  );
};

export default Login;
