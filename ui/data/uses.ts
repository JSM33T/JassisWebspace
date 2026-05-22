// Exported "uses" data showcasing tools, software, hardware and services.
// Icons are stored as string names and mapped to lucide-react in the component.

export interface UseItem {
    name: string;
    description: string;
    url?: string;
    highlight?: string; // e.g. "Daily driver", "Favorite", "Trying"
}

export interface UseCategory {
    title: string;
    description: string;
    icon: string; // lucide icon name
    items: UseItem[];
}

export const usesCategories: UseCategory[] = [
    {
        title: "Operating Systems",
        description: "What I boot into.",
        icon: "MonitorCog",
        items: [
            {
                name: "Windows 11",
                description: "Primary OS for daily work, .NET dev, and most everything else.",
                url: "https://www.microsoft.com/windows/windows-11",
                highlight: "Daily driver",
            },
            {
                name: "Fedora",
                description: "Linux side — clean, current, and a great match for server-style work.",
                url: "https://fedoraproject.org",
            },
        ],
    },
    {
        title: "Editor & Coding",
        description: "Where most of the actual work happens.",
        icon: "Code2",
        items: [
            {
                name: "Visual Studio Code",
                description: "Primary editor for web, scripting, and quick edits across languages.",
                url: "https://code.visualstudio.com",
                highlight: "Daily driver",
            },
            {
                name: "JetBrains Rider",
                description: "Goes here for serious .NET work — refactors, debugging, profiling.",
                url: "https://www.jetbrains.com/rider/",
            },
            {
                name: "Claude Code",
                description: "AI pair-programmer in the terminal. Used heavily for refactors and reviews.",
                url: "https://claude.com/claude-code",
                highlight: "Daily driver",
            },
            {
                name: "Windows Terminal + PowerShell",
                description: "Default shell. Tabs, profiles, and a sane font stack.",
                url: "https://aka.ms/terminal",
            },
            {
                name: "Git + GitHub CLI",
                description: "Version control and PR workflows straight from the terminal.",
                url: "https://cli.github.com",
            },
        ],
    },
    {
        title: "Languages & Runtimes",
        description: "The platforms I build on day to day.",
        icon: "Terminal",
        items: [
            {
                name: ".NET / C#",
                description: "Backend APIs, worker services, and SignalR realtime stacks.",
                url: "https://dotnet.microsoft.com",
            },
            {
                name: "Node.js",
                description: "Tooling, scripts, and the Next.js side of every project.",
                url: "https://nodejs.org",
            },
            {
                name: "Python",
                description: "AI/RAG pipelines, FastAPI services, OpenCV, and data work.",
                url: "https://www.python.org",
            },
        ],
    },
    {
        title: "Frameworks & Libraries",
        description: "The toolkits I reach for first.",
        icon: "Layers",
        items: [
            {
                name: ".NET",
                description: "Primary backend platform — APIs, worker services, and realtime stacks.",
                url: "https://dotnet.microsoft.com",
                highlight: "Daily driver",
            },
            {
                name: "FastAPI",
                description: "Python's most ergonomic API framework — typed, async, fast.",
                url: "https://fastapi.tiangolo.com",
            },
        ],
    },
    {
        title: "Data & Infra",
        description: "Storage, caches, and the plumbing behind the apps.",
        icon: "Database",
        items: [
            {
                name: "PostgreSQL",
                description: "Default relational store. Boring, predictable, powerful.",
                url: "https://www.postgresql.org",
            },
            {
                name: "Redis",
                description: "Caching, locks, signaling fanout, ephemeral state.",
                url: "https://redis.io",
            },
            {
                name: "MongoDB",
                description: "For document-shaped data and quick prototypes.",
                url: "https://www.mongodb.com",
            },
            {
                name: "Docker",
                description: "Consistent local environments and deploy artifacts.",
                url: "https://www.docker.com",
            },
            {
                name: "Cloudflare",
                description: "DNS, CDN, and edge bits that keep the site quick.",
                url: "https://www.cloudflare.com",
            },
        ],
    },
    {
        title: "Productivity",
        description: "Notes, tasks, and keeping things from falling through the cracks.",
        icon: "Sparkles",
        items: [
            {
                name: "Notion",
                description: "Long-form notes, project docs, and personal wiki.",
                url: "https://www.notion.so",
            },
            {
                name: "GitHub Projects",
                description: "Lightweight issue and roadmap tracking next to the code.",
                url: "https://github.com",
            },
            {
                name: "Obsidian",
                description: "Local-first markdown notebook for quick capture.",
                url: "https://obsidian.md",
            },
        ],
    },
    {
        title: "Browser & Web",
        description: "Where the rest of work happens.",
        icon: "Globe",
        items: [
            {
                name: "Brave",
                description: "Primary browser. Fast, private, Chromium-compatible.",
                url: "https://brave.com",
            },
            {
                name: "Chrome DevTools",
                description: "Profiling, network inspection, and the occasional console hack.",
                url: "https://developer.chrome.com/docs/devtools",
            },
        ],
    },
    {
        title: "Audio Production",
        description: "What I use when making and mixing music.",
        icon: "AudioLines",
        items: [
            {
                name: "FL Studio",
                description: "Primary DAW for production, sequencing, and mixing.",
                url: "https://www.image-line.com/fl-studio/",
                highlight: "Daily driver",
            },
            {
                name: "iZotope",
                description: "Goes here for mixing, mastering, and audio repair — Ozone, Neutron, RX.",
                url: "https://www.izotope.com",
            },
        ],
    },
    {
        title: "Hardware",
        description: "The physical kit I sit in front of every day.",
        icon: "Cpu",
        items: [
            {
                name: "ThinkPad E14",
                description: "Intel Core Ultra 5, 32 GB RAM. Daily driver for everything.",
            },
            {
                name: "BenQ GW2790Q",
                description: "27-inch 2K (1440p) IPS display. Easy on the eyes for long sessions.",
            },
            {
                name: "Keychron K3 Pro",
                description: "Low-profile mechanical keyboard. Compact, quiet, and built for long typing sessions.",
            },
            {
                name: "Razer DeathAdder V2 X HyperSpeed",
                description: "Wireless gaming mouse. Comfortable shape, reliable for both work and play.",
            },
            {
                name: "Beyerdynamic DT 990 Pro",
                description: "Open-back studio headphones. Wide soundstage, comfortable for long listens.",
            },
            {
                name: "Focusrite Scarlett Solo",
                description: "USB audio interface. Clean preamp for monitoring and recording.",
            },
        ],
    },
];

export default usesCategories;
