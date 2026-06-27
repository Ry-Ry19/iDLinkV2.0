/**
 * LEARNER'S NOTE:
 * ContractExpiration.tsx displays employee contract details and expiration status.
 *
 * KEY CONCEPTS:
 * - Contract details: Shows contract number, start/end dates, and days remaining
 * - Conditional alert: Warning banner appears when contract expires within 60 days
 * - Alert component: Uses warning variant with icon for visual emphasis
 * - Status indicator: CheckCircle for active (>60 days), AlertCircle for expiring soon
 * - Renewal guidance: Explains process and provides CTA buttons (Contact HR, Download)
 * - Note: Currently uses mock data - would connect to real contract/HR system in production
 */
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Calendar, AlertCircle, CheckCircle } from "lucide-react";

const ContractExpiration = () => {
  const contractInfo = {
    contractNumber: "ID-1782112583594",
    startDate: "2026-06-22",
    endDate: "2026-08-15",
    daysRemaining: 22,
    status: "expiring_soon",
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar isLoggedIn userRole="employee" userName="YANYAN PEROSO" />
      
      <main className="flex-1 bg-background">
        <div className="container mx-auto px-4 py-8 max-w-3xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Contract Information</h1>
            <p className="text-muted-foreground">View your employment contract details and expiration status.</p>
          </div>

          {contractInfo.daysRemaining <= 60 && (
            <Alert className="mb-6 border-warning bg-warning/10">
              <AlertCircle className="h-4 w-4 text-warning" />
              <AlertDescription className="text-warning-foreground">
                Your contract expires in <strong>{contractInfo.daysRemaining} days</strong>. Please coordinate with HR for renewal.
              </AlertDescription>
            </Alert>
          )}

          <Card className="shadow-card mb-6">
            <CardHeader>
              <CardTitle>Contract Details</CardTitle>
              <CardDescription>Your current employment contract information.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground">Contract Number</p>
                  <p className="font-semibold">{contractInfo.contractNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <div className="flex items-center gap-2 mt-1">
                    {contractInfo.daysRemaining > 60 ? (
                      <CheckCircle className="h-4 w-4 text-success" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-warning" />
                    )}
                    <span className="font-semibold capitalize">
                      {contractInfo.daysRemaining > 60 ? "Active" : "Expiring Soon"}
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Start Date</p>
                  <p className="font-semibold">{contractInfo.startDate}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">End Date</p>
                  <p className="font-semibold">{contractInfo.endDate}</p>
                </div>
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-3 mb-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  <p className="font-semibold">Days Until Expiration</p>
                </div>
                <p className="text-3xl font-bold text-primary">{contractInfo.daysRemaining} days</p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>Contract Renewal</CardTitle>
              <CardDescription>Need to renew your contract?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                If your contract is expiring soon, please coordinate with the Human Resources office
                for renewal procedures. You may also need to update your ID after contract renewal.
              </p>
              <div className="flex gap-3">
                <Button className="gradient-primary text-primary-foreground">
                  Contact HR
                </Button>
                <Button variant="outline">
                  Download Contract Copy
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ContractExpiration;
