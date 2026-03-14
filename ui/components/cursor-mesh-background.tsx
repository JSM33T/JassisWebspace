'use client';

import { useEffect, useRef, useState } from 'react';

type Viewport = {
    width: number;
    height: number;
};

type PointerState = {
    x: number;
    y: number;
    active: boolean;
};

type Point = {
    x: number;
    y: number;
};

const HORIZONTAL_LINES = 8;
const VERTICAL_LINES = 10;
const LINE_SAMPLES = 8;
const BASE_RADIUS = 240;
const BASE_STRENGTH = 42;
const EASING = 0.14;

function pullPoint(point: Point, pointer: PointerState, viewport: Viewport) {
    if (!pointer.active) return point;

    const dx = pointer.x - point.x;
    const dy = pointer.y - point.y;
    const distance = Math.hypot(dx, dy) || 1;
    const radius = Math.min(BASE_RADIUS, Math.min(viewport.width, viewport.height) * 0.34);
    const influence = Math.max(0, 1 - distance / radius);
    const strength = influence * influence * BASE_STRENGTH;

    return {
        x: point.x + (dx / distance) * strength,
        y: point.y + (dy / distance) * strength,
    };
}

function buildLinePath(points: Point[]) {
    return points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
}

function buildHorizontalPath(row: number, viewport: Viewport, pointer: PointerState) {
    const y = (viewport.height / (HORIZONTAL_LINES + 1)) * (row + 1);
    const points = Array.from({ length: LINE_SAMPLES + 1 }, (_, index) => {
        const x = (viewport.width / LINE_SAMPLES) * index;
        return pullPoint({ x, y }, pointer, viewport);
    });

    return buildLinePath(points);
}

function buildVerticalPath(column: number, viewport: Viewport, pointer: PointerState) {
    const x = (viewport.width / (VERTICAL_LINES + 1)) * (column + 1);
    const points = Array.from({ length: LINE_SAMPLES + 1 }, (_, index) => {
        const y = (viewport.height / LINE_SAMPLES) * index;
        return pullPoint({ x, y }, pointer, viewport);
    });

    return buildLinePath(points);
}

export function CursorMeshBackground() {
    const [viewport, setViewport] = useState<Viewport>({ width: 0, height: 0 });
    const [pointer, setPointer] = useState<PointerState>({ x: 0, y: 0, active: false });
    const targetPointerRef = useRef<PointerState>({ x: 0, y: 0, active: false });
    const animatedPointerRef = useRef<PointerState>({ x: 0, y: 0, active: false });

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const syncViewport = () => {
            const width = window.innerWidth;
            const height = window.innerHeight;
            const centerX = width / 2;
            const centerY = height / 2;

            setViewport({ width, height });
            setPointer((prev) => ({
                x: prev.x || centerX,
                y: prev.y || centerY,
                active: prev.active,
            }));
            targetPointerRef.current = {
                x: targetPointerRef.current.x || centerX,
                y: targetPointerRef.current.y || centerY,
                active: targetPointerRef.current.active,
            };
            animatedPointerRef.current = {
                x: animatedPointerRef.current.x || centerX,
                y: animatedPointerRef.current.y || centerY,
                active: animatedPointerRef.current.active,
            };
        };

        syncViewport();
        window.addEventListener('resize', syncViewport);

        return () => {
            window.removeEventListener('resize', syncViewport);
        };
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (prefersReducedMotion) {
            targetPointerRef.current = {
                x: viewport.width / 2,
                y: viewport.height / 2,
                active: false,
            };
            animatedPointerRef.current = targetPointerRef.current;
            return;
        }

        const updateTarget = (event: PointerEvent) => {
            targetPointerRef.current = {
                x: event.clientX,
                y: event.clientY,
                active: event.pointerType !== 'touch',
            };
        };

        const resetTarget = () => {
            targetPointerRef.current = {
                x: viewport.width / 2,
                y: viewport.height / 2,
                active: false,
            };
        };

        window.addEventListener('pointermove', updateTarget, { passive: true });
        window.addEventListener('pointerleave', resetTarget);

        let frameId = 0;

        const animate = () => {
            const current = animatedPointerRef.current;
            const target = targetPointerRef.current;

            const next = {
                x: current.x + (target.x - current.x) * EASING,
                y: current.y + (target.y - current.y) * EASING,
                active: target.active,
            };

            animatedPointerRef.current = next;
            setPointer(next);
            frameId = window.requestAnimationFrame(animate);
        };

        frameId = window.requestAnimationFrame(animate);

        return () => {
            window.removeEventListener('pointermove', updateTarget);
            window.removeEventListener('pointerleave', resetTarget);
            window.cancelAnimationFrame(frameId);
        };
    }, [viewport.height, viewport.width]);

    if (!viewport.width || !viewport.height) {
        return null;
    }

    const horizontalPaths = Array.from({ length: HORIZONTAL_LINES }, (_, index) =>
        buildHorizontalPath(index, viewport, pointer)
    );
    const verticalPaths = Array.from({ length: VERTICAL_LINES }, (_, index) =>
        buildVerticalPath(index, viewport, pointer)
    );

    return (
        <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
            <div
                className="absolute h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-3xl transition-opacity duration-300 dark:bg-primary/14"
                style={{
                    left: pointer.x,
                    top: pointer.y,
                    opacity: pointer.active ? 1 : 0.45,
                }}
            />
            <div
                className="absolute h-32 w-32 -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/20 bg-primary/8 blur-xl dark:border-primary/25 dark:bg-primary/10"
                style={{
                    left: pointer.x,
                    top: pointer.y,
                    opacity: pointer.active ? 0.9 : 0.4,
                }}
            />
            <svg
                className="absolute inset-0 h-full w-full opacity-70 dark:opacity-55"
                viewBox={`0 0 ${viewport.width} ${viewport.height}`}
                preserveAspectRatio="none"
                aria-hidden="true"
            >
                {horizontalPaths.map((path, index) => (
                    <path
                        key={`mesh-h-${index}`}
                        d={path}
                        fill="none"
                        stroke="hsl(var(--border) / 0.28)"
                        strokeWidth="1"
                    />
                ))}
                {verticalPaths.map((path, index) => (
                    <path
                        key={`mesh-v-${index}`}
                        d={path}
                        fill="none"
                        stroke="hsl(var(--border) / 0.22)"
                        strokeWidth="1"
                    />
                ))}
            </svg>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_38%,hsl(var(--background)/0.72)_100%)]" />
        </div>
    );
}
