import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2 } from "lucide-react";

const benefits = [
  "Upload CV in any format",
  "AI analyzes your profile",
  "Get matched with relevant jobs",
  "Auto-generate tailored applications",
];

export const CTA = () => {
  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-accent/5 to-primary/5"></div>
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto">
          <div className="bg-card border border-border rounded-3xl p-12 shadow-[var(--shadow-large)]">
            <div className="text-center mb-10">
              <h2 className="text-4xl md:text-5xl font-bold mb-4">
                Ready to Find Your
                <br />
                <span className="bg-gradient-to-r from-accent to-[hsl(var(--accent-glow))] bg-clip-text text-transparent">
                  Perfect Job?
                </span>
              </h2>
              <p className="text-xl text-muted-foreground">
                Join thousands using AI to accelerate their job search
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-10">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex items-center gap-3">
                  <CheckCircle2 className="w-6 h-6 text-accent flex-shrink-0" />
                  <span className="text-foreground">{benefit}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button variant="heroPrimary" size="lg" className="group">
                Start Free Trial
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button variant="outline" size="lg">
                Schedule Demo
              </Button>
            </div>

            <p className="text-center text-sm text-muted-foreground mt-6">
              No credit card required • Free for 14 days
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
