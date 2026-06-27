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
 * - UI layout: Two-column design - Login form on left, video/promo on right (hidden on mobile)
 *
 * DESIGN NOTES (this pass):
 * - Role picker is now three tappable cards instead of plain radio dots — faster to scan,
 *   easier to hit on mobile, and the active state is obvious at a glance.
 * - Email/password fields get leading icons and a show/hide toggle on password.
 * - Submit button shows a spinning icon while loading instead of only swapping text.
 * - Right-hand panel gets a small "campus tour" eyebrow and a calmer frame around the video.
 */
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  RadioGroup,
  RadioGroupItem
} from "@/components/ui/radio-group";
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

const ROLE_OPTIONS: { value: Role; label: string; icon: typeof GraduationCap }[] = [
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
        throw new Error("Profile records not found in database. Please signup first.");
      }

      localStorage.setItem(
        "user",
        JSON.stringify({
          fullname: profile.fullname,
          role: profile.role,
          idno: profile.idno,
          email: data.user.email,
        })
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

    } catch (err: any) {
      console.error(err);
      if (err.message?.toLowerCase().includes("email not confirmed")) {
        toast.error("Please check your email to confirm your account before logging in.");
      } else {
        toast.error(err.message || "Login failed");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="relative flex-1 overflow-hidden bg-muted px-4 py-12">
        {/* ambient backdrop accents — quiet, not load-bearing */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-accent/10 blur-3xl"
        />

        <div className="relative mx-auto grid w-full max-w-5xl items-center gap-10 md:grid-cols-2">

          {/* LEFT: LOGIN CARD */}
          <Card className="mx-auto w-full max-w-md border-border/60 shadow-lg">
            <CardHeader className="space-y-1 text-center">
              <div className="mb-2 flex justify-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                  <GraduationCap className="h-7 w-7 text-primary" />
                </div>
              </div>
              <CardTitle className="text-2xl font-bold tracking-tight">
                Login to IDLink
              </CardTitle>
              <CardDescription>
                Enter your credentials to access your account
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleLogin} className="space-y-5">

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="your.email@msuiit.edu.ph"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-9"
                      autoComplete="email"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
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
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>I am a:</Label>
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
                          className={`flex cursor-pointer flex-col items-center gap-1.5 rounded-xl border p-3 text-center transition-all ${
                            active
                              ? "border-primary bg-primary/5 shadow-sm"
                              : "border-border hover:border-primary/40 hover:bg-background"
                          }`}
                        >
                          <RadioGroupItem value={value} id={value} className="sr-only" />
                          <Icon className={`h-5 w-5 ${active ? "text-primary" : "text-muted-foreground"}`} />
                          <span className={`text-xs font-medium leading-tight ${active ? "text-primary" : "text-foreground"}`}>
                            {label}
                          </span>
                        </label>
                      );
                    })}
                  </RadioGroup>
                </div>

                <Button
                  type="submit"
                  className="w-full gradient-primary text-primary-foreground"
                  disabled={loading}
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {loading ? "Logging in..." : "Login"}
                </Button>

                <div className="text-center text-sm">
                  <a href="#" className="text-primary hover:underline">
                    Forgot password?
                  </a>
                </div>
              </form>

              <div className="mt-4 border-t border-border pt-4 text-center text-sm">
                <span className="text-muted-foreground">Don't have an account? </span>
                <a href="/register" className="font-medium text-primary hover:underline">
                  Register here
                </a>
              </div>
            </CardContent>
          </Card>

          {/* RIGHT: VIDEO SECTION */}
          <div className="hidden items-center justify-center md:flex">
            <div className="w-full rounded-2xl border border-border bg-card p-4 shadow-lg">
              <span className="mb-3 inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                Campus tour
              </span>
              <div className="overflow-hidden rounded-xl bg-black ring-1 ring-border">
                <video
                  controls
                  poster="/video-poster.svg"
                  className="aspect-video w-full object-cover"
                >
                  <source src="/assets/iit.mp4" type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              </div>

              <div className="mt-4 text-center text-sm text-muted-foreground">
                <div className="font-medium text-foreground">
                  Promotional Video clone by iDLink System
                </div>
                <div>
                  Credits to MSU-IIT <code>public/</code>
                </div>
              </div>
            </div>
          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Login;