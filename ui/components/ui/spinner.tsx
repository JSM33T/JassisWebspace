"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const Spinner = React.forwardRef<HTMLSpanElement, React.HTMLAttributes<HTMLSpanElement>>(
    ({ className, ...props }, ref) => (
        <span
            ref={ref}
            className={cn(
                "inline-flex h-4 w-4 animate-spin rounded-full border border-current border-t-transparent",
                className
            )}
            role="status"
            aria-label="Loading"
            {...props}
        />
    )
);

Spinner.displayName = "Spinner";

export { Spinner };
