'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';

export function Navbar() {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    return (
        <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container mx-auto px-4">
                <div className="flex h-16 items-center justify-between">
                    {/* Logo */}
                    <Link href="/" className="flex items-center space-x-2">
                        <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                            <span className="text-primary-foreground font-bold text-lg">J</span>
                        </div>
                        <span className="font-bold text-xl">JassSpace</span>
                    </Link>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex items-center space-x-8">
                        <Link href="/features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                            Features
                        </Link>
                        <Link href="/pricing" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                            Pricing
                        </Link>
                        <Link href="/docs" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                            Docs
                        </Link>
                        <Link href="/about" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                            About
                        </Link>
                    </div>

                    {/* Desktop Auth Buttons */}
                    <div className="hidden md:flex items-center space-x-4">
                        <Button variant="ghost" asChild>
                            <Link href="/login">Sign in</Link>
                        </Button>
                        <Button asChild>
                            <Link href="/signup">Get started</Link>
                        </Button>
                    </div>

                    {/* Mobile Menu Button */}
                    <button
                        className="md:hidden"
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        aria-label="Toggle menu"
                    >
                        {mobileMenuOpen ? (
                            <X className="h-6 w-6" />
                        ) : (
                            <Menu className="h-6 w-6" />
                        )}
                    </button>
                </div>

                {/* Mobile Menu */}
                {mobileMenuOpen && (
                    <div className="md:hidden py-4 space-y-4">
                        <Link
                            href="/features"
                            className="block text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                            onClick={() => setMobileMenuOpen(false)}
                        >
                            Features
                        </Link>
                        <Link
                            href="/pricing"
                            className="block text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                            onClick={() => setMobileMenuOpen(false)}
                        >
                            Pricing
                        </Link>
                        <Link
                            href="/docs"
                            className="block text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                            onClick={() => setMobileMenuOpen(false)}
                        >
                            Docs
                        </Link>
                        <Link
                            href="/about"
                            className="block text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                            onClick={() => setMobileMenuOpen(false)}
                        >
                            About
                        </Link>
                        <div className="pt-4 space-y-2">
                            <Button variant="ghost" className="w-full" asChild>
                                <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                                    Sign in
                                </Link>
                            </Button>
                            <Button className="w-full" asChild>
                                <Link href="/signup" onClick={() => setMobileMenuOpen(false)}>
                                    Get started
                                </Link>
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </nav>
    );
}
