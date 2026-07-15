import { CheckCircle2, CircleDot, GitPullRequest } from "lucide-react";

import { DevelopmentSuggestionStatus } from "@/lib/api/development.types";
import { cn } from "@/lib/utils";

export type DevelopmentProgressLevel = "pending" | "approved" | "promoted" | "completed";

const steps: Array<{
    id: DevelopmentProgressLevel;
    label: string;
    icon: typeof CircleDot;
    color: string;
    softColor: string;
}> = [
    {
        id: "pending",
        label: "Pending",
        icon: CircleDot,
        color: "bg-sky-500 text-sky-950",
        softColor: "bg-sky-500/20 text-sky-700 dark:text-sky-300",
    },
    {
        id: "approved",
        label: "Approved",
        icon: CheckCircle2,
        color: "bg-emerald-500 text-emerald-950",
        softColor: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300",
    },
    {
        id: "promoted",
        label: "Promoted",
        icon: GitPullRequest,
        color: "bg-violet-500 text-violet-950",
        softColor: "bg-violet-500/20 text-violet-700 dark:text-violet-300",
    },
    {
        id: "completed",
        label: "Completed",
        icon: CheckCircle2,
        color: "bg-emerald-500 text-emerald-950",
        softColor: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300",
    },
];

export function suggestionProgressLevel(status: DevelopmentSuggestionStatus): DevelopmentProgressLevel {
    if (status === "approved") return "approved";
    if (status === "promoted") return "promoted";
    if (status === "archived" || status === "rejected") return "completed";
    return "pending";
}

export function issueProgressLevel(state: string, stateReason?: string | null): DevelopmentProgressLevel {
    if (state.toLowerCase() === "closed" || stateReason?.toLowerCase() === "completed") {
        return "completed";
    }
    return "promoted";
}

export function DevelopmentProgressLayer({
    level,
    className,
}: {
    level: DevelopmentProgressLevel;
    className?: string;
}) {
    const activeIndex = Math.max(0, steps.findIndex((step) => step.id === level));
    const activeStep = steps[activeIndex];
    const ActiveIcon = activeStep.icon;

    return (
        <div className={cn("rounded-md border bg-muted/25 p-2", className)}>
            <div className="mb-2 flex items-center justify-between gap-3 text-xs">
                <span className="font-medium text-muted-foreground">Progress</span>
                <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium", activeStep.softColor)}>
                    <ActiveIcon className="h-3.5 w-3.5" />
                    {activeStep.label}
                </span>
            </div>
            <div className="grid grid-cols-4 gap-1" aria-label={`Progress level: ${activeStep.label}`}>
                {steps.map((step, index) => {
                    const isActive = index === activeIndex;
                    const isComplete = index < activeIndex;

                    return (
                        <div key={step.id} className="min-w-0 space-y-1">
                            <div
                                className={cn(
                                    "h-1.5 rounded-full transition-colors",
                                    isActive || isComplete ? step.color : "bg-muted-foreground/15"
                                )}
                            />
                            <div
                                className={cn(
                                    "truncate text-[10px] leading-none",
                                    isActive ? "font-semibold text-foreground" : "text-muted-foreground"
                                )}
                            >
                                {step.label}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
