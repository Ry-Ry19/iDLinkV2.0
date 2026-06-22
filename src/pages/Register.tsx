/**
 * LEARNER'S NOTE:
 * Register.tsx handles new user registration.
 *
 * KEY CONCEPTS:
 * - Form fields: idno, fullname, email, password, and conditional fields (course/year for students)
 * - Role selection: RadioGroup allows choosing between student, employee, or staff
 * - Conditional rendering: Course and year fields only show when role is "student"
 * - API integration: Supabase signUp with email/password and profile data in user_metadata
 * - Navigation: Redirects to /login page after successful registration
 * - Loading state: Shows "Registering..." text while request is in progress
 * - Input validation: Checks all required fields before submission
 */
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { GraduationCap } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/lib/supabaseClient";

const Register = () => {
  const navigate = useNavigate();
  const [idno, setIdno] = useState("");
  const [fullname, setFullname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [course, setCourse] = useState("");
  const [year, setYear] = useState("");
  const [role, setRole] = useState<"student" | "employee" | "staff">("student");
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

      <div className="flex-1 flex items-center justify-center py-12 px-4 bg-muted">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="space-y-1 text-center">
            <div className="flex justify-center mb-4">
              <GraduationCap className="h-12 w-12 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold">Register to IDLink</CardTitle>
            <CardDescription>Fill in your details to create an account</CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="idno">ID Number</Label>
                <Input
                  id="idno"
                  type="text"
                  placeholder="Enter your ID Number"
                  value={idno}
                  onChange={(e) => setIdno(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="fullname">Full Name</Label>
                <Input
                  id="fullname"
                  type="text"
                  placeholder="Your full name"
                  value={fullname}
                  onChange={(e) => setFullname(e.target.value)}
                  required
                />
              </div>

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

              {role === "student" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="course">Course</Label>
                    <Input
                      id="course"
                      type="text"
                      placeholder="Enter your course"
                      value={course}
                      onChange={(e) => setCourse(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="year">Year</Label>
                    <Input
                      id="year"
                      type="text"
                      placeholder="Enter your year level"
                      value={year}
                      onChange={(e) => setYear(e.target.value)}
                      required
                    />
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label>I am a:</Label>
                <RadioGroup value={role} onValueChange={(value) => setRole(value as any)}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="student" id="student" />
                    <Label htmlFor="student" className="font-normal cursor-pointer">Student</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="employee" id="employee" />
                    <Label htmlFor="employee" className="font-normal cursor-pointer">Employee</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="staff" id="staff" />
                    <Label htmlFor="staff" className="font-normal cursor-pointer">ICTC Staff</Label>
                  </div>
                </RadioGroup>
              </div>

              <Button
                type="submit"
                className="w-full gradient-primary text-primary-foreground"
                disabled={loading}
              >
                {loading ? "Registering..." : "Register"}
              </Button>

              <div className="text-center text-sm mt-2">
                <span>Already have an account? </span>
                <a href="/login" className="text-primary hover:underline">
                  Login here
                </a>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      <Footer />
    </div>
  );
};

export default Register;