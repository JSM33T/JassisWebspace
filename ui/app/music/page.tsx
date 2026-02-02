import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Music, Sparkles, ArrowLeft, Radio, Headphones, ListMusic } from 'lucide-react';

export default function MusicPage() {
    return (
        <div className="flex flex-col min-h-screen">
            {/* Hero Section */}
            <section className="flex-1 flex items-center justify-center px-4 py-20 md:py-32">
                <div className="container mx-auto text-center space-y-8">
                    <div className="inline-flex items-center rounded-full border px-4 py-1.5 text-sm font-medium mb-4">
                        <Music className="mr-2 h-4 w-4" />
                        Audio Experience
                    </div>

                    <div className="relative">
                        <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight">
                            Music
                        </h1>
                        <Badge
                            variant="secondary"
                            className="absolute -top-4 -right-4 md:-top-8 md:-right-8 text-xs md:text-sm px-3 py-1 bg-gradient-to-r from-primary/20 to-primary/10 border-primary/30"
                        >
                            <Sparkles className="h-3 w-3 md:h-4 md:w-4 mr-1 inline" />
                            Coming Soon
                        </Badge>
                    </div>

                    <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                        Get ready to explore an incredible music collection.
                        Something amazing is on its way!
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 max-w-4xl mx-auto">
                        {/* Feature 1 */}
                        <div className="p-6 rounded-lg border bg-card text-card-foreground hover:shadow-lg transition-shadow">
                            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                                <Radio className="h-6 w-6 text-primary" />
                            </div>
                            <h3 className="text-lg font-semibold mb-2">Live Streams</h3>
                            <p className="text-sm text-muted-foreground">
                                Listen to curated music streams
                            </p>
                        </div>

                        {/* Feature 2 */}
                        <div className="p-6 rounded-lg border bg-card text-card-foreground hover:shadow-lg transition-shadow">
                            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                                <Headphones className="h-6 w-6 text-primary" />
                            </div>
                            <h3 className="text-lg font-semibold mb-2">Original Tracks</h3>
                            <p className="text-sm text-muted-foreground">
                                Discover exclusive music compositions
                            </p>
                        </div>

                        {/* Feature 3 */}
                        <div className="p-6 rounded-lg border bg-card text-card-foreground hover:shadow-lg transition-shadow">
                            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                                <ListMusic className="h-6 w-6 text-primary" />
                            </div>
                            <h3 className="text-lg font-semibold mb-2">Playlists</h3>
                            <p className="text-sm text-muted-foreground">
                                Themed playlists for every mood
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mt-12">
                        <Button size="lg" variant="outline" asChild>
                            <Link href="/">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Back to Home
                            </Link>
                        </Button>
                    </div>
                </div>
            </section>
        </div>
    );
}
