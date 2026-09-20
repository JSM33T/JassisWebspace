export type ServiceAvailability = "available" | "unavailable";

export type ServiceEvidence = {
    label: string;
    href: string;
};

export type Service = {
    slug: string;
    title: string;
    summary: string;
    audience: string;
    problem: string;
    deliverables: string[];
    nextStep: string;
    availability: ServiceAvailability;
    availabilityNote: string;
    evidence: ServiceEvidence[];
};

export const services: Service[] = [
    {
        slug: "data-scraping-automation",
        title: "Data Scraping & Automation",
        summary: "Reliable browser automation and data-collection workflows built around a defined operational task.",
        audience: "Operations, research, and product teams that repeat browser-based work or collect structured web data.",
        problem: "Manual collection is slow and fragile, while quick scripts often fail when navigation, authentication, or page structure changes.",
        deliverables: [
            "Workflow discovery and a feasibility review",
            "Maintainable browser automation or extraction tooling",
            "Structured output, validation, and failure handling",
            "Deployment guidance and an operating runbook",
        ],
        nextStep: "Share one target workflow, its expected output, and a representative example.",
        availability: "available",
        availabilityNote: "Available for focused automation and extraction projects.",
        evidence: [
            { label: "SurfSwift automation framework", href: "/projects/surfswift-intelligent-automation-framework" },
            { label: "Device control suite", href: "/projects/cli-wrapper-based-device-control-suite" },
        ],
    },
    {
        slug: "intelligent-chatbots",
        title: "Intelligent Chatbots",
        summary: "Task-focused assistants that combine deterministic workflows with retrieval and language models.",
        audience: "Support and product teams that need an assistant grounded in their own workflows and knowledge.",
        problem: "Generic chat experiences can produce weak answers when they lack business context, retrieval boundaries, and clear escalation paths.",
        deliverables: [
            "Conversation and escalation-flow design",
            "Knowledge retrieval and tool integration",
            "Guardrails, evaluation cases, and failure handling",
            "A deployable web or internal assistant",
        ],
        nextStep: "Bring a narrow use case, sample questions, and the source material the assistant should use.",
        availability: "available",
        availabilityNote: "Available for scoped assistant and support-workflow projects.",
        evidence: [
            { label: "Context-aware ticket assistant", href: "/projects/context-aware-chatbot-ticket-handling" },
            { label: "RAG knowledge workspace", href: "/projects/ai-based-rag-knowledge-workspace" },
        ],
    },
    {
        slug: "creative-portfolios",
        title: "Creative Portfolios",
        summary: "Personal sites and media-rich portfolios with a clear content structure and responsive presentation.",
        audience: "Independent professionals and creators who need one durable home for their work.",
        problem: "Work scattered across platforms is hard to browse, explain, and maintain as the archive grows.",
        deliverables: [
            "Content and navigation structure",
            "Responsive portfolio implementation",
            "Project, gallery, or media presentation",
            "Deployment and content-update guidance",
        ],
        nextStep: "Share the work you want to publish, the audience, and two or three reference sites.",
        availability: "available",
        availabilityNote: "Available for focused portfolio builds and redesigns.",
        evidence: [
            { label: "Linqyard creator platform", href: "/projects/linqyard-link-management-platform" },
        ],
    },
    {
        slug: "csharp-architecture-consulting",
        title: "C# Architecture Consulting",
        summary: "Practical reviews and implementation plans for .NET systems that need clearer boundaries or safer growth.",
        audience: ".NET teams planning a new system, untangling an existing codebase, or preparing for higher load.",
        problem: "Architecture decisions become expensive when service boundaries, data flow, failure behavior, and deployment constraints remain implicit.",
        deliverables: [
            "Architecture and codebase review",
            "Written risks, options, and recommendations",
            "Target design with an incremental migration plan",
            "Implementation guidance for the agreed scope",
        ],
        nextStep: "Share a system overview, the main constraint, and the decision your team needs to make.",
        availability: "available",
        availabilityNote: "Available for architecture reviews and bounded advisory work.",
        evidence: [
            { label: "ProBeacon monitoring platform", href: "/projects/probeacon-self-hosted-infrastructure-monitor" },
            { label: "Workflow engine", href: "/projects/workflow-engine" },
        ],
    },
    {
        slug: "web-development",
        title: "Web Development",
        summary: "Custom React and Next.js product development.",
        audience: "Teams planning a new web product or a substantial frontend rebuild.",
        problem: "The broader offering needs a more specific engagement shape before I reopen it.",
        deliverables: [],
        nextStep: "Use a general enquiry if you want to discuss adjacent work.",
        availability: "unavailable",
        availabilityNote: "Not currently offered as a standalone service.",
        evidence: [],
    },
    {
        slug: "iot-solutions",
        title: "IoT Solutions",
        summary: "Connected-device ingestion, orchestration, and operational dashboards.",
        audience: "Teams working with device telemetry and connected operations.",
        problem: "This service is paused while its delivery scope is refined.",
        deliverables: [],
        nextStep: "Use a general enquiry if your need overlaps with backend architecture.",
        availability: "unavailable",
        availabilityNote: "Not currently accepting standalone IoT engagements.",
        evidence: [{ label: "IoT data platform", href: "/projects/real-time-iot-data-platform-with-listener-orchestration" }],
    },
    {
        slug: "devops-deployments",
        title: "DevOps & Deployments",
        summary: "CI/CD, containers, deployment workflows, and operational visibility.",
        audience: "Teams improving software delivery and runtime operations.",
        problem: "This capability currently supports larger engineering scopes rather than standalone engagements.",
        deliverables: [],
        nextStep: "Review the active architecture service for related system work.",
        availability: "unavailable",
        availabilityNote: "Available only within a broader implementation scope.",
        evidence: [{ label: "ProBeacon monitoring platform", href: "/projects/probeacon-self-hosted-infrastructure-monitor" }],
    },
    {
        slug: "custom-tools-sdks",
        title: "Custom Tools & SDKs",
        summary: "Internal utilities, command-line tools, and integration libraries.",
        audience: "Teams with recurring internal workflows or integration work.",
        problem: "This capability currently supports larger implementation scopes rather than a separate offer.",
        deliverables: [],
        nextStep: "Use a general enquiry to describe the workflow you need to improve.",
        availability: "unavailable",
        availabilityNote: "Not currently offered as a standalone service.",
        evidence: [{ label: "Device control suite", href: "/projects/cli-wrapper-based-device-control-suite" }],
    },
    {
        slug: "ms-office-plugins",
        title: "MS Office Plugins",
        summary: "Excel and Word add-ins connected to external data and workflows.",
        audience: "Teams extending document and spreadsheet workflows.",
        problem: "This specialist offering is paused.",
        deliverables: [],
        nextStep: "Use a general enquiry if you need to discuss related automation.",
        availability: "unavailable",
        availabilityNote: "Not currently accepting Office add-in projects.",
        evidence: [],
    },
    {
        slug: "ai-ml-products",
        title: "AI/ML Products",
        summary: "Retrieval, semantic search, and language-model product integration.",
        audience: "Product teams exploring AI-assisted workflows.",
        problem: "Broad AI product delivery is paused; the focused chatbot offer remains available.",
        deliverables: [],
        nextStep: "Review Intelligent Chatbots for a narrower active engagement.",
        availability: "unavailable",
        availabilityNote: "Not currently offered as a broad standalone service.",
        evidence: [{ label: "RAG knowledge workspace", href: "/projects/ai-based-rag-knowledge-workspace" }],
    },
    {
        slug: "computer-vision",
        title: "Computer Vision",
        summary: "OCR, detection, and visual-data processing workflows.",
        audience: "Teams extracting structured information from images or documents.",
        problem: "This specialist offering is paused while the scope is refined.",
        deliverables: [],
        nextStep: "Use a general enquiry if the work overlaps with an active automation scope.",
        availability: "unavailable",
        availabilityNote: "Not currently accepting standalone computer-vision projects.",
        evidence: [],
    },
    {
        slug: "data-analytics",
        title: "Data Analytics",
        summary: "ETL workflows and interactive reporting for operational data.",
        audience: "Teams that need cleaner data flows and clearer reporting.",
        problem: "This offering is paused as a standalone engagement.",
        deliverables: [],
        nextStep: "Use a general enquiry if analytics is part of a wider system project.",
        availability: "unavailable",
        availabilityNote: "Available only within a broader implementation scope.",
        evidence: [],
    },
];

export const availableServices = services.filter((service) => service.availability === "available");
export const unavailableServices = services.filter((service) => service.availability === "unavailable");

export function getServiceBySlug(slug: string | null | undefined): Service | null {
    if (!slug) return null;
    return services.find((service) => service.slug === slug) ?? null;
}

export function getServiceEnquiryHref(service: Service): string {
    const params = new URLSearchParams({
        purpose: "Service Request",
        service: service.slug,
        ref: `/services?service=${service.slug}`,
    });
    return `/contact?${params.toString()}`;
}
