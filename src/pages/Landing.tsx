/**
 * LEARNER'S NOTE:
 * Landing.tsx is the public homepage of the application.
 *
 * KEY CONCEPTS:
 * - Component composition: Navbar at top, Footer at bottom, main content in between
 * - Feature cards array: Maps over features array to render cards dynamically
 * - Routing: Uses Link component from react-router-dom for navigation
 * - Conditional styling: Uses gradient classes for visual emphasis (gradient-hero, gradient-gold)
 * - Responsive design: grid-cols-2 and md:grid-cols-3 for responsive layouts
 * - Sections: Hero, How It Works (3-step process), Features grid, CTA section
 *
 * DESIGN NOTES (this pass):
 * - Hero now has one clear primary action (Login) plus a quiet in-page link to "How it works",
 *   instead of three same-weight buttons competing for attention.
 * - Added a small "built for every role" strip that mirrors the role picker on the login page,
 *   so the two screens visually agree with each other.
 * - "How It Works" keeps its numbers (it's a real sequence) but adds a connecting line and an
 *   icon per step so it reads faster.
 * - Feature cards get a top accent bar and a steadier hover state.
 * - CTA section now has one primary button and one secondary text link, not two equal buttons.
 * - Fixed a stray class typo (`to-accent/10s` → `to-accent/10`).
 */
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowRight,
  BarChart3,
  Briefcase,
  CheckCircle,
  ClipboardCheck,
  Clock,
  FileText,
  FileUp,
  GraduationCap,
  IdCard,
  RefreshCw,
  Shield,
  ShieldCheck,
} from "lucide-react";
import { Link } from "react-router-dom";

const Landing = () => {
  const features = [
    {
      icon: FileText,
      title: "Apply for ID",
      description: "Submit your ID application with all required documents online.",
    },
    {
      icon: RefreshCw,
      title: "Revalidate ID",
      description: "Quick and easy ID revalidation process for current users.",
    },
    {
      icon: BarChart3,
      title: "Track Status",
      description: "Monitor your application status in real-time with detailed updates.",
    },
    {
      icon: Clock,
      title: "Contract Monitoring",
      description: "Employees can track contract expiration and receive timely reminders.",
    },
    {
      icon: CheckCircle,
      title: "Fast Approval",
      description: "Streamlined review process ensures quick application turnaround.",
    },
    {
      icon: Shield,
      title: "Secure & Reliable",
      description: "Your data is protected with enterprise-grade security measures.",
    },
  ];

  const roles = [
    { icon: GraduationCap, label: "Student" },
    { icon: Briefcase, label: "Employee" },
    { icon: ShieldCheck, label: "ICTC Staff" },
  ];

  const steps = [
    {
      icon: FileUp,
      title: "Submit Application",
      description: "Fill out the online form and upload required documents.",
    },
    {
      icon: ClipboardCheck,
      title: "Review Process",
      description: "ICTC staff reviews and verifies your application details.",
    },
    {
      icon: IdCard,
      title: "Get Your ID",
      description: "Receive approval notification and collect your ID card.",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      {/* Hero Section */}
      <section className="relative gradient-hero py-20 md:py-32 text-primary-foreground">
        <div className="container mx-auto px-4">
          <div className="grid gap-8 md:grid-cols-2 items-center">
            <div className="text-center md:text-left">
              <span className="mb-4 inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium uppercase tracking-wide">
                MSU-IIT · ICTC
              </span>
              <h1 className="mb-6 text-4xl font-bold leading-tight md:text-6xl">
                Welcome to IDLink
              </h1>
              <p className="mb-8 text-lg md:text-xl opacity-90 max-w-2xl mx-auto md:mx-0">
                MSU-IIT's centralized ID processing and management system. Apply, revalidate,
                and track your ID applications with ease.
              </p>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
                <Button size="lg" variant="secondary" asChild className="gradient-gold text-accent-foreground font-semibold">
                  <Link to="/login">
                    Get Started
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <a
                  href="#how-it-works"
                  className="text-sm font-medium text-primary-foreground/90 underline-offset-4 hover:underline"
                >
                  See how it works
                </a>
              </div>

              {/* Role strip — mirrors the role picker on the login page */}
              <div className="mt-10 flex flex-wrap items-center justify-center gap-2 md:justify-start">
                <span className="text-xs uppercase tracking-wide text-primary-foreground/70">
                  Built for every role
                </span>
                <div className="flex gap-2">
                  {roles.map(({ icon: Icon, label }) => (
                    <span
                      key={label}
                      className="inline-flex items-center gap-1.5 rounded-full bg-white/10 border border-white/15 px-3 py-1 text-xs font-medium"
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center">
              <div className="w-full max-w-md rounded-2xl overflow-hidden shadow-xl bg-white/5 border border-white/10 p-6">
                <div className="h-56 bg-gradient-to-tr from-primary/20 to-accent/10 rounded-lg flex items-center justify-center">
                  <img src="/assets/iit-gate.jpg" alt="ID illustration" className="h-40" />
                </div>
                <div className="mt-4 text-center md:text-left">
                  <h3 className="text-lg font-semibold">Faster approvals, clear tracking</h3>
                  <p className="text-sm text-muted-foreground mt-1">A smooth, secure, and centralized flow for ID management.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-16 bg-muted">
        <div className="container mx-auto px-4">
          <h2 className="mb-12 text-center text-3xl font-bold">How It Works</h2>
          <div className="relative grid gap-10 md:grid-cols-3">
            {/* connecting line, desktop only */}
            <div
              aria-hidden="true"
              className="absolute left-0 right-0 top-8 hidden h-px bg-border md:block"
              style={{ marginInline: "12.5%" }}
            />
            {steps.map((step, index) => (
              <div key={step.title} className="relative text-center">
                <div className="relative z-10 mb-4 mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground text-2xl font-bold shadow-sm">
                  {index + 1}
                </div>
                <step.icon className="mx-auto mb-3 h-6 w-6 text-primary" />
                <h3 className="mb-2 text-xl font-semibold">{step.title}</h3>
                <p className="text-muted-foreground">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="mb-12 text-center text-3xl font-bold">Key Features</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <Card
                key={feature.title}
                className="group relative overflow-hidden border-border/60 shadow-card transition-all hover:-translate-y-1 hover:shadow-hover hover:border-primary/30"
              >
                <span
                  aria-hidden="true"
                  className="absolute inset-x-0 top-0 h-1 bg-primary/0 transition-colors group-hover:bg-primary"
                />
                <CardHeader>
                  <div className="mb-2 inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    <feature.icon className="h-6 w-6" />
                  </div>
                  <CardTitle>{feature.title}</CardTitle>
                  <CardDescription>{feature.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-primary py-16 text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="mb-4 text-3xl font-bold">Ready to Get Started?</h2>
          <p className="mb-8 text-lg opacity-90">
            Join thousands of MSU-IIT students and employees using IDLink.
          </p>
          <div className="flex flex-col items-center gap-4">
            <Button size="lg" variant="secondary" asChild className="gradient-gold text-accent-foreground font-semibold">
              <Link to="/login">Apply Now</Link>
            </Button>
            <Link
              to="/team"
              className="text-sm font-medium text-primary-foreground/90 underline-offset-4 hover:underline"
            >
              Meet the team →
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Landing;