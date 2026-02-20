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
		title: "AI-Based RAG Knowledge Workspace",
		description:
			"Advanced multimodal RAG platform with VLM-powered OCR, deep document/table ingestion, and scoped chat across file, project, and global contexts.",
		details: `
## Overview

An AI-first RAG workspace built for teams that need reliable retrieval across complex enterprise content. The platform supports advanced documents, spreadsheet data, scanned/image-based sources, and rich text collaboration in a unified knowledge layer.

## Core Capabilities

- **Advanced Document Ingestion** - Parses PDF, DOCX, PPTX, and mixed-layout files with structural awareness (headings, sections, references, footnotes).
- **Excel and Table Intelligence** - Ingests XLS/XLSX/CSV, extracts sheet-level context, normalizes tabular data, and links tables back to source files.
- **VLM-Powered OCR** - Uses vision-language models for scanned PDFs and images, including layout-aware text extraction from charts, forms, and screenshots.
- **Multimodal Retrieval** - Combines text chunks, OCR content, and table embeddings for higher-quality answers in mixed data scenarios.
- **Rich Text Support** - Preserves formatting semantics (headings, lists, emphasis, code blocks, links) for better chunking and response grounding.

## Scoped Knowledge Chat

- **File Scope** - Query within a single file for precise source-level reasoning.
- **Project Scope** - Query across all files in a project workspace with shared context and permissions.
- **Global Scope** - Cross-project retrieval for organization-wide knowledge discovery.

## Architecture Highlights

- Tenant-isolated workspaces with access control and audit-ready retrieval traces.
- Hybrid retrieval pipeline (keyword + vector + metadata filters).
- Async ingestion workers for OCR, chunking, embeddings, and table indexing.
- Citation-aware response generation with file/page/section references.

## Why It Stands Out

Unlike basic text-only RAG systems, this platform handles real-world knowledge formats: rich documents, spreadsheet tables, and image-heavy content. VLM-backed OCR plus scoped retrieval (file/project/global) makes responses more accurate, controllable, and enterprise-ready.
		`,
		tech: [
			"Python",
			"FastAPI",
			"LangChain",
			"VLM",
			"OCR",
			"RAG",
			"Vector Embeddings",
			"MongoDB"
		],
		icon: "BrainCircuit",
		links: { repo: "", live: "" },
		screenshots: [
			// "https://images.unsplash.com/photo-1529333166437-7750a6dd5a70?auto=format&fit=crop&w=1600&q=80",
			// "https://images.unsplash.com/photo-1507143550189-fed454f93097?auto=format&fit=crop&w=1600&q=80"
		],
		highlight: "Multimodal RAG",
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
			
		],
		highlight: "AI-Powered ATS & Resume Intelligence",
		coverImage: "https://cdn.jsm33t.com/media/project_covers/resumeflow.jpg"
	},
	{
		title: "CLI Wrapper based Device Control Suite",
		description:
			"Linux workspace storage and ZFS partition management platform with a no-CLI workflow for operators.",
		details: `
## Overview

A Linux workspace and storage control suite that abstracts complex system operations behind a UI/API-first experience. Operators manage storage and partitions without direct shell usage.

## Core Capabilities

- **Custom Linux Workspaces** - Create and manage tenant or project-specific workspaces with controlled storage boundaries.
- **ZFS Partition Management** - Full lifecycle support for create, extend, snapshot, rollback, and destroy operations.
- **No-CLI Workflow** - Users perform all actions through application flows instead of manual terminal commands.
- **Safe Command Orchestration** - .NET orchestration layer validates and executes Linux operations with guardrails.
- **Execution Observability** - Captures structured outputs including progress, errors, and tabular command results.

## Operational Design

- API/UI actions are translated into validated system operations.
- Storage workflows include policy checks before mutating ZFS resources.
- All actions are audit-logged for traceability and post-incident analysis.
		`,
		tech: [".NET", "Angular", "Linux", "ZFS", "Bash", "Custom CLI Parsing"],
		icon: "Cloud",
		links: { repo: "", live: "" },
		screenshots: [
			// "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=80",
			// "https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?auto=format&fit=crop&w=1600&q=80"
		],
		highlight: "DevTools",
		// coverImage omitted for this item (optional)
	},
	{
		title: "SurfSwift - Intelligent Automation Framework",
		description:
			"Modular workflow automation platform for orchestrating complex multi-step processes across distributed services and browser-based tasks.",
		details: `
## Overview

SurfSwift is a modular workflow automation platform engineered for orchestrating complex, multi-step processes across distributed services and browser-based tasks. The system combines visual workflow design with intelligent execution, enabling teams to build sophisticated automation pipelines without extensive coding.

## Core Capabilities

- **Visual Workflow Designer** - Drag-and-drop workflow composition with live validation and preview
- **Browser Automation** - Headless browser orchestration with action recording, JavaScript injection, and DOM automation
- **Decision-Tree Routing** - Nested if/else branches, loops, and dynamic path evaluation
- **Queue-Driven Architecture** - Idempotent execution, concurrent processing, and fault isolation
- **Intelligent Scheduling** - Cron-based, interval, and event-triggered execution with retry policies

## Architecture

### Orchestration Layer (.NET Core API)

- Workflow registry with JSON-based definitions, versioning, and rollback
- State machine for checkpointed execution tracking
- Queue producer with priority, deadlines, and dependency metadata
- Real-time status aggregation across worker results
- Polly-based circuit breakers and exponential backoff retry for resilience

### Execution Layer (.NET Worker Service)

- Stateless background workers for horizontal scaling
- Scheduled, interval, cron, and event-based execution support
- Browser automation with Puppeteer/Playwright
- API orchestration for REST/GraphQL workflows
- Idempotent job handling, priority queues, dead-letter routing, and concurrent processing

### Frontend Layer (Next.js + React + Shadcn UI)

- Visual node-based workflow builder
- Real-time node connection validation
- Nested logic groups and decision-tree visualization
- Live preview and step-by-step debugging in sandbox mode
- Monitoring dashboard with execution history, active run tracking, and diagnostics

## Workflow Components

### Browser Automation

- Action recording for clicks, forms, navigation, scrolling, and screenshots
- JavaScript injection for advanced page interaction and extraction
- Data extraction pipelines for tables, lists, and unstructured text

### Decision-Tree Logic

- Conditional branching with nested groups and AND/OR combinations
- Operator support for equality, numeric, boolean, regex, JSON path, and array membership
- Switch statements, loop constructs, and parallel branch execution with merge points

### Helper Utilities

- Email, file operations, database actions, HTTP requests, and notification integrations
- Extensible custom action model:

\`\`\`csharp
public interface IWorkflowAction {
    Task<ActionResult> ExecuteAsync(ActionContext context);
}
\`\`\`

## Scheduling and Execution

- Cron expressions (for example, \`0 9 * * MON-FRI\`)
- Interval-based schedules
- Event-driven triggers via webhook
- Manual execution with runtime parameter overrides
- At-least-once delivery guarantees, timeout controls, and concurrency limits

## State Management and Versioning

- Immutable workflow versioning with rollback control
- Checkpoint snapshots for resume-from-failure support
- Execution context propagation across steps
- Shared cross-workflow variables with TTL expiration
- Audit trail with execution events, parameter snapshots, and change diffs

## Integration and Extensibility

- API-first workflow CRUD and execution control
- Runtime variable injection and webhook registration
- Plugin architecture for NuGet-packaged or containerized action modules

## Technical Differentiators

SurfSwift models workflows as composable graphs where nodes represent operations and edges define data flow. The queue-driven architecture decouples design-time definitions from runtime execution, enabling dynamic worker scaling. Browser automation plus JavaScript injection supports hybrid UI/API scenarios while versioning, rollback, and checkpoint recovery provide enterprise-grade reliability.
    `,
		tech: [
			".NET Core",
			".NET Worker Service",
			"Next.js",
			"React",
			"Shadcn UI",
			"Queue System",
			"Cron",
			"JavaScript Execution"
		],
		icon: "Workflow",
		links: {
			repo: "https://github.com/JSM33T/SurfSwift",
			live: ""
		},
		screenshots: [],
		highlight: "Intelligent Automation"
	},
	{
		title: "Workflow Engine",
		description:
			"Node-based workflow orchestration platform with actions, actors, role-mapped stages, and multi-stage execution control.",
		details: `
## Overview

A configurable workflow engine built for enterprise process orchestration across multiple stages. It models business flows as visual nodes while enforcing role-based execution and actor ownership at each step.

## Core Capabilities

- **Action-Driven Flows** - Each node represents a discrete action (approval, validation, assignment, notification, automation, or integration task).
- **Actor Assignment** - Supports actor-level ownership with user, team, and system actor mappings per stage.
- **Role-Based Mapping** - RBAC policies define who can view, start, approve, reject, reassign, or escalate workflow steps.
- **Multi-Stage Lifecycle** - Handles draft, review, approval, execution, and closure stages with transition guards and conditional branching.
- **State and Audit Tracking** - Maintains status history, action logs, and stage-level traceability for compliance.

## Flow Designer UI

- **Node-Based Design** - Visual canvas for building workflows by connecting action nodes and transitions.
- **Stage Modeling** - Configure stage entry/exit conditions, actor routing, and fallback paths.
- **Validation Rules** - Prevent invalid transitions and enforce dependency/order constraints before publish.
- **Versioned Publishing** - Save workflow revisions and deploy stable versions without breaking in-flight runs.

## Execution Model

- Event-driven progression between nodes based on action outcomes.
- Role-aware task queues route pending steps to the correct actors.
- Retry, timeout, and compensation handlers support resilient multi-stage operations.
		`,
		tech: [".NET", "RBAC", "Workflow Actions", "Actor Mapping", "Node-Based UI", "Multi-Stage Orchestration"],
		icon: "Workflow",
		links: { repo: "", live: "" },
		screenshots: [
			// "https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1600&q=80",
			// "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1600&q=80"
		],
		highlight: "Orchestration",
	},

	{
		title: "FaceAuth – Biometric Auth with Liveness",
		description:
			"OpenCV-powered face vector authentication with privacy-focused embedding matching and multi-layer anti-spoofing.",
		details: `
## Face Vector Authentication System

### Description

A robust facial authentication product powered entirely by OpenCV for both identity verification and advanced anti-spoofing. It stores compact face embedding vectors for privacy-preserving matching, while VLM integration flags environmental anomalies and sophisticated spoof attempts like masks or 3D models that evade traditional liveness checks.

### Key Features

- OpenCV-based face detection, alignment, and embedding extraction for enrollment and verification
- Privacy-focused vector storage (multiple embeddings per user) with real-time similarity matching
- Traditional OpenCV liveness detection using blink detection, head movement, and texture analysis
- VLM-powered environment and spoof analysis to detect unusual lighting, backgrounds, masks, or 3D replicas
- Multi-layer anti-spoofing combining motion analysis, texture verification, and scene context validation
- Real-time authentication suitable for access control, banking, and high-security applications
		`,
		tech: ["Python", "OpenCV", ".NET", "Dlib", "Angular"],
		icon: "Cpu",
		links: { repo: "", live: "" },
		screenshots: [
            "/images/projects/face-biometric/1.jpg",
		],
		highlight: "Security",
	},
	{
		title: "Context-Aware Chatbot - Ticket Handling",
		description:
			"Autonomous AI operations assistant integrating multi-LLM + VLM reasoning, NLP-first retrieval, and MCP server execution for complex workflows.",
		details: `
## Overview

A context-aware chatbot platform designed for support and operational ticket handling. The system combines language, vision, and tool orchestration so requests can be understood, planned, and resolved with minimal manual intervention.

## Core Capabilities

- **Multi-LLM Integration** - Uses model routing across multiple LLMs for classification, planning, and response generation based on task type and cost profile.
- **VLM Support** - Processes screenshots, scanned attachments, and UI images to extract visual context and include it in decision-making.
- **NLP-Based Search for Token Efficiency** - Runs intent/entity detection and semantic retrieval before generation, reducing prompt size and improving token usage.
- **Context Retention** - Maintains conversation memory, ticket history, and session state to handle long-running, multi-turn issue resolution.
- **MCP Server Orchestration** - Invokes MCP-connected tools/services to execute complex actions end-to-end without human handoffs.

## Architecture Highlights

- Retrieval layer blends lexical NLP signals with semantic/vector retrieval for higher precision context injection.
- Policy-driven orchestration selects the right model and tool path per task complexity.
- Action traces and audit logs capture model decisions, tool calls, and final outcomes for governance.

## Operational Outcomes

- Faster ticket triage and resolution through autonomous task execution.
- Lower token spend by grounding responses with focused retrieval context.
- Better reliability on complex cases through combined LLM, VLM, and MCP workflows.
		`,
		tech: [
			"Python",
			"FastAPI",
			"LangChain",
			"LLM",
			"Multi-LLM",
			"VLM",
			"NLP Search",
			"MCP Servers"
		],
		icon: "BrainCircuit",
		links: { repo: "", live: "" },
		screenshots: [
			
		],
		highlight: "AI Ops",
	}
];


export default projects;
