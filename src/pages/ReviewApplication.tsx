/**
 * LEARNER'S NOTE:
 * ReviewApplication.tsx allows staff to review individual applications in detail.
 *
 * KEY CONCEPTS:
 * - Application details: Displays applicant info (name, ID number, email, phone, department)
 * - Document list: Shows uploaded documents with download buttons
 * - Review decision: Staff can Approve or Return the application
 * - Remarks requirement: Returning requires remarks to be entered first
 * - Textarea component: Used for entering review comments/feedback
 * - Status update: Navigation to appropriate list after action (approved/returned pages)
 * - Note: Currently uses mock data - would connect to API in production
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import StaffSidebar from "@/components/StaffSidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import StatusBadge from "@/components/StatusBadge";
import { FileText, Download } from "lucide-react";
import { toast } from "sonner";

const ReviewApplication = () => {
  const navigate = useNavigate();
  const [remarks, setRemarks] = useState("");

  const application = {
    id: "APP205",
    applicant: {
      name: "Juan Dela Cruz",
      idNumber: "2021-12345",
      email: "juan.delacruz@msuiit.edu.ph",
      phone: "+63 912 345 6789",
      department: "College of Engineering",
      idType: "Student ID",
    },
    status: "submitted" as const,
    submittedDate: "2024-01-15",
    documents: [
      { name: "2x2 Photo", filename: "photo.jpg" },
      { name: "E-Signature", filename: "signature.png" },
      { name: "Certificate of Registration", filename: "cor.pdf" },
    ],
  };

  const handleApprove = () => {
    toast.success("Application approved successfully!");
    navigate("/staff/approved");
  };

  const handleReturn = () => {
    if (!remarks) {
      toast.error("Please provide remarks for returning the application");
      return;
    }
    toast.success("Application returned with remarks");
    navigate("/staff/returned");
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar isLoggedIn userRole="staff" userName="Admin User" />
      
      <div className="flex flex-1">
        <StaffSidebar />
        
        <main className="flex-1 bg-background">
          <div className="container mx-auto px-4 py-8 max-w-4xl">
            <div className="mb-8">
              <h1 className="text-3xl font-bold mb-2">Review Application</h1>
              <p className="text-muted-foreground">Review applicant details and documents.</p>
            </div>

            <Card className="shadow-card mb-6">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>Application #{application.id}</CardTitle>
                    <CardDescription>Submitted on {application.submittedDate}</CardDescription>
                  </div>
                  <StatusBadge status={application.status} />
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="font-semibold mb-4">Applicant Information</h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label className="text-muted-foreground">Full Name</Label>
                      <p className="font-medium">{application.applicant.name}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">ID Number</Label>
                      <p className="font-medium">{application.applicant.idNumber}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Email</Label>
                      <p className="font-medium">{application.applicant.email}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Phone</Label>
                      <p className="font-medium">{application.applicant.phone}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Department</Label>
                      <p className="font-medium">{application.applicant.department}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">ID Type</Label>
                      <p className="font-medium">{application.applicant.idType}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-card mb-6">
              <CardHeader>
                <CardTitle>Submitted Documents</CardTitle>
                <CardDescription>Review all uploaded documents.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {application.documents.map((doc, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 border border-border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-primary" />
                        <div>
                          <p className="font-medium">{doc.name}</p>
                          <p className="text-sm text-muted-foreground">{doc.filename}</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm">
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-card mb-6">
              <CardHeader>
                <CardTitle>Review Decision</CardTitle>
                <CardDescription>Approve or return the application with remarks.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="remarks">Remarks (Required if returning)</Label>
                  <Textarea
                    id="remarks"
                    placeholder="Enter your remarks here..."
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    rows={4}
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <Button onClick={handleApprove} className="gradient-primary text-primary-foreground">
                    Approve Application
                  </Button>
                  <Button onClick={handleReturn} variant="destructive">
                    Return Application
                  </Button>
                  <Button onClick={() => navigate("/staff/pending")} variant="outline">
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>

      <Footer />
    </div>
  );
};

export default ReviewApplication;
