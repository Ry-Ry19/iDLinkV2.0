/**
 * LEARNER'S NOTE:
 * Team.tsx displays the development team members behind IDLink.
 *
 * KEY CONCEPTS:
 * - Static data: Team members array with name, role, description, and image
 * - Responsive layout: Horizontal overlapping cards on desktop, vertical stack on mobile
 * - CSS transitions: scale and shadow animations on hover
 * - Image styling: Object-cover for proper aspect ratio, border and rounded corners
 * - Conditional classes: Middle card is larger (scale-110) with negative margin for overlap effect
 * - Mobile breakpoint: hidden md:flex vs md:hidden for responsive switching
 */
import teamMember1 from "@/assets/team-member-1.jpg";
import teamMember2 from "@/assets/team-member-2.jpg";
import teamMember3 from "@/assets/team-member-3.jpg";
import { Card, CardContent } from "@/components/ui/card";

interface TeamMember {
  name: string;
  role: string;
  description: string;
  image: string;
}

const teamMembers: TeamMember[] = [
  {
    name: "Ryan Recososa",
    role: "Developer",
    description: "The one build the iDLink system",
    image: teamMember1,
  },
  {
    name: "Earl Navarro",
    role: "Project Manager",
    description: "The one who plan the project",
    image: teamMember2,
  },
  {
    name: "Kristian Llena",
    role: "Business Analyst",
    description: "The one who did the architecture workflows",
    image: teamMember3,
  },
];

const Team = () => {
  return (
    <div className="min-h-screen bg-background py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-5xl md:text-6xl font-bold text-center text-foreground mb-4">
          Meet the Team
        </h1>
        <p className="text-center text-muted-foreground text-lg mb-20 max-w-2xl mx-auto">
          The passionate individuals behind IDLink, dedicated to building the future of digital identity
        </p>

        {/* Desktop: Horizontal overlapping cards */}
        <div className="hidden md:flex justify-center items-center gap-0 relative px-8">
          {teamMembers.map((member, index) => (
            <Card
              key={member.name}
              className={`
                w-80 transition-all duration-500 ease-out
                ${index === 1 ? 'z-20 scale-110 -mx-8' : 'z-10'}
                hover:scale-105 hover:z-30
                bg-card border-border shadow-[var(--card-shadow)]
                hover:shadow-[var(--card-shadow-hover)]
              `}
              style={{
                transform: index === 1 ? 'translateY(-10px)' : 'translateY(0)',
              }}
            >
              <CardContent className="p-8 text-center">
                <div className="relative w-48 h-64 mx-auto mb-6 overflow-hidden rounded-xl border-4 border-primary/20 transition-all duration-500 hover:border-primary/50">
                  <img
                    src={member.image}
                    alt={member.name}
                    className="w-full h-full object-cover transition-all duration-500 hover:scale-105 hover:brightness-110"
                  />
                </div>
                <h3 className="text-2xl font-bold text-foreground mb-2">
                  {member.name}
                </h3>
                <p className="text-primary font-semibold mb-3 text-lg">
                  {member.role}
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  {member.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Mobile: Vertical stacked cards */}
        <div className="md:hidden space-y-6">
          {teamMembers.map((member) => (
            <Card
              key={member.name}
              className="transition-all duration-500 bg-card border-border shadow-[var(--card-shadow)] hover:shadow-[var(--card-shadow-hover)] hover:scale-105"
            >
              <CardContent className="p-6 text-center">
                <div className="relative w-40 h-52 mx-auto mb-4 overflow-hidden rounded-xl border-4 border-primary/20 transition-all duration-500 hover:border-primary/50">
                  <img
                    src={member.image}
                    alt={member.name}
                    className="w-full h-full object-cover transition-all duration-500 hover:scale-105 hover:brightness-110"
                  />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">
                  {member.name}
                </h3>
                <p className="text-primary font-semibold mb-3">
                  {member.role}
                </p>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {member.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Team;