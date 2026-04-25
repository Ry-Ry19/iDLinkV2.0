/**
 * LEARNER'S NOTE:
 * RevalidateID.tsx allows existing users to request ID revalidation.
 *
 * KEY CONCEPTS:
 * - Search functionality: User enters ID number, clicks Search to find their record
 * - Mock data: Currently uses hardcoded mock user record (would connect to real API)
 * - Conditional rendering: Shows user record card only after search is performed
 * - StatusBadge component: Displays current approval status visually
 * - Navigation: Redirects to /track after successful revalidation request
 * - State management: Tracks idNumber input and userRecord result
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import StatusBadge from "@/components/StatusBadge";
import { Search } from "lucide-react";
import { toast } from "sonner";

const RevalidateID = () => {
  const navigate = useNavigate();
  const [idNumber, setIdNumber] = useState("");
  const [userRecord, setUserRecord] = useState<any>(null);

  const handleSearch = () => {
    if (!idNumber) {
      toast.error("Please enter your ID number");
      return;
    }

    // Mock user record
    setUserRecord({
      name: "Juan Dela Cruz",
      idNumber: "2021-12345",
      department: "College of Engineering",
      status: "approved" as const,
      lastValidated: "2023-01-15",
    });
  };

  const handleRevalidate = () => {
    toast.success("Revalidation request submitted successfully!");
    navigate("/track");
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-1 bg-background">
        <div className="container mx-auto px-4 py-8 max-w-3xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Revalidate ID</h1>
            <p className="text-muted-foreground">
              Enter your ID number to pull your records and request revalidation.
            </p>
          </div>

          <Card className="shadow-card mb-6">
            <CardHeader>
              <CardTitle>Search Your Record</CardTitle>
              <CardDescription>Enter your student or employee ID number.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-1 space-y-2">
                  <Label htmlFor="idNumber">ID Number</Label>
                  <Input
                    id="idNumber"
                    placeholder="e.g., 2021-12345"
                    value={idNumber}
                    onChange={(e) => setIdNumber(e.target.value)}
                  />
                </div>
                <Button onClick={handleSearch} className="mt-8 gradient-primary text-primary-foreground">
                  <Search className="h-4 w-4 mr-2" />
                  Search
                </Button>
              </div>
            </CardContent>
          </Card>

          {userRecord && (
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle>Your Current Record</CardTitle>
                <CardDescription>Review your information before revalidating.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label className="text-muted-foreground">Full Name</Label>
                    <p className="font-semibold">{userRecord.name}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">ID Number</Label>
                    <p className="font-semibold">{userRecord.idNumber}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Department</Label>
                    <p className="font-semibold">{userRecord.department}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Current Status</Label>
                    <div className="mt-1">
                      <StatusBadge status={userRecord.status} />
                    </div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Last Validated</Label>
                    <p className="font-semibold">{userRecord.lastValidated}</p>
                  </div>
                </div>

                <div className="pt-4 border-t border-border">
                  <Button onClick={handleRevalidate} className="gradient-primary text-primary-foreground w-full md:w-auto">
                    Submit Revalidation Request
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default RevalidateID;
