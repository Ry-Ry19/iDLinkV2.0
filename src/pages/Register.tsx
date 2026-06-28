/**
 * LEARNER'S NOTE:
 * Register.tsx handles new user registration.
 *
 * KEY CONCEPTS:
 * - Form fields: idno, fullname, email, password, and conditional fields (course/year for students)
 * - Role selection: card-style picker lets the user choose student, employee, or staff
 * - Conditional rendering: Course and year fields only show when role is "student"
 * - API integration: Supabase signUp with email/password and profile data in user_metadata
 * - Navigation: Redirects to /login page after successful registration
 * - Loading state: Spinner + "Registering..." while the request is in progress
 * - Input validation: Checks all required fields before submission
 *
 * DESIGN NOTES (this pass):
 * - Rebuilt to match Login.tsx: one unified card split into equal-height halves (form left,
 *   video right), icon-prefixed inputs, and a card-style role picker instead of radio dots.
 * - Added a show/hide toggle on the password field, same pattern as Login.
 * - The video panel is the same clip, poster, and caption treatment used on the login page,
 *   so the two auth screens feel like one consistent flow.
 */
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  BookOpen,
  Briefcase,
  CalendarDays,
  Eye,
  EyeOff,
  GraduationCap,
  Hash,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
  User,
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

const Register = () => {
  const navigate = useNavigate();
  const [idno, setIdno] = useState("");
  const [fullname, setFullname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [course, setCourse] = useState("");
  const [year, setYear] = useState("");
  const [role, setRole] = useState<Role>("student");
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!idno || !fullname || !email || !password || !role) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (role === "student" && (!course || !year)) {
      toast.error("Please provide your course and year");
      return;
    }

    setLoading(true);

    try {
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            fullname,
            idno,
            course: role === "student" ? course : null,
            year: role === "student" ? year : null,
            role,
          }
        }
      });

            if (signUpError) {
        throw signUpError;
      }

      // REMOVE OR REPLACE the strict check that was crashing your app:
      // if (!signUpData?.user) { throw new Error(...) }
      
      // USE THIS INSTEAD:
      let userId = signUpData?.user?.id;

      // If user data isn't returned immediately (because confirmation is active), 
      // check the identities array where Supabase stores unconfirmed user details.
      if (!userId && signUpData?.user?.identities?.[0]) {
        userId = signUpData.user.identities[0].id;
      }

      // If we still can't find a user ID, gracefully fall back to a confirmation screen
      if (!userId) {
        toast.success("Registration initiated! Please check your email to confirm your account.");
        navigate("/login");
        return;
      }

      // Create profile entry in the profiles table using our resolved userId
      const { error: profileError } = await supabase
        .from('profiles')
        .insert([
          {
            id: userId,
            fullname,
            idno,
            role,
            course: role === "student" ? course : null,
            year: role === "student" ? year : null,
          }
        ]);
         if (profileError) {
        throw profileError;
      }

      toast.success("Registration successful! Please check your email to confirm your account.");

      // Redirect to appropriate dashboard based on role after successful registration
      let redirectPath = "/login"; // fallback
      if (role === "student") {
        redirectPath = "/student/dashboard";
      } else if (role === "employee") {
        redirectPath = "/employee/dashboard";
      } else if (role === "staff") {
        redirectPath = "/staff/dashboard";
      }
      navigate(redirectPath);
    }  catch (err: any) {
    console.error('Registration error:', err);

    // Extract detailed Supabase error if available
    const errorMessage = err.message || 'Registration failed';
    if (err?.error?.message) {
      toast.error(`Database error: ${err.error.message}`);
    } else if (err?.response?.data?.message) {
      toast.error(`Database error: ${err.response.data.message}`);
    } else {
      toast.error(errorMessage);
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

        {/* ONE unified container: form + video as equal-height halves, same pattern as Login */}
        <div className="relative mx-auto grid w-full max-w-5xl overflow-hidden rounded-2xl border border-border/60 bg-card shadow-xl md:grid-cols-2">

          {/* LEFT: REGISTER FORM */}
          <div className="flex flex-col p-8 md:p-10">
            <div className="mx-auto w-full max-w-md">
              <div className="mb-6 space-y-1 text-center">
                <div className="mb-2 flex justify-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                    <GraduationCap className="h-7 w-7 text-primary" />
                  </div>
                </div>
                <h1 className="text-2xl font-bold tracking-tight">Register to IDLink</h1>
                <p className="text-sm text-muted-foreground">
                  Fill in your details to create an account
                </p>
              </div>

              <form onSubmit={handleRegister} className="space-y-5">

                <div className="space-y-2">
                  <Label htmlFor="idno">ID Number</Label>
                  <div className="relative">
                    <Hash className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="idno"
                      type="text"
                      placeholder="Enter your ID Number"
                      value={idno}
                      onChange={(e) => setIdno(e.target.value)}
                      className="pl-9"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fullname">Full Name</Label>
                  <div className="relative">
                    <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="fullname"
                      type="text"
                      placeholder="Your full name"
                      value={fullname}
                      onChange={(e) => setFullname(e.target.value)}
                      className="pl-9"
                      required
                    />
                  </div>
                </div>

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
                      autoComplete="new-password"
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

                {role === "student" && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="course">Course</Label>
                      <div className="relative">
                        <BookOpen className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="course"
                          type="text"
                          placeholder="Enter your course"
                          value={course}
                          onChange={(e) => setCourse(e.target.value)}
                          className="pl-9"
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="year">Year</Label>
                      <div className="relative">
                        <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="year"
                          type="text"
                          placeholder="Enter your year level"
                          value={year}
                          onChange={(e) => setYear(e.target.value)}
                          className="pl-9"
                          required
                        />
                      </div>
                    </div>
                  </>
                )}

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
                  {loading ? "Registering..." : "Register"}
                </Button>

                <div className="text-center text-sm">
                  <span className="text-muted-foreground">Already have an account? </span>
                  <a href="/login" className="font-medium text-primary hover:underline">
                    Login here
                  </a>
                </div>
              </form>
            </div>
          </div>

          {/* RIGHT: VIDEO — same treatment as Login.tsx, fills the full height of its grid cell */}
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
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/0 to-black/10" />
            <span className="pointer-events-none absolute left-4 top-4 inline-flex items-center rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
              Campus tour
            </span>
            <div className="pointer-events-none absolute inset-x-0 bottom-12 px-4 text-center text-white">
              <div className="text-sm font-medium">Promotional Video clone by iDLink System</div>
              <div className="text-xs text-white/70">
                Credits to MSU-IIT <code>public/</code>
              </div>
            </div>
          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Register;