// Exported projects data used by AboutProjects component
// Icons are stored as string names and mapped to lucide-react in the component.

export interface Project {
	title: string;
	description: string;
	details?: string;
	tech?: string[];
	icon?: string; // lucide icon name
	links?: { repo?: string; live?: string };
	highlight?: string;
	coverImage?: string; // optional URL to a cover image (non-mandatory)
	screenshots: string[];
}

export const projects: Project[] = [
	{
		title: "Linqyard - Link Management Platform",
		description:
			"A production-ready link-in-bio and link management platform with real-time analytics, subscription monetization, and enterprise-grade performance optimization.",
		details: `
## Overview

Linqyard is a production-ready link-in-bio and link management platform designed for creators and businesses to consolidate multiple links into a single, customizable landing page. The platform features real-time analytics, subscription-based monetization, and enterprise-grade performance optimization.

## Core Features

- **Smart Link Pages** - Mobile-first, SEO-optimized landing pages with custom subdomains and full domain support
- **Advanced Analytics** - Real-time view and click tracking with traffic source attribution, geographic insights, and engagement metrics
- **Multi-Tier Plans** - Freemium model with Free, Pro, and Business tiers supporting scalable growth
- **Creator Dashboard** - Intuitive interface for rapid link management and performance monitoring

## Architecture

### Frontend Layer

Built with **Next.js** leveraging Server-Side Rendering (SSR) for optimal SEO and initial page load performance. Static page generation for public link pages ensures sub-second response times.

### Backend Services

**ASP.NET Core Web API** handles authentication, link CRUD operations, subscription management, and analytics ingestion. Implements rate limiting and request validation for security.

### Background Processing

**.NET Worker Services** run asynchronous jobs including analytics aggregation, link health checks, and scheduled report generation. Decouples heavy processing from user-facing APIs.

### Resilience & Performance

- **Polly Integration** - Circuit breakers, retry policies, and timeout handling for external service calls (payment gateways, email providers)
- **Distributed Caching** - Redis-backed response caching for frequently accessed link pages and analytics dashboards, reducing database load by 70%
- **Azure Blob Storage** - Efficient storage for user-uploaded assets (profile images, custom backgrounds) with CDN integration

### Infrastructure

Containerized with **Docker** for consistent deployments across environments. Orchestration-ready for horizontal scaling during traffic spikes.

## Technical Differentiators

The system separates read-heavy public traffic from write-intensive analytics using a modular repository-based architecture. Background workers handle asynchronous analytics processing, while Polly-based resilience ensures stable API behavior under transient failures.
    `,
		tech: [
			"Next.js",
			"ASP.NET Core",
			".NET Worker Services",
			"PostgreSQL",
			"Redis",
			"Docker",
			"Azure Blob Storage",
			"Polly"
		],
		icon: "Workflow",
		links: {
			repo: "https://github.com/JSM33T/linqyard.com",
			live: "https://linqyard.com"
		},
		screenshots: [
			"/images/projects/linqyard/3.png",
			"/images/projects/linqyard/2.png",
            "/images/projects/linqyard/1.png"
		],
		highlight: "SaaS (Production Ready)",
		coverImage: "https://cdn.jsm33t.com/media/project_covers/linqyard.jpg"
	},
	{
		title: "Real-Time IoT Data Platform with Listener Orchestration",
		description:
			"Distributed IoT ingestion platform with dynamic MQTT listener activation, Cassandra time-series storage, and fault-tolerant orchestration.",
		details: `
A real-time IoT ingestion and orchestration platform built for continuous, high-volume telemetry from heterogeneous devices.

## Core Capabilities

- **Dynamic Listener Activation** - MQTT listeners are created, scaled, paused, or torn down at runtime based on endpoint and topic demand.
- **Centralized Orchestration** - A control plane tracks listener state, heartbeats, lease ownership, and recovery actions across worker nodes.
- **Resilient Recovery** - Listeners are automatically rehydrated after transient failures, disconnects, or process restarts.
- **Low-Latency Streaming** - Ingestion pipelines are optimized for burst traffic with controlled backpressure and retry behavior.

## Data and Query Layer

- **Cassandra** stores high-cardinality, write-heavy telemetry as durable time-series data.
- **Solr** provides indexed search and analytical query acceleration over ingested metadata.
- **Redis** holds ephemeral coordination data, distributed locks, and short-lived cache entries.

## Runtime Architecture

### Listener Runtime

Supports hot listener registration and de-registration, topic wildcard routing, and dynamic partitioning across worker instances to maintain efficient resource usage under fluctuating load.

### Orchestration Service

A dedicated orchestration service manages activation policies, health checks, heartbeat TTLs, and failover promotion to keep ingestion uninterrupted.

### Scalability and Fault Tolerance

The platform supports horizontal scale-out with node-aware balancing, automatic reconnect strategies, and controlled retry paths for reliable edge and cloud-connected IoT pipelines.
    `,
		tech: [".NET", "MQTT", "Cassandra", "Solr", "Redis"],
		icon: "Cpu",
		coverImage: "https://cdn.jsm33t.com/media/project_covers/iot_platform.jpg",
		screenshots: [
			// "https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?auto=format&fit=crop&w=1600&q=80",
			// "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?auto=format&fit=crop&w=1600&q=80"
		],
		// links: {
		//     repo: "",
		//     live: ""
		// },
		highlight: "IoT"
	},

	{
		title: "Secure Audio Delivery Platform",
		description:
			"Secure chunk-based audio streaming platform with per-session encryption, signed segment URLs, and backend-enforced access control.",
		details: `
## Overview

A secure audio delivery platform built for controlled media distribution using HLS-style segmented playback, short-lived access tokens, and backend-governed authorization workflows.

## Security Model

- **Per-Session Encryption** - Audio segments are encrypted with AES-128 keys derived for each playback session.
- **Token-Gated Access** - Every manifest and segment request requires valid short-lived JWT or signed token credentials.
- **Signed Delivery URLs** - Gateway-issued signatures prevent direct hotlinking and unauthorized CDN access.
- **Entitlement Enforcement** - Playback rights are validated server-side before segment release.

## Delivery Pipeline

### Segment Generation

Source audio is transformed into HLS-style chunks and manifests. Segments are encrypted before publication and indexed with session-aware access metadata.

### Gateway and CDN Flow

Clients request manifests through an API gateway. After authorization checks pass, URLs are rewritten and signed for CDN delivery with strict expiration windows.

### Playback Runtime

During active sessions, tokens are rotated and refreshed without interrupting playback, ensuring continuity while keeping access windows tightly bounded.

## Access Control and Observability

- Central authorization service tracks entitlement state, session validity, and playback limits.
- Access attempts, token refreshes, and segment grants are logged for auditability and anomaly detection.
- Revocation paths allow immediate cutoff for expired or revoked sessions.

## Performance Characteristics

The architecture combines CDN edge delivery with lightweight gateway validation, delivering low-latency playback while maintaining strong access controls for premium or private media.
		`,
		tech: [
			"HLS Segmentation",
			"AES-128 Encryption",
			"JWT",
			"Signed URLs",
			"ASP.NET Core",
			"Redis",
			"CDN",
			"Streaming Authorization"
		],
		icon: "Music",
		screenshots: [
			// "https://images.unsplash.com/photo-1454165205744-3b78555e5572?auto=format&fit=crop&w=1600&q=80",
			// "https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1600&q=80"
		],
		highlight: "Secure Streaming"
	},

	{
		title: "Dynamic Media CDN Pipeline",
		description:
			"Cloudinary-style on-the-fly media transformation pipeline powered by libvips, with rule-based automation, transparency-aware processing, and edge-detection-driven optimization.",
		details: `
## Overview

A dynamic CDN media pipeline inspired by Cloudinary-style URL transformations, built to process images on demand with deterministic rules, low latency, and high cache efficiency.

## Core Capabilities

- **On-the-Fly Transformations** - Real-time resize, crop, fit, quality, and format conversion directly from signed URL parameters.
- **Rule-Based Automation** - Preset and policy-driven transformations automatically applied per asset type, route, tenant, or device class.
- **Transparency-Aware Rendering** - Smart alpha-channel handling preserves transparency while optimizing PNG/WebP/AVIF outputs.
- **Edge-Detection Intelligence** - Edge-aware cropping and sharpening use detected boundaries to keep subject focus and visual clarity.

## Processing Pipeline

### Request and Validation

Incoming transformation requests are validated through signed URLs and normalized into canonical transformation keys to prevent abuse and cache fragmentation.

### Transform Engine

**libvips** is the primary high-throughput transformation engine, with **SkiaSharp** used for complementary processing paths. Together they power resizing, smart crop, color normalization, and compression tuning.

### Automated Rules Layer

Transformation policies support chained rules such as:

- force transparent-safe format when alpha is detected
- apply sharper edge-preserving downscale for product assets
- switch codec and quality tiers by viewport/device hints
- enforce max dimensions and fail-safe defaults

### Delivery and Caching

Outputs are cached by canonical transform signature at edge and origin layers. Popular variants are prewarmed asynchronously to reduce cold-start latency.

## Performance Characteristics

The architecture minimizes origin load and improves delivery speed through aggressive cache reuse, deterministic transform signatures, and async pre-generation of high-demand derivatives.
		`,
		tech: ["CDN", "libvips", "SkiaSharp", "On-the-Fly Transformations", "Rule Engine", "Edge Detection", "Transparency Processing", "Edge Caching", "S3"],
		icon: "Image",
		screenshots: [
			// "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1600&q=80",
			// "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1600&q=80"
		],
		highlight: "Dynamic Media Transformation"
	},

	{
		title: "Modular Video Conferencing System",
		description:
			"Embeddable enterprise video conferencing platform with WebRTC media, SignalR + Node.js signaling, Windows tray management, and pluggable local/Twilio TURN-STUN.",
		details: `
## Overview

A fully modular, embeddable video conferencing platform engineered for enterprise integration. The stack is built in-house for end-to-end control of signaling, media relay, policy enforcement, and deployment behavior.

## Core Features

- **Multi-Party Video and Audio** - Real-time conferencing with adaptive bitrate and dynamic quality negotiation.
- **Screen Sharing and Collaboration** - Full-screen and window-specific sharing with session-aware controls.
- **In-Session Chat** - Persistent participant messaging with synchronized history.
- **Dynamic Rooms** - Instant room provisioning, scheduled sessions, and waiting-room flows.
- **RBAC Controls** - Host, presenter, and attendee roles with live permission updates.
- **Asset Management** - Central handling for meeting recordings, snapshots, shared files, and generated artifacts.
- **Windows Tray Companion** - Desktop tray app for notifications, quick room actions, participant alerts, and local conference controls.

## Architecture

### Media Layer (WebRTC)

Peer-to-peer transport is preferred for low latency. For larger sessions, SFU-based routing is used to optimize bandwidth and maintain quality across many participants.

### Signaling Infrastructure

- **SignalR Hub (.NET)** for session state sync, room lifecycle events, and presence.
- **Node.js Coordinators** for offer/answer exchange, ICE candidate relay, and renegotiation paths.
- **Redis-backed Coordination** for session affinity and low-latency signaling fanout.

### Backend Services (.NET Core)

Room lifecycle orchestration, authN/authZ, usage analytics, recording workflows, and policy enforcement are managed through .NET services with resilient retry and health-check patterns.

### Frontend (Angular)

Component-driven UI modules (video grid, controls, chat, participant panel) support both standalone deployment and embedded integration.

## Network Adaptation and Relay Strategy

The platform uses a pluggable connectivity model:

1. Direct P2P via WebRTC (preferred).
2. STUN-assisted NAT traversal for common home/office networks.
3. TURN relay fallback using **self-hosted local TURN/STUN** or **Twilio TURN/STUN** providers.
4. SFU path for large meetings or constrained clients.

This local-plus-cloud relay strategy provides operational control for private deployments while retaining reliable fallback for restrictive network environments.

## Scalability and Reliability

- Horizontal scaling for signaling nodes.
- Adaptive media policies based on packet loss, jitter, and bandwidth.
- Continuous relay health monitoring and automated fallback handling.
- High-concurrency room handling with predictable performance under burst load.
    `,
		tech: [".NET Core", "WebRTC", "SFU", "SignalR", "Node.js", "Angular", "Redis", "TURN/STUN (Local + Twilio)", "Windows Tray App", "Asset Management"],
		icon: "Globe",
		links: {
			repo: "",
			live: ""
		},
		screenshots: [
			 "/images/projects/video-conf/1.png",
			// "https://images.unsplash.com/photo-1545239351-1141bd82e8a6?auto=format&fit=crop&w=1600&q=80"
		],
		highlight: "Realtime Collaboration"
	},
	{
		title: "ResumeFlow – Intelligent Resume Screening & ATS Agent",
		description:
			"AI-powered ATS and resume intelligence platform with multi-job-post screening pipelines and automated flagging for career gaps, job hopping, and education inaccuracies.",
		details: `
## Overview

ResumeFlow is a modular resume intelligence and ATS platform designed to automate candidate screening at scale while keeping decisions explainable and audit-ready.

## Screening Model

- **Single-Post Screening** - Evaluate candidates against one job post with weighted skill, experience, and competency scoring.
- **Multi-Post Screening** - Compare a candidate across multiple job posts in one run, rank best-fit roles, and surface cross-role suitability.
- **Custom Pipelines** - Chain parsing, normalization, scoring, filtering, and AI review stages per hiring team or department.

## Automated Flagging Engine

- **Career Gap Flagging** - Detect employment timeline gaps above configurable thresholds and mark severity by role requirements.
- **Job Hopping Detection** - Identify frequent short-tenure patterns with configurable windows and exceptions.
- **Education Inaccuracy Checks** - Flag suspicious education claims, timeline overlaps, and qualification mismatches against role criteria.
- **Review Queue Routing** - High-risk or ambiguous profiles are auto-routed for recruiter/manual validation.

## Architecture

### Frontend

**Next.js** powers recruiter dashboards, pipeline builders, candidate views, and real-time screening insights.

### API Layer

**FastAPI** exposes high-throughput endpoints for resume ingestion, parsing, scoring, flag generation, and workflow orchestration.

### Background Processing

Worker services handle batch resume ingestion, embeddings, asynchronous AI evaluations, and large multi-post screening jobs.

## ATS Outcomes

ResumeFlow provides structured candidate profiles, job-fit scoring, rule-based risk flags, shortlist recommendations, and traceable screening decisions for compliant hiring workflows.
    `,
		tech: [
			"Next.js",
			"FastAPI",
			"Python Workers",
			"PostgreSQL",
			"Redis",
			"Vector Embeddings",
			"Rule Engine",
			"Career Gap Flagging",
			"Job Hopping Analysis",
			"Education Validation",
			"Docker",
			"Background Queues",
			"REST APIs"
		],
		icon: "FileSearch",
		links: { repo: "", live: "" },
		screenshots: [
			"https://images.unsplash.com/photo-1507143550189-fed454f93097?auto=format&fit=crop&w=1600&q=80",
			"https://images.unsplash.com/photo-1484704849700-f032a568e944?auto=format&fit=crop&w=1600&q=80"
		],
		highlight: "AI-Powered ATS & Resume Intelligence",
		coverImage: "https://cdn.jsm33t.com/media/project_covers/resumeflow.jpg"
	},

	{
		title: "Multi-level Hash-based Caching",
		description: "Tiered in-memory/Redis cache with hashed keys, GET+POST support, and TTLs.",
		details:
			"Action-filter driven cache uses consistent hashing across request shapes (incl. POST bodies) with layered MemoryCache→Redis. Configurable TTLs and cache scopes accelerate dashboard APIs and reduce backend pressure.",
		tech: [".NET", "MemoryCache", "Filters", "Redis", "MongoDB"],
		icon: "Database",
		links: { repo: "", live: "" },
		screenshots: [
			"https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1600&q=80",
			"https://images.unsplash.com/photo-1505761671935-60b3a7427bad?auto=format&fit=crop&w=1600&q=80"
		],
		highlight: "Performance",
	},
	{
		title: "CLI Wrapper based Device Control Suite",
		description: ".NET CLI wrapper with advanced parsing to manage hardware and ZFS; NuGet for table parsing.",
		details:
			"Unified command execution with robust output parsers (errors, progress, tables). Replaced licensed tools, cutting costs. Ships as an app + NuGet package for dynamic table/kv parsing and audit logging.",
		tech: [".NET", "Angular", "Bash", "Custom CLI Parsing"],
		icon: "Cloud",
		links: { repo: "", live: "" },
		screenshots: [
			"https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=80",
			"https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?auto=format&fit=crop&w=1600&q=80"
		],
		highlight: "DevTools",
		// coverImage omitted for this item (optional)
	},
	{
		title: "SurfSwift Automation Engine",
		description:
			"Extensible workflow automation platform with conditional queues, dynamic scripts, and nested decision logic.",
		details: `
SurfSwift is an in-development modular automation framework built for orchestrating intelligent, multi-step workflows across distributed services and browser-based tasks.

At its foundation, the system employs a **queue-driven architecture** with dedicated producer–consumer channels that enable concurrent processing, idempotent execution, and dynamic scaling under varying load.  
A **.NET Core API** governs workflow definitions, state tracking, and runtime orchestration, while a complementary **.NET Core Worker Service** executes scheduled, interval-based, and cron-driven jobs with configurable retry and failover logic.

The platform integrates a robust workflow design and automation layer that supports:

- Full and nested decision-tree routing for complex branching logic and conditional task progression
- Visual workflow composition with drag-and-drop node chaining and live validation
- Action recording for user events such as clicking, browsing, link traversal, and form interaction
- JavaScript injection and dynamic code execution within headless browser contexts
- Automated extraction and transformation of tabular and structured data
- Helper utilities and extensible worker modules for integrating APIs and third-party actions

The **Next.js + React (Shadcn UI)** frontend provides an intuitive designer and visualizer, allowing users to define conditional flows, nested logic groups, and chained operations interactively.  
Workflows can be monitored and versioned in real time, with status propagation and rollback control through the API layer.

Together, these services form a comprehensive automation ecosystem—capable of replicating browser actions, orchestrating decision-based workflows, and executing modular scripts with precise scheduling and dynamic control.
    `,
		tech: [
			".NET",
			".NET Worker Service",
			"Next.js",
			"React",
			"Shadcn UI",
			"Queue System",
			"Cron",
			"JavaScript Execution",
			"Decision Tree",
			"Nested Logic"
		],
		icon: "Workflow",
		links: {
			repo: "https://github.com/JSM33T/SurfSwift",
			live: ""
		},
		screenshots: [
			"https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1600&q=80",
			"https://images.unsplash.com/photo-1461749280684-dccba630e2f6?auto=format&fit=crop&w=1600&q=80"
		],
		highlight: "Automation / Workflow",
		coverImage: "https://cdn.jsm33t.com/media/project_covers/surfswift-automation.jpg"
	}
	,
	{
		title: "ProjectAssist Suite – Standards & Assistance",
		description: "Code standards validator + Outlook add-in for workflow automations.",
		details:
			"Enforces house style rules pre-commit/CI and provides an Outlook add-in for standardized templates, approvals, and macros to speed up official comms and reduce errors.",
		tech: ["Office Add-in", "JavaScript", "HTML", "Outlook API"],
		icon: "Github",
		links: { repo: "", live: "" },
		screenshots: [
			"https://images.unsplash.com/photo-1454165205744-3b78555e5572?auto=format&fit=crop&w=1600&q=80",
			"https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1600&q=80"
		],
		highlight: "Standards",
	},
	{
		title: "Workflow Engine",
		description: "Modular step-wise engine with RBAC; minimal config for complex flows.",
		details:
			"DAG/step pipeline with guards, compensations, and role-based visibility. Emphasis on observability, audit trails, and safe rollbacks for enterprise processes.",
		tech: [".NET", "RBAC", "Modular Steps"],
		icon: "Workflow",
		links: { repo: "", live: "" },
		screenshots: [
			"https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1600&q=80",
			"https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1600&q=80"
		],
		highlight: "Orchestration",
	},
	{
		title: "Document AI Chat RAG Workspace",
		description: "Secure multi-user workspaces; indexing/retrieval via LangChain; master + doc-specific chats.",
		details:
			"RAG workspace with per-tenant isolation, ingest pipelines, chunking/metadata, and hybrid retrieval. Supports context-aware chats at global or document scope with guardrails.",
		tech: ["Python", "FastAPI", "LangChain", "LLM", "MongoDB"],
		icon: "BrainCircuit",
		links: { repo: "", live: "" },
		screenshots: [
			"https://images.unsplash.com/photo-1529333166437-7750a6dd5a70?auto=format&fit=crop&w=1600&q=80",
			"https://images.unsplash.com/photo-1507143550189-fed454f93097?auto=format&fit=crop&w=1600&q=80"
		],
		highlight: "RAG",
	},
	{
		title: "FaceAuth – Biometric Auth with Liveness",
		description: "OpenCV/Dlib face auth with tunable thresholds and real-time liveness detection.",
		details:
			"Implemented facial embeddings and active liveness checks (blink/motion cues) to mitigate spoofing. Integrates with .NET services and Angular clients for secure flows.",
		tech: ["Python", "OpenCV", ".NET", "Dlib", "Angular"],
		icon: "Cpu",
		links: { repo: "", live: "" },
		screenshots: [
			"https://images.unsplash.com/photo-1545239351-1141bd82e8a6?auto=format&fit=crop&w=1600&q=80",
			"https://images.unsplash.com/photo-1484704849700-f032a568e944?auto=format&fit=crop&w=1600&q=80"
		],
		highlight: "Security",
	},
	{
		title: "Context-Aware Chatbot – Ticket Handling",
		description: "NLP chatbot extracts intent/fields; auto-creates tickets; ~60% workload reduction.",
		details:
			"Pipeline parses intents, entities, and missing fields, generating JSON payloads and invoking actions. Includes fallback clarifications and audit events.",
		tech: ["Python", "FastAPI", "LangChain", "LLM"],
		icon: "BrainCircuit",
		links: { repo: "", live: "" },
		screenshots: [
			"https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1600&q=80",
			"https://images.unsplash.com/photo-1505761671935-60b3a7427bad?auto=format&fit=crop&w=1600&q=80"
		],
		highlight: "NLP Ops",
	}
];


export default projects;
