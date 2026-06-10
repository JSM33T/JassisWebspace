export type ProductStatus = "Live" | "In Development" | "Private Beta";

export interface Product {
    slug: string;
    name: string;
    tagline: string;
    description: string;
    details: string;
    status: ProductStatus;
    highlight: string;
    audience: string;
    icon: "Activity" | "Workflow" | "Link";
    tech: string[];
    features: string[];
    links?: {
        repo?: string;
        live?: string;
    };
    screenshots?: string[];
}

export const products: Product[] = [
    {
        slug: "probeacon",
        name: "ProBeacon",
        tagline: "Self-hosted infrastructure monitoring",
        description:
            "An open-source monitoring platform for teams that want uptime checks, alerting, and status pages without giving infrastructure data to a hosted vendor.",
        status: "In Development",
        highlight: "OSS Monitoring",
        audience: "Engineering and operations teams",
        icon: "Activity",
        tech: [".NET", "PostgreSQL", "Docker", "Health Checks", "Alerting", "Status Pages", "Webhooks"],
        features: [
            "HTTP, TCP, DNS, and database checks",
            "Incident-aware alerting with escalation paths",
            "Public and private status pages",
            "Self-hosted deployment with owned data",
        ],
        details: `
## Overview

ProBeacon is a self-hosted infrastructure monitoring product built for teams that want a practical, ownable view of service health. It tracks public sites, APIs, databases, background services, and internal dependencies from one dashboard.

## Product Focus

- **Monitor everything important** - HTTP endpoints, TCP ports, DNS checks, database reachability, and custom service health probes.
- **Alert with context** - Downtime, latency, certificate expiry, and repeated failures become actionable incidents instead of raw noise.
- **Own the deployment** - Run the stack on your own servers, behind your own network, with operational history kept under your control.
- **Communicate clearly** - Status pages give users and internal teams a readable view of active incidents and recovery progress.

## Why It Matters

Many hosted uptime tools are easy to start with but become expensive or limiting once teams need deeper checks and private infrastructure visibility. ProBeacon keeps the simple monitoring workflow while making the data model, deployment, and integrations self-hosted-first.
        `,
    },
    {
        slug: "linqyard",
        name: "Linqyard",
        tagline: "Link-in-bio and link management platform",
        description:
            "A creator and business link platform with customizable pages, traffic analytics, subscription-ready plans, and fast public profile delivery.",
        status: "Live",
        highlight: "Creator SaaS",
        audience: "Creators, founders, and small teams",
        icon: "Link",
        tech: ["Next.js", "ASP.NET Core", "PostgreSQL", "Redis", "Docker", "Azure Blob Storage", "Analytics"],
        features: [
            "Custom link pages for every profile",
            "Click and view analytics with source tracking",
            "Subscription-ready plan structure",
            "Optimized public pages for fast sharing",
        ],
        links: {
            repo: "https://github.com/JSM33T/linqyard.com",
            live: "https://linqyard.com",
        },
        screenshots: [
            "/images/projects/linqyard/3.png",
            "/images/projects/linqyard/2.png",
            "/images/projects/linqyard/1.png",
        ],
        details: `
## Overview

Linqyard is a link-in-bio and link management platform for creators, indie makers, and businesses that need one polished destination for campaigns, profiles, products, and social links.

## Product Focus

- **Smart link pages** - Mobile-first pages with profile branding, organized links, and sharing-friendly metadata.
- **Actionable analytics** - Track views, clicks, referrers, geographic signals, and engagement trends across links.
- **Monetization-ready** - Built around plan tiers, usage limits, and paid feature expansion.
- **Operational performance** - Public pages are optimized for fast loads while dashboards support heavier analytics workflows.

## Why It Matters

Creators often outgrow simple link pages once they need analytics, domain control, and revenue-aware workflows. Linqyard keeps the page-building experience simple while adding the operational pieces needed for a real product.
        `,
    },
    {
        slug: "surfswift",
        name: "SurfSwift",
        tagline: "Intelligent workflow and browser automation",
        description:
            "A modular automation product for designing, scheduling, and running workflows that combine API steps, browser actions, conditions, and background workers.",
        status: "Private Beta",
        highlight: "Automation Platform",
        audience: "Operators, builders, and automation teams",
        icon: "Workflow",
        tech: [".NET Core", ".NET Worker Service", "Next.js", "React", "Shadcn UI", "Queues", "Playwright", "Cron"],
        features: [
            "Visual workflow design with branching logic",
            "Browser automation for UI-heavy processes",
            "Scheduled, manual, and event-triggered runs",
            "Retry, checkpoint, and execution history support",
        ],
        links: {
            repo: "https://github.com/JSM33T/SurfSwift",
        },
        details: `
## Overview

SurfSwift is an intelligent automation platform for teams that need to turn repeatable browser and service workflows into reliable, observable runs. It combines visual workflow design, browser automation, queues, schedules, and worker-based execution.

## Product Focus

- **Workflow builder** - Compose actions, conditions, loops, and integrations as reusable workflow definitions.
- **Browser automation** - Run UI tasks through Playwright-style execution for systems that do not expose clean APIs.
- **Queue-driven runtime** - Jobs are processed by workers with retries, priority handling, and fault isolation.
- **Scheduling and triggers** - Support manual runs, cron schedules, interval jobs, and event-driven execution.

## Why It Matters

Business automation often lives in brittle scripts or manual browser work. SurfSwift turns those flows into versioned product workflows with observability, repeatability, and room to scale.
        `,
    },
];

export default products;
