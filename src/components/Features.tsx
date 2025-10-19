import aiIcon from "@/assets/ai-icon.png";
import cvIcon from "@/assets/cv-icon.png";
import matchIcon from "@/assets/match-icon.png";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Globe, Target } from "lucide-react";

const features = [
  {
    icon: cvIcon,
    title: "CV Analysis",
    description: "Our AI analyzes your CV to understand your skills, experience, and career goals.",
    details: ["Multi-format support", "Skill extraction", "Career mapping"],
  },
  {
    icon: matchIcon,
    title: "Smart Matching",
    description: "Advanced algorithms match you with relevant jobs based on 6 key factors.",
    details: ["90%+ accuracy", "Real-time scoring", "Personalized results"],
  },
  {
    icon: aiIcon,
    title: "AI Applications",
    description: "Generate tailored CVs and cover letters for each job automatically.",
    details: ["Custom tailoring", "ATS-optimized", "Professional quality"],
  },
];

export const Features = () => {
  return (
    <section className="py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            How It Works
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Three simple steps to accelerate your job search with AI
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {features.map((feature, index) => (
            <Card 
              key={index} 
              className="group hover:shadow-[var(--shadow-large)] transition-all duration-300 hover:-translate-y-2 border-border/50"
            >
              <CardHeader>
                <div className="w-20 h-20 mb-4 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <img src={feature.icon} alt={feature.title} className="w-12 h-12 object-contain" />
                </div>
                <CardTitle className="text-2xl">{feature.title}</CardTitle>
                <CardDescription className="text-base">
                  {feature.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {feature.details.map((detail, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <div className="w-1.5 h-1.5 rounded-full bg-accent"></div>
                      {detail}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Additional Features */}
        <div className="mt-20 grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Globe className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold mb-1">Global + Local</h3>
              <p className="text-sm text-muted-foreground">
                Search across 50+ platforms in Ghana and worldwide
              </p>
            </div>
          </div>
          
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
              <Target className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h3 className="font-semibold mb-1">Smart Tracking</h3>
              <p className="text-sm text-muted-foreground">
                Track applications, interviews, and follow-ups
              </p>
            </div>
          </div>
          
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold mb-1">Daily Digests</h3>
              <p className="text-sm text-muted-foreground">
                Get notifications for high-match opportunities
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
