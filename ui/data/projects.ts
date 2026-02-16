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
		title: "Linqyard.com – Link Aggregation & Personal Hub",
		description:
			"A full-stack link aggregation and personal hub platform designed for customizable subdomains, integrated analytics, and intelligent automation.",
		details: `
Linqyard is an in-development full-stack system that provides users with a unified space to organize, showcase, and analyze their web presence.

The frontend is built with Next.js and Shadcn UI, featuring responsive layouts, theme-driven components, and live preview interfaces for seamless customization.

The backend operates on ASP.NET Core with Entity Framework Core and PostgreSQL, offering structured data management and scalable API design.

A FastAPI microservice powers conversational and assistant-based features, enabling modular AI-driven extensions.

The system employs a multi-tier caching strategy:
• Redis for high-speed in-memory caching  
• MongoDB for persistent conversational context and long-term cache retention  

Continuous integration and delivery are configured via GitHub Actions, with automated Docker container builds and controlled deployments using Docker Compose.

Service routing and SSL management are handled by Nginx, which serves as a reverse proxy for multiple backend and microservice endpoints, ensuring domain-level isolation and secure communication.
    `,
		tech: [
			"Next.js",
			"ASP.NET Core",
			"FastAPI",
			"EF Core",
			"PostgreSQL",
			"MongoDB",
			"Redis",
			"Docker",
			"GitHub Actions",
			"Nginx"
		],
		icon: "Workflow",
		links: {
			repo: "https://github.com/JSM33T/Linqyard",
			live: "https://linqyard.com"
		},
		screenshots: [
			"https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=80",
			"https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1600&q=80"
		],
		highlight: "SaaS (In Development)",
		coverImage: "https://cdn.jsm33t.com/media/project_covers/linqyard.jpg"
	},
	{
		title: "Real-Time IoT Data Platform with Listener Orchestration",
		description:
			"Dynamic MQTT listener management and fault-tolerant recovery powered by a distributed .NET architecture with Cassandra, Solr, and Redis.",
		details: `
An in-development real-time IoT ingestion and orchestration platform engineered for continuous, high-volume device data streams.
\n \n
The system is built on a .NET Core foundation, featuring a **dynamic MQTT listener orchestrator** that intelligently creates, manages, and tears down listeners based on incoming device endpoints or topic URLs. This enables efficient scaling across thousands of concurrent connections while minimizing resource overhead.

A centralized orchestration service maintains listener state, heartbeat tracking, and fault recovery, ensuring uninterrupted data flow even during transient network failures or node restarts.

Ingested telemetry and metadata are streamed into **Cassandra** for durable time-series storage, while **Solr** provides high-speed indexed querying for analytical and search use cases.  
**Redis**, managed through the **Lettuce** client, is used for transient caching, distributed coordination, and maintaining ephemeral session state across listener nodes.

The architecture supports horizontal scaling, live listener registration, and automated reconnection under bursty load scenarios — ensuring low-latency, fault-tolerant pipelines for edge and cloud-integrated IoT environments.
    `,
		tech: [".NET", "MQTT", "Cassandra", "Redis"],
		icon: "Cpu",
		coverImage: "https://cdn.jsm33t.com/media/project_covers/iot_platform.jpg",
		screenshots: [
			"https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?auto=format&fit=crop&w=1600&q=80",
			"https://images.unsplash.com/photo-1461749280684-dccba630e2f6?auto=format&fit=crop&w=1600&q=80"
		],
		// links: {
		//     repo: "",
		//     live: ""
		// },
		highlight: "IOT"
	},

	{
		title: "Secure Audio Delivery Platform",
		description:
			"Encrypted chunked streaming (HLS-style segments) with controlled access and backend-managed authorization.",
		details: `
Engineered a secure audio streaming system using encrypted chunked delivery (HLS-style segmented playback without DRM), implementing controlled access, token validation, and backend-managed stream authorization.

The pipeline encrypts each segment with AES keys derived per session and serves them through a CDN-aware API gateway that validates short-lived tokens before delivering signed URLs. A centralized authorization service tracks entitlements, enforces playback limits, and seamlessly renews tokens for active sessions.

Playback clients retrieve manifests that reference only pre-authorized segments; the gateway rewrites URLs with per-request signatures so segments remain inaccessible without a valid token and backend handshake.
		`,
		tech: [
			"HLS-style segmentation",
			"AES-128 chunk encryption",
			"Token validation",
			"JWT",
			"ASP.NET Core",
			"Redis",
			"CDN",
			"Streaming authorization"
		],
		icon: "Music",
		screenshots: [
			"https://images.unsplash.com/photo-1454165205744-3b78555e5572?auto=format&fit=crop&w=1600&q=80",
			"https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1600&q=80"
		],
		highlight: "Streaming Security"
	},

	{
		title: "Dynamic Media CDN Pipeline",
		description:
			"Real-time CDN-based image transformation, format conversion, and optimization powered by libvips and SkiaSharp.",
		details: `
Designed a CDN-based media pipeline supporting real-time image transformation, resizing, format conversion, and compression using libvips and SkiaSharp for high-performance optimized delivery.

The edge-aware processing tier receives signed URLs, applies configured filters, and streams transformed outputs from cached S3-backed segments. Transformations are cached per parameter set to avoid redundant work, while background jobs prewarm popular variants.
		`,
		tech: ["CDN", "libvips", "SkiaSharp", "Image Optimization", "Edge Caching", "S3"],
		icon: "Image",
		screenshots: [
			"https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1600&q=80",
			"https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1600&q=80"
		],
		highlight: "CDN Media Optimization"
	},

	{
		title: "Modular Video Conferencing System",
		description:
			"Real-time multi-user conferencing platform with WebRTC media, SignalR signaling, and modular plug-and-play integration.",
		details: `
                A fully modular video conferencing and collaboration platform designed for seamless integration into any existing system, enabling real-time communication, screen sharing, and in-session chat.

                Built around **WebRTC** for peer-to-peer media transmission and **SignalR** for real-time signaling, the system supports multi-user video and audio sessions, dynamic participant roles, and presence awareness.  
                Rooms can be created, hosted, and joined through generated meeting links, allowing flexible scheduling and quick onboarding for teams and external users alike.

                The architecture provides robust session management, including:
                • Participant state tracking (join/leave/mute/device changes)  
                • Role-based permissions (host, presenter, attendee)  
                • Persistent chat and message synchronization  
                • Adaptive bitrate and media fallback handling  

                A **.NET backend** handles room lifecycle, authentication, and session orchestration, while **Node.js services** manage low-latency signaling coordination.  
                The **Angular** front-end delivers responsive, component-driven UIs that can be embedded as standalone modules or integrated as widgets within other platforms.

                This plug-and-play design ensures minimal setup overhead while maintaining predictable scalability and reliable real-time performance under high concurrency.
    `,
		tech: [".NET", "WebRTC", "SignalR", "Angular", "Signal.io", "Node.js"],
		icon: "Globe",
		links: {
			repo: "",
			live: ""
		},
		screenshots: [
			"https://images.unsplash.com/photo-1529333166437-7750a6dd5a70?auto=format&fit=crop&w=1600&q=80",
			"https://images.unsplash.com/photo-1545239351-1141bd82e8a6?auto=format&fit=crop&w=1600&q=80"
		],
		highlight: "Collaboration / Realtime (In Development)"
	},
	{
		title: "ResumeFlow – Intelligent Resume Screening & ATS Agent",
		description:
			"An AI-powered resume screening and advanced ATS platform featuring multi-mode evaluation, customizable screening pipelines, and scalable automation.",
		details: `
ResumeFlow is a modular resume intelligence system designed to automate, customize, and scale candidate screening for modern hiring workflows.

The platform supports multiple screening modes, including:
• Keyword-based ATS parsing  
• Semantic skill matching  
• Role-specific competency evaluation  
• AI-assisted shortlisting and ranking  

Users can design fully custom screening pipelines by chaining different evaluation stages such as parsing, normalization, scoring, filtering, and AI review, allowing organizations to tailor hiring logic per role or department.

The frontend is built with Next.js, delivering a clean, recruiter-focused UI with pipeline builders, candidate dashboards, and real-time screening insights.

The core API layer is powered by FastAPI, exposing high-performance endpoints for resume ingestion, parsing, scoring, and workflow orchestration.

Background processing is handled by dedicated worker services for tasks like bulk resume processing, embedding generation, and asynchronous AI evaluations, ensuring high throughput and reliability.

The system functions as an advanced ATS, supporting structured candidate profiles, job-to-resume matching, audit-ready screening decisions, and extensible AI evaluation modules for future enhancements.
    `,
		tech: [
			"Next.js",
			"FastAPI",
			"Python Workers",
			"PostgreSQL",
			"Redis",
			"Vector Embeddings",
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
• Full and nested decision-tree routing for complex branching logic and conditional task progression  
• Visual workflow composition with drag-and-drop node chaining and live validation  
• Action recording for user events such as clicking, browsing, link traversal, and form interaction  
• JavaScript injection and dynamic code execution within headless browser contexts  
• Automated extraction and transformation of tabular and structured data  
• Helper utilities and extensible worker modules for integrating APIs and third-party actions  

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
