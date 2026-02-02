"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Github, Mail, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const heroVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: [0.16, 1, 0.3, 1],
    },
  },
};

const sectionVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: (index: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      delay: 0.08 * index,
      ease: [0.16, 1, 0.3, 1],
    },
  }),
};

const highlightCards = [
  {
    title: "What I do",
    body: "Short overview of your work, craft, or the kinds of problems you enjoy solving.",
  },
  {
    title: "Currently focused on",
    body: "A concise note about what you are learning, building, or experimenting with right now.",
  },
  {
    title: "How I like to work",
    body: "Describe your preferred ways of collaborating, thinking, or approaching new ideas.",
  },
];

const sectionBlocks = [
  {
    id: "about",
    label: "About",
    title: "A quick snapshot of who I am",
    body: "Replace this with a short, honest paragraph about your background, interests, and what motivates you. Keep it personal but focused.",
  },
  {
    id: "projects",
    label: "Projects",
    title: "Things I’m proud of",
    body: "List a few flagship projects, products, or experiments here. Link out to GitHub repos, case studies, or live demos.",
  },
  {
    id: "now",
    label: "Now",
    title: "What I’m doing right now",
    body: "Use this section like a /now page: what you are reading, building, or thinking about this month.",
  },
  {
    id: "writing",
    label: "Writing",
    title: "Notes, essays, and ideas",
    body: "If you write, describe the themes you explore and link to your main blog, newsletter, or note-taking space.",
  },
];

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-background via-background/80 to-muted">
      <main className="flex-1 px-4 py-12 md:px-8 md:py-20">
        <div className="mx-auto w-full max-w-5xl">
          {/* Hero */}
          <motion.section
            className="space-y-10 text-center"
            variants={heroVariants}
            initial="hidden"
            animate="visible"
          >
            <div className="inline-flex items-center gap-2 rounded-full border bg-background/60 px-4 py-1.5 text-xs font-medium text-muted-foreground shadow-sm backdrop-blur">
              <Sparkles className="h-3.5 w-3.5 text-yellow-500" />
              <span>Personal space on the internet</span>
            </div>

            <div className="space-y-4">
              <h1 className="text-balance text-4xl font-semibold tracking-tight md:text-5xl lg:text-6xl">
                A calm home for my work, ideas, and experiments.
              </h1>
              <p className="text-balance text-base text-muted-foreground md:text-lg">
                Use this page as your digital front door. Introduce yourself,
                highlight a few important things you&apos;re working on, and
                point people toward where they should go next.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <Button size="lg" asChild>
                <Link href="#projects">
                  View my work
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>

              <Button size="lg" variant="outline" asChild>
                <Link href="#contact">Get in touch</Link>
              </Button>
            </div>

            <div className="grid gap-4 text-left md:grid-cols-3">
              {highlightCards.map((card, index) => (
                <motion.div
                  key={card.title}
                  custom={index}
                  variants={sectionVariants}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, amount: 0.3 }}
                >
                  <Card className="h-full border-border/60 bg-background/70 backdrop-blur">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-semibold tracking-tight">
                        {card.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">
                      {card.body}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.section>

          {/* Section nav */}
          <motion.nav
            className="mt-16 flex flex-wrap items-center justify-center gap-2 text-sm"
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.4 }}
          >
            {sectionBlocks.map((section) => (
              <Button
                key={section.id}
                asChild
                size="sm"
                variant="ghost"
                className="rounded-full px-3 text-xs md:text-sm"
              >
                <Link href={`#${section.id}`}>{section.label}</Link>
              </Button>
            ))}
          </motion.nav>

          <Separator className="mt-10 opacity-70" />

          {/* Content sections */}
          <div className="mt-10 flex flex-col gap-10 md:mt-14">
            {sectionBlocks.map((section, index) => (
              <motion.section
                key={section.id}
                id={section.id}
                className="rounded-2xl border bg-background/80 p-6 shadow-sm backdrop-blur md:p-8"
                custom={index}
                variants={sectionVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.3 }}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className="rounded-full px-2 py-0.5 text-[11px]"
                    >
                      {section.label}
                    </Badge>
                    <h2 className="text-lg font-semibold tracking-tight md:text-xl">
                      {section.title}
                    </h2>
                  </div>
                </div>
                <p className="mt-4 text-sm leading-relaxed text-muted-foreground md:text-base">
                  {section.body}
                </p>
              </motion.section>
            ))}

            {/* Contact / footer-style block */}
            <motion.section
              id="contact"
              className="rounded-2xl border bg-gradient-to-r from-primary/5 via-background to-primary/5 p-6 shadow-sm backdrop-blur md:p-8"
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="space-y-2">
                  <h2 className="text-lg font-semibold tracking-tight md:text-xl">
                    Want to say hello or collaborate?
                  </h2>
                  <p className="text-sm text-muted-foreground md:text-base">
                    Swap this copy with your preferred way for people to reach
                    you — email, socials, or a contact form.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <Button variant="default" size="sm" asChild>
                    <Link href="mailto:you@example.com">
                      <Mail className="mr-2 h-4 w-4" />
                      Email me
                    </Link>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <Link
                      href="https://github.com/your-handle"
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Github className="mr-2 h-4 w-4" />
                      GitHub
                    </Link>
                  </Button>
                </div>
              </div>
            </motion.section>
          </div>
        </div>
      </main>
    </div>
  );
}
