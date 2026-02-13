"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { 
  ArrowRight, 
  Sparkles, 
  Music, 
  Images, // Changed from Camera to Images for a gallery vibe
  MoveUpRight, 
  Github, 
  Twitter 
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// --- Animations ---
const heroVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.6, easing: "easeOut" },
    },
};

const gridVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1,
            delayChildren: 0.3,
        },
    },
};

const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
        opacity: 1, 
        y: 0, 
        transition: { duration: 0.5 } 
    },
};

export default function HomePage() {
    return (
        <div className="min-h-screen w-full bg-background text-foreground selection:bg-primary/10 selection:text-primary overflow-x-hidden">
            {/* Ambient Background Glow */}
            <div className="fixed inset-0 z-[-1] pointer-events-none">
                <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-[120px]" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-blue-500/5 blur-[120px]" />
            </div>

            <main className="mx-auto max-w-5xl px-6 py-24 md:py-32">
                
                {/* --- Hero Section --- */}
                <motion.section
                    className="flex flex-col items-center text-center space-y-8 mb-24"
                    variants={heroVariants}
                    initial="hidden"
                    animate="visible"
                >
                    <Badge variant="secondary" className="px-4 py-1.5 rounded-full text-sm font-normal backdrop-blur-sm bg-background/50 border-border/50 gap-2">
                        <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                        <span>Personal space on the internet</span>
                    </Badge>

                    <h1 className="text-4xl font-semibold tracking-tight md:text-6xl max-w-3xl text-balance">
                        A calm home for my work, ideas, and experiments.
                    </h1>

                    <p className="text-lg text-muted-foreground max-w-xl text-balance leading-relaxed">
                        Use this page as your digital front door. Introduce yourself,
                        highlight a few important things you&apos;re working on, and
                        point people toward where they should go next.
                    </p>

                    <div className="flex items-center gap-4 pt-2">
                        <Button size="lg" className="rounded-full px-8" asChild>
                            <Link href="#work">
                                View my work <ArrowRight className="ml-2 h-4 w-4" />
                            </Link>
                        </Button>
                        <Button size="lg" variant="ghost" className="rounded-full px-8 text-muted-foreground hover:text-foreground" asChild>
                            <Link href="#contact">Get in touch</Link>
                        </Button>
                    </div>
                </motion.section>


                {/* --- Bento Grid Section --- */}
                <motion.section 
                    variants={gridVariants}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: "-100px" }}
                    className="grid grid-cols-1 md:grid-cols-3 gap-4 auto-rows-[280px]"
                >
                    {/* 1. Featured Work (Wide Card) */}
                    <motion.div variants={cardVariants} className="md:col-span-2 group relative overflow-hidden rounded-3xl border bg-card/50 hover:bg-card/80 transition-colors p-8 backdrop-blur-sm">
                        <Link href="/work" className="absolute inset-0 z-10" />
                        <div className="flex flex-col h-full justify-between">
                            <div className="flex justify-between items-start">
                                <div className="space-y-1">
                                    <h3 className="text-xl font-medium tracking-tight">Selected Projects</h3>
                                    <p className="text-sm text-muted-foreground">What I&apos;ve been building lately</p>
                                </div>
                                <div className="p-2 rounded-full border bg-background/50 group-hover:scale-110 transition-transform">
                                    <MoveUpRight className="h-4 w-4 opacity-50" />
                                </div>
                            </div>
                            <div className="space-y-2 opacity-30 group-hover:opacity-60 transition-opacity">
                                <div className="h-2 w-24 rounded-full bg-foreground/20" />
                                <div className="h-2 w-32 rounded-full bg-foreground/20" />
                                <div className="h-2 w-16 rounded-full bg-foreground/20" />
                            </div>
                        </div>
                    </motion.div>

                    {/* 2. Music (Square Card) */}
                    <motion.div variants={cardVariants} className="md:col-span-1 group relative overflow-hidden rounded-3xl border bg-gradient-to-br from-neutral-100/50 to-white/50 dark:from-neutral-900/50 dark:to-neutral-950/50 p-6 transition-all hover:shadow-lg backdrop-blur-md">
                        <Link href="/music" className="absolute inset-0 z-10" />
                        <div className="flex flex-col h-full justify-between">
                            <div className="flex justify-between items-start">
                                <Music className="h-6 w-6 text-pink-500" />
                                <div className="bg-green-500/10 text-green-600 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                    SPOTIFY
                                </div>
                            </div>
                            <div>
                                <h3 className="font-medium text-lg">Music Prod.</h3>
                                <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                                    Bootlegs <br/>
                                    <span className="opacity-50">Originals</span>
                                </p>
                            </div>
                        </div>
                    </motion.div>

                    {/* 3. Gallery (Square Card) - INNOVATIVE STACK DESIGN */}
                    <motion.div variants={cardVariants} className="md:col-span-1 group relative overflow-hidden rounded-3xl border bg-card/30 p-6 transition-all hover:bg-card/50">
                         <Link href="/gallery" className="absolute inset-0 z-20" />
                         
                         {/* The interactive stack visual */}
                         <div className="absolute inset-0 flex items-center justify-center pointer-events-none top-[-10%]">
                             {/* Back item */}
                             <div className="absolute h-40 w-40 bg-background/40 border border-border/20 rounded-xl rotate-[8deg] translate-x-6 transition-all duration-500 ease-out group-hover:translate-x-12 group-hover:rotate-[15deg] shadow-sm" />
                             {/* Middle item */}
                             <div className="absolute h-40 w-40 bg-background/60 border border-border/40 rounded-xl rotate-[4deg] translate-x-3 transition-all duration-500 ease-out group-hover:translate-x-6 group-hover:rotate-[8deg] shadow-sm" />
                             {/* Front item (Main) */}
                             <div className="relative h-40 w-40 bg-background border rounded-xl shadow-lg flex items-center justify-center transition-all duration-500 ease-out group-hover:scale-105 group-hover:-translate-y-2">
                                 <Images className="h-10 w-10 text-muted-foreground/50 group-hover:text-primary transition-colors" />
                             </div>
                         </div>

                         <div className="absolute bottom-6 left-6 z-10">
                            <h3 className="font-medium text-lg flex items-center gap-2">
                                Gallery <ArrowRight className="h-4 w-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                            </h3>
                         </div>
                    </motion.div>

                    {/* 4. Socials / Contact (Wide Card) */}
                    <motion.div variants={cardVariants} className="md:col-span-2 group relative overflow-hidden rounded-3xl border bg-card/50 p-8 hover:bg-card/80 transition-colors backdrop-blur-sm">
                        <div className="flex flex-col h-full justify-center items-center text-center space-y-4">
                            <h3 className="text-xl font-medium">Let&apos;s connect</h3>
                            <div className="flex gap-3">
                                <Button variant="outline" size="icon" className="rounded-full h-10 w-10 bg-background/50" asChild>
                                    <Link href="https://github.com"><Github className="h-5 w-5" /></Link>
                                </Button>
                                <Button variant="outline" size="icon" className="rounded-full h-10 w-10 bg-background/50" asChild>
                                    <Link href="https://twitter.com"><Twitter className="h-5 w-5" /></Link>
                                </Button>
                                <Button className="rounded-full px-6" asChild>
                                    <Link href="mailto:mail@jsm33t.com">Say hello</Link>
                                </Button>
                            </div>
                        </div>
                    </motion.div>

                </motion.section>

            </main>
        </div>
    );
}
