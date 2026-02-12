'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Mail, ArrowLeft, Send, CheckCircle2, MoveUpRight } from 'lucide-react';

export default function ContactPage() {
    const [submitted, setSubmitted] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        purpose: '',
        message: ''
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { id, value } = e.target;
        setFormData(prev => ({ ...prev, [id]: value }));
    };

    const handlePurposeChange = (value: string) => {
        setFormData(prev => ({ ...prev, purpose: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Construct mailto link
        const recipient = 'mail@jsm33t.com';
        const subject = encodeURIComponent(`Contact Form: ${formData.purpose} from ${formData.name}`);
        const body = encodeURIComponent(
            `Name: ${formData.name}\n` +
            `Email: ${formData.email}\n` +
            `Purpose: ${formData.purpose}\n\n` +
            `Message:\n${formData.message}`
        );

        const mailtoUrl = `mailto:${recipient}?subject=${subject}&body=${body}`;

        // Trigger mail client
        window.location.href = mailtoUrl;

        // Show success state
        setSubmitted(true);
    };

    if (submitted) {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col min-h-screen bg-background/50 items-center justify-center px-4"
            >
                {/* Ambient Background Glow */}
                <div className="fixed inset-0 z-[-1] pointer-events-none">
                    <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-[120px]" />
                    <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-blue-500/5 blur-[120px]" />
                </div>

                <Card className="max-w-md w-full rounded-3xl border bg-card/50 backdrop-blur-sm shadow-xl text-center p-8">
                    <CardHeader>
                        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-green-100 dark:bg-green-900/20 mb-6 scale-110 transition-transform">
                            <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
                        </div>
                        <CardTitle className="text-3xl font-bold tracking-tight text-balance">Message Composed!</CardTitle>
                        <CardDescription className="text-lg pt-4 leading-relaxed">
                            We've opened your email client to send the message to <strong className="text-foreground">mail@jsm33t.com</strong>.
                        </CardDescription>
                    </CardHeader>
                    <CardFooter className="flex justify-center pt-8">
                        <Button variant="outline" className="rounded-full px-8 bg-background/50" asChild>
                            <Link href="/">Back to Home</Link>
                        </Button>
                    </CardFooter>
                </Card>
            </motion.div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="flex flex-col min-h-screen bg-background/50"
        >
            {/* Ambient Background Glow */}
            <div className="fixed inset-0 z-[-1] pointer-events-none">
                <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-[120px]" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-blue-500/5 blur-[120px]" />
            </div>

            {/* Header */}
            <section className="px-4 py-8 md:py-12 border-b bg-muted/30 backdrop-blur-sm">
                <div className="container mx-auto max-w-7xl pt-16">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div className="space-y-3">
                            <Badge variant="secondary" className="px-4 py-1.5 rounded-full text-sm font-normal backdrop-blur-sm bg-background/50 border-border/50 gap-2 w-fit">
                                <Mail className="h-3.5 w-3.5 text-primary" />
                                <span>Get in Touch</span>
                            </Badge>
                            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
                                Contact Us
                            </h1>
                            <p className="text-lg text-muted-foreground max-w-2xl">
                                Have a question or want to work together? Send us a message below.
                            </p>
                        </div>
                        <Button variant="ghost" asChild className="rounded-full px-6">
                            <Link href="/">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Back
                            </Link>
                        </Button>
                    </div>
                </div>
            </section>

            {/* Contact Form */}
            <section className="flex-1 px-4 py-12">
                <div className="container mx-auto max-w-7xl">
                    <Card className="max-w-2xl mx-auto rounded-3xl border bg-card/50 backdrop-blur-sm shadow-xl p-8 md:p-12 relative overflow-hidden group">
                        <div className="absolute top-6 right-6 p-2 rounded-full border bg-background/50 group-hover:scale-110 transition-transform">
                            <MoveUpRight className="h-4 w-4 opacity-50" />
                        </div>

                        <CardHeader className="px-0 pt-0 pb-8">
                            <CardTitle className="text-2xl font-semibold tracking-tight">Send a Message</CardTitle>
                            <CardDescription className="text-base pt-2">
                                Fill out the form below and we'll respond via email.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="px-0">
                            <form onSubmit={handleSubmit} className="space-y-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2.5">
                                        <label htmlFor="name" className="text-sm font-medium tracking-tight text-muted-foreground/80">Name</label>
                                        <Input
                                            id="name"
                                            placeholder="John Doe"
                                            required
                                            value={formData.name}
                                            onChange={handleChange}
                                            className="rounded-xl border-border/50 bg-background/40 focus:bg-background/80 transition-all h-11"
                                        />
                                    </div>
                                    <div className="space-y-2.5">
                                        <label htmlFor="email" className="text-sm font-medium tracking-tight text-muted-foreground/80">Email</label>
                                        <Input
                                            id="email"
                                            type="email"
                                            placeholder="john@example.com"
                                            required
                                            value={formData.email}
                                            onChange={handleChange}
                                            className="rounded-xl border-border/50 bg-background/40 focus:bg-background/80 transition-all h-11"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2.5">
                                    <label htmlFor="purpose" className="text-sm font-medium tracking-tight text-muted-foreground/80">Purpose</label>
                                    <Select required onValueChange={handlePurposeChange} value={formData.purpose}>
                                        <SelectTrigger id="purpose" className="rounded-xl border-border/50 bg-background/40 focus:bg-background/80 transition-all h-11">
                                            <SelectValue placeholder="Select a purpose" />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xl border-border/50 backdrop-blur-xl">
                                            <SelectItem value="General Inquiry">General Inquiry</SelectItem>
                                            <SelectItem value="New Project">New Project</SelectItem>
                                            <SelectItem value="Service Request">Service Request</SelectItem>
                                            <SelectItem value="Technical Support">Technical Support</SelectItem>
                                            <SelectItem value="Other">Other</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2.5">
                                    <label htmlFor="message" className="text-sm font-medium tracking-tight text-muted-foreground/80">Message</label>
                                    <Textarea
                                        id="message"
                                        placeholder="Tell us more about what's on your mind..."
                                        className="min-h-[160px] resize-none rounded-xl border-border/50 bg-background/40 focus:bg-background/80 transition-all p-4"
                                        required
                                        value={formData.message}
                                        onChange={handleChange}
                                    />
                                </div>

                                <Button type="submit" size="lg" className="w-full rounded-full h-12 text-base font-medium transition-all group-hover:shadow-lg">
                                    <Send className="mr-2 h-4 w-4" />
                                    Compose Email
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            </section>
        </motion.div>
    );
}
