import Link from "next/link";
import { ArrowLeft, HelpCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const faqs = [
    {
        question: "What is JassSpace?",
        answer: "JassSpace is a platform for showcasing projects, content, and creative work.",
    },
    {
        question: "How do I contact your team?",
        answer: "Use the contact page and send your request. We review messages and reply through email.",
    },
    {
        question: "How does account sign-in work?",
        answer: "You can sign in with email/password or supported social providers such as Google and GitHub.",
    },
    {
        question: "Where can I read about data handling?",
        answer: "Please see our Privacy Policy page for a plain-language overview.",
    },
];

export default function FaqPage() {
    return (
        <main className="min-h-screen bg-background/50 px-4 py-8">
            <div className="container mx-auto max-w-7xl min-h-[calc(100vh-6rem)] pt-16 flex items-center">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full items-start">
                    <div className="hidden lg:block space-y-6">
                        <Badge variant="secondary" className="px-4 py-1.5 rounded-full text-sm font-normal backdrop-blur-sm bg-background/50 border-border/50 gap-2 w-fit">
                            <HelpCircle className="h-3.5 w-3.5 text-primary" />
                            <span>FAQ</span>
                        </Badge>
                        <h1 className="text-4xl xl:text-5xl font-bold tracking-tight max-w-xl">
                            Frequently asked questions
                        </h1>
                        <p className="text-base text-muted-foreground max-w-xl">
                            Quick answers to the most common questions about JassSpace.
                        </p>
                        <Button variant="ghost" asChild className="rounded-full px-6 w-fit">
                            <Link href="/">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Back
                            </Link>
                        </Button>
                    </div>

                    <Card className="w-full lg:ml-auto lg:max-w-2xl rounded-3xl border bg-card/50 backdrop-blur-sm shadow-xl p-6 md:p-8">
                        <CardHeader className="px-0 pt-0 pb-6 lg:hidden">
                            <CardTitle className="text-3xl font-bold tracking-tight">FAQ</CardTitle>
                        </CardHeader>
                        <CardContent className="px-0 space-y-5">
                            {faqs.map((item) => (
                                <div key={item.question} className="rounded-2xl border bg-background/40 p-4">
                                    <h2 className="text-base font-semibold">{item.question}</h2>
                                    <p className="mt-2 text-sm text-muted-foreground">{item.answer}</p>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </main>
    );
}
