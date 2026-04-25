/**
 * LEARNER'S NOTE:
 * Footer.tsx is the site-wide footer component displayed at the bottom of all pages.
 *
 * KEY CONCEPTS:
 * - Grid layout: 4-column responsive grid (1 col mobile, 4 col desktop)
 * - Sections: Brand/description, Quick Links, Resources, Contact info
 * - Lucide icons: MapPin, Phone, Mail for contact information
 * - Link components: Uses react-router-dom Link for internal navigation
 * - Dynamic copyright: new Date().getFullYear() auto-updates the year
 * - Tailwind spacing: py-8, gap-8, mt-8 for consistent spacing
 */
import { GraduationCap, Mail, MapPin, Phone } from "lucide-react";
import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="border-t border-border bg-card">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-6 w-6 text-primary" />
              <span className="text-lg font-bold text-primary">IDLink</span>
            </div>
            <p className="text-sm text-muted-foreground">
              MSU-IIT's centralized ID processing and management system.
            </p>
          </div>

          <div>
            <h3 className="mb-3 font-semibold">Quick Links</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/login" className="text-muted-foreground hover:text-primary transition-base">
                  Apply for ID
                </Link>
              </li>
              <li>
                <Link to="/login" className="text-muted-foreground hover:text-primary transition-base">
                  Revalidate ID
                </Link>
              </li>
              <li>
                <Link to="/login" className="text-muted-foreground hover:text-primary transition-base">
                  Track Status
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="mb-3 font-semibold">Resources</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="#" className="text-muted-foreground hover:text-primary transition-base">
                  FAQs
                </a>
              </li>
              <li>
                <a href="#" className="text-muted-foreground hover:text-primary transition-base">
                  Guidelines
                </a>
              </li>
              <li>
                <a href="#" className="text-muted-foreground hover:text-primary transition-base">
                  Contact Support
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="mb-3 font-semibold">Contact</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                MSU-IIT, Iligan City
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                (063) 123-4567
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                ictc@msuiit.edu.ph
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t border-border pt-6 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} MSU-IIT. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
