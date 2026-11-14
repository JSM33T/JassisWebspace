export type ServiceAvailability = "available" | "unavailable";

export type ServiceEvidence = {
    label: string;
    href: string;
};

export type Service = {
    slug: string;
    title: string;
    thumbnail?: string;
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
        thumbnail: "/images/services/data-scraping-automation-color.webp",
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
        thumbnail: "/images/services/intelligent-chatbots.webp",
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
        thumbnail: "/images/services/creative-portfolios.webp",
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
        thumbnail: "/images/services/csharp-architecture-consulting.webp",
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
        thumbnail: "/images/services/web-development.webp",
        summary: "Custom React and Next.js product development.",
        audience: "Teams planning a new web product or a substantial frontend rebuild.",
        problem: "A new web product or frontend rebuild needs a clear path from core user flows to an application the team can maintain.",
        deliverables: ["Scope and core user flows", "Responsive React or Next.js implementation", "Deployment and handover guidance"],
        nextStep: "Share the product goal, the core user flows, and any existing designs or code.",
        availability: "available",
        availabilityNote: "Available for scoped web application builds and frontend rebuilds.",
        evidence: [{ label: "Linqyard creator platform", href: "/projects/linqyard-link-management-platform" }],
    },
    {
        slug: "iot-solutions",
        title: "IoT Solutions",
        thumbnail: "/images/services/iot-solutions.webp",
        summary: "Connected-device ingestion, orchestration, and operational dashboards.",
        audience: "Teams working with device telemetry and connected operations.",
        problem: "Device telemetry is hard to turn into a useful operational view when data arrives in different formats or connections are unreliable.",
        deliverables: ["Device and telemetry flow review", "Telemetry ingestion and validation", "Operational dashboard or data integration"],
        nextStep: "Share the device types, protocols, expected data volume, and how you want to use the telemetry.",
        availability: "available",
        availabilityNote: "Available for scoped device integration and telemetry projects.",
        evidence: [{ label: "IoT data platform", href: "/projects/real-time-iot-data-platform-with-listener-orchestration" }],
    },
    {
        slug: "devops-deployments",
        title: "DevOps & Deployments",
        thumbnail: "/images/services/devops-deployments.webp",
        summary: "CI/CD, containers, deployment workflows, and operational visibility.",
        audience: "Teams improving software delivery and runtime operations.",
        problem: "Manual deploys and inconsistent environments make releases harder to repeat and recover from.",
        deliverables: ["Build and deployment pipeline review", "Container or CI/CD setup for the agreed environment", "Release and rollback documentation"],
        nextStep: "Share your stack, hosting environment, and the biggest issue with your current release process.",
        availability: "available",
        availabilityNote: "Available for scoped deployment and delivery improvements.",
        evidence: [{ label: "ProBeacon monitoring platform", href: "/projects/probeacon-self-hosted-infrastructure-monitor" }],
    },
    {
        slug: "custom-tools-sdks",
        title: "Custom Tools & SDKs",
        thumbnail: "/images/services/custom-tools-sdks.webp",
        summary: "Internal utilities, command-line tools, and integration libraries.",
        audience: "Teams with recurring internal workflows or integration work.",
        problem: "Repeated manual steps and one-off integrations are difficult to share, test, and maintain across a team.",
        deliverables: ["Workflow and interface design", "A CLI, internal utility, or integration library", "Usage examples and handover documentation"],
        nextStep: "Share one representative workflow, the systems involved, and the expected inputs and outputs.",
        availability: "available",
        availabilityNote: "Available for focused internal tools and integration libraries.",
        evidence: [{ label: "Device control suite", href: "/projects/cli-wrapper-based-device-control-suite" }],
    },
    {
        slug: "ms-office-plugins",
        title: "MS Office Plugins",
        thumbnail: "/images/services/ms-office-plugins.webp",
        summary: "Excel and Word add-ins connected to external data and workflows.",
        audience: "Teams extending document and spreadsheet workflows.",
        problem: "Copying data between Office documents and external systems creates extra work and makes errors harder to trace.",
        deliverables: ["Excel or Word workflow and compatibility review", "An add-in for the agreed workflow", "Installation and usage guidance"],
        nextStep: "Share which Office app and versions you use, a sample file, and the workflow you want to streamline.",
        availability: "available",
        availabilityNote: "Available for scoped Excel and Word add-in projects.",
        evidence: [{ label: "Excel and table processing in the RAG workspace", href: "/projects/ai-based-rag-knowledge-workspace" }],
    },
    {
        slug: "ai-ml-products",
        thumbnail: "/images/services/ai-ml-products.webp",
        title: "AI/ML Products",
        summary: "Retrieval, semantic search, and language-model product integration.",
        audience: "Product teams exploring AI-assisted workflows.",
        problem: "AI features need reliable retrieval, useful product integration, and clear evaluation to deliver consistent results.",
        deliverables: [
            "Use-case discovery and a feasibility review",
            "Retrieval or semantic-search implementation",
            "Language-model integration with evaluation and failure handling",
            "Deployment guidance and implementation handover",
        ],
        nextStep: "Share your product use case, sample data, and the outcome you want the AI feature to support.",
        availability: "available",
        availabilityNote: "Available for scoped retrieval, semantic-search, and AI product integration projects.",
        evidence: [{ label: "RAG knowledge workspace", href: "/projects/ai-based-rag-knowledge-workspace" }],
    },
    {
        slug: "computer-vision",
        title: "Computer Vision",
        thumbnail: "/images/services/computer-vision.webp",
        summary: "OCR, detection, and visual-data processing workflows.",
        audience: "Teams extracting structured information from images or documents.",
        problem: "Image quality, document layout, and capture conditions can make consistent extraction difficult.",
        deliverables: ["Feasibility review using sample inputs", "OCR or visual detection pipeline", "Output validation and error handling"],
        nextStep: "Share representative images or documents, the expected output, and how accuracy should be measured.",
        availability: "available",
        availabilityNote: "Available for focused OCR, detection, and visual data projects.",
        evidence: [{ label: "FaceAuth computer vision project", href: "/projects/faceauth-biometric-auth-with-liveness" }],
    },
    {
        slug: "data-analytics",
        title: "Data Analytics",
        thumbnail: "/images/services/data-analytics.webp",
        summary: "ETL workflows and interactive reporting for operational data.",
        audience: "Teams that need cleaner data flows and clearer reporting.",
        problem: "Scattered data and manually assembled reports make it hard to track operational metrics consistently.",
        deliverables: ["Data source and metric review", "Data transformation and validation workflow", "Interactive report and handover guidance"],
        nextStep: "Share the data sources, sample records, and the questions your reporting needs to answer.",
        availability: "available",
        availabilityNote: "Available for scoped data pipelines and reporting projects.",
        evidence: [{ label: "Linqyard analytics", href: "/projects/linqyard-link-management-platform" }],
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
