import {
  Award,
  HandHeart,
  Lightbulb,
  Medal,
  Mountain,
  Users,
} from "lucide-react";

import { AchievementCard } from "@/components/achievements/achievement-card";

const achievements = [
  {
    title: "Community Builder",
    description:
      "Organized and hosted a neighborhood clean-up event with 45 participants.",
    icon: Users,
    category: "Participation",
    awardedAt: "April 2026",
    tone: "emerald" as const,
  },
  {
    title: "Peak Effort",
    description:
      "Completed a 30 km charity cycling challenge and raised funds for local shelters.",
    icon: Mountain,
    category: "Exceptional Action",
    awardedAt: "March 2026",
    tone: "sky" as const,
  },
  {
    title: "Volunteer Hero",
    description:
      "Contributed 100 volunteer hours mentoring students in weekend coding sessions.",
    icon: HandHeart,
    category: "Impact",
    awardedAt: "February 2026",
    tone: "violet" as const,
  },
  {
    title: "Creative Spark",
    description:
      "Launched a free public workshop series teaching practical AI tools for beginners.",
    icon: Lightbulb,
    category: "Initiative",
    awardedAt: "January 2026",
    tone: "gold" as const,
  },
  {
    title: "Event Finisher",
    description:
      "Participated in four cross-city wellness events in one month and completed all checkpoints.",
    icon: Medal,
    category: "Participation",
    awardedAt: "December 2025",
    tone: "sky" as const,
  },
  {
    description:
      "Recognized for consistently supporting teammates and stepping in during high-pressure delivery weeks.",
    icon: Award,
    category: "Recognition",
    awardedAt: "November 2025",
    tone: "gold" as const,
  },
];

export default function AchievementsPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30 px-4 py-8 sm:px-6">
      <section className="mx-auto w-full max-w-5xl space-y-6">
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
            Achievements
          </p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Moments worth celebrating
          </h1>
          <p className="max-w-xl text-sm text-muted-foreground sm:text-base">
            A showcase of meaningful real-life milestones, from exceptional acts
            to event participation.
          </p>
        </header>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {achievements.map((achievement) => (
            <AchievementCard
              key={`${achievement.category}-${achievement.awardedAt}-${achievement.description}`}
              title={achievement.title}
              description={achievement.description}
              icon={achievement.icon}
              category={achievement.category}
              awardedAt={achievement.awardedAt}
              tone={achievement.tone}
            />
          ))}
        </div>
      </section>
    </main>
  );
}
