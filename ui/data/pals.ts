export interface Pal {
    name: string;
    role: string;
    description: string;
    details?: string;
    avatar?: string;
    links?: { github?: string; twitter?: string; linkedin?: string; website?: string };
    tags?: string[];
    connection?: string;
}

export const pals: Pal[] = [
    {
        name: "Alex Chen",
        role: "Full-Stack Engineer",
        connection: "Collaborator",
        description: "A sharp engineer who obsesses over systems design and distributed architectures. We've shipped a few wild side projects together.",
        tags: ["Go", "Kubernetes", "PostgreSQL", "Systems Design"],
        details: `
## Alex Chen

Alex is a full-stack engineer with a strong bias toward backend infrastructure and distributed systems. We met during a hackathon in 2022 and have been collaborating ever since.

## What We've Built Together

- A real-time notification fanout service that handles ~50k events/sec using Redis Streams
- A custom rate-limiting middleware layer for multi-tenant APIs
- Experiments with CRDTs for offline-first mobile sync

## Why Alex is Exceptional

Alex has an incredible ability to reason about failure modes before they happen. Every design review session turns into a masterclass in anticipating edge cases. The kind of engineer who writes the post-mortem *before* the incident.

## Interests & Side Projects

Currently building a lightweight observability toolkit for small teams who can't afford Datadog. Also deep into Rust lately — claims it's "finally clicking."
`,
    },
    {
        name: "Priya Kapoor",
        role: "Product Designer",
        connection: "Friend",
        description: "A product designer who bridges the gap between engineering constraints and beautiful UX. Her taste is unmatched.",
        tags: ["Figma", "Design Systems", "UX Research", "Motion Design"],
        details: `
## Priya Kapoor

Priya is a product designer based in Toronto with a background in cognitive science. We crossed paths through a mutual friend and bonded over a shared disdain for modal dialogs with no close buttons.

## Design Philosophy

Priya approaches design with a ruthless focus on clarity. Her process always starts with user interviews and ends with something that feels obvious in retrospect — which is harder than it sounds.

## Collaboration

She's consulted on the JassSpace UI at various stages, particularly around the theme system and the blog reading experience. Her feedback loops are fast and direct, which makes iteration a pleasure.

## What She's Working On

Currently leading design for a B2B SaaS product in the legal-tech space. Running a small Figma plugin on the side that auto-generates design tokens from brand guidelines.
`,
    },
    {
        name: "Jordan Malik",
        role: "DevOps & Platform Engineer",
        connection: "Mentor",
        description: "The person I call when Kubernetes is doing something incomprehensible. A calm hand in every infrastructure fire.",
        tags: ["Kubernetes", "Terraform", "CI/CD", "Linux", "Observability"],
        details: `
## Jordan Malik

Jordan is a platform engineer with over a decade of experience running production infrastructure at scale. We met through a local tech meetup and Jordan has been an invaluable mentor ever since.

## What I've Learned from Jordan

- How to think about blast radius before making infrastructure changes
- Proper GitOps workflows with ArgoCD
- Why your monitoring setup is the most important code you'll ever write
- The art of runbooks that people actually follow

## Notable Advice

> "Every manual step in your deploy process is a future 2 AM incident waiting to happen."

That quote alone saved hours of on-call pain.

## Current Focus

Jordan is currently working on reducing Kubernetes sprawl at their company by consolidating to fewer, larger clusters with proper namespace isolation. Also teaching a free DevOps fundamentals course online.
`,
    },
];
