/**
 * LEARNER'S NOTE:
 * Login.tsx handles user authentication.
 *
 * KEY CONCEPTS:
 * - State management: Uses useState for email, password, and role
 * - Form handling: onSubmit event triggers handleLogin function
 * - API integration: POST request to /api/login with email/password
 * - localStorage: Stores user info (fullname, role, idno, email) on successful login
 * - Role-based navigation: Redirects to different dashboards based on user role
 *   (student → /student/dashboard, employee → /employee/dashboard, staff → /staff/dashboard)
 * - Toast notifications: Uses sonner for success/error feedback
 * - UI layout: Two-column design - Login form on left, video/promo on right (hidden on mobile)
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
import { GraduationCap } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const Login = () => {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"student" | "employee" | "staff">("student");

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error("Please enter email and password");
      return;
    }

    try {
      const res = await fetch("http://localhost:5000/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.message || "Login failed");
        return;
      }

      localStorage.setItem(
        "user",
        JSON.stringify({
          fullname: data.fullname,
          role: data.role,
          idno: data.idno,
          email
        })
      );

      toast.success(data.message);

      if (data.role === "student") navigate("/student/dashboard");
      else if (data.role === "employee") navigate("/employee/dashboard");
      else if (data.role === "staff") navigate("/staff/dashboard");
      else toast.error("Unknown role");

    } catch (error) {
      console.error(error);
      toast.error("Server error");
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 flex items-center justify-center bg-muted px-4 py-12">
        <div className="w-full max-w-5xl grid gap-8 md:grid-cols-2 items-center">

          {/* LEFT: LOGIN CARD */}
          <Card className="w-full max-w-md mx-auto shadow-lg">
            <CardHeader className="text-center space-y-1">
              <div className="flex justify-center mb-4">
                <GraduationCap className="h-12 w-12 text-primary" />
              </div>
              <CardTitle className="text-2xl font-bold">
                Login to IDLink
              </CardTitle>
              <CardDescription>
                Enter your credentials to access your account
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleLogin} className="space-y-4">

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your.email@msuiit.edu.ph"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>I am a:</Label>
                  <RadioGroup
                    value={role}
                    onValueChange={(value) =>
                      setRole(value as "student" | "employee" | "staff")
                    }
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="student" id="student" />
                      <Label htmlFor="student" className="cursor-pointer font-normal">
                        Student
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="employee" id="employee" />
                      <Label htmlFor="employee" className="cursor-pointer font-normal">
                        Employee
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="staff" id="staff" />
                      <Label htmlFor="staff" className="cursor-pointer font-normal">
                        ICTC Staff
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                <Button
                  type="submit"
                  className="w-full gradient-primary text-primary-foreground"
                >
                  Login
                </Button>

                <div className="text-center text-sm">
                  <a href="#" className="text-primary hover:underline">
                    Forgot password?
                  </a>
                </div>
              </form>

              <div className="text-center text-sm mt-3">
                <span>Don't have an account? </span>
                <a href="/register" className="text-primary hover:underline">
                  Register here
                </a>
              </div>
            </CardContent>
          </Card>

          {/* RIGHT: VIDEO SECTION */}
          <div className="hidden md:flex items-center justify-center">
            <div className="w-full h-64 rounded-xl border border-border bg-gradient-to-br from-slate-50 to-white shadow-lg p-4 flex flex-col">
              <div className="flex-1 flex items-center justify-center">
                <video
                  controls
                  poster="/video-poster.svg"
                  className="w-full h-full object-cover rounded-md bg-black"
                >
                  <source src="/assets/iit.mp4" type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              </div>

              <div className="mt-3 text-sm text-muted-foreground text-center">
                <div className="font-medium">
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
