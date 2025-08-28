import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Music, Search, Zap, Users, ShieldCheck, Star, TrendingUp } from 'lucide-react';

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Music className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold gradient-text">
              BeatHub
            </span>
          </div>
          
          <div className="flex items-center space-x-3">
            <Button variant="ghost" asChild data-testid="button-landing-login">
              <a href="/api/login">Sign In</a>
            </Button>
            <Button asChild data-testid="button-landing-signup">
              <a href="/api/login">Get Started</a>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-purple-600/10"></div>
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23ffffff%22%20fill-opacity%3D%220.02%22%3E%3Ccircle%20cx%3D%2230%22%20cy%3D%2230%22%20r%3D%222%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-50"></div>
        
        <div className="relative container mx-auto px-4 py-20 lg:py-32">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl lg:text-6xl font-bold mb-6 animate-fade-in" data-testid="text-hero-title">
              <span className="gradient-text">
                YOUR FIRST HIT
              </span>
              <br />
              <span className="text-foreground">STARTS HERE</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto animate-fade-in" data-testid="text-hero-description">
              Discover premium beats from top producers worldwide. License instantly and start creating your next masterpiece.
            </p>
            
            <div className="flex justify-center mb-12 animate-slide-up">
              <div className="relative max-w-2xl w-full">
                <Search className="absolute left-6 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Try searching Trap or Drill or Juice WRLD..."
                  className="pl-14 pr-32 py-6 text-lg bg-card border-border rounded-xl focus:ring-primary focus:border-primary"
                  disabled
                  data-testid="input-hero-search"
                />
                <Button 
                  disabled
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 px-6 py-3"
                  data-testid="button-hero-search"
                >
                  Search
                </Button>
              </div>
            </div>
            
            <div className="flex flex-wrap justify-center gap-3 text-sm mb-12 animate-fade-in">
              <span className="text-muted-foreground">What's trending right now:</span>
              <span className="bg-secondary px-3 py-1 rounded-full transition-colors hover:bg-secondary/80">gunna type beat</span>
              <span className="bg-secondary px-3 py-1 rounded-full transition-colors hover:bg-secondary/80">lil durk</span>
              <span className="bg-secondary px-3 py-1 rounded-full transition-colors hover:bg-secondary/80">drake type beat</span>
              <span className="bg-secondary px-3 py-1 rounded-full transition-colors hover:bg-secondary/80">trap</span>
              <span className="bg-secondary px-3 py-1 rounded-full transition-colors hover:bg-secondary/80">rnb</span>
            </div>

            <Button size="lg" asChild className="text-lg px-8 py-6 animate-slide-up" data-testid="button-hero-cta">
              <a href="/api/login">Start Creating Today</a>
            </Button>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 border-t border-border">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div className="animate-fade-in">
              <div className="text-3xl font-bold text-primary mb-2">50,000+</div>
              <div className="text-muted-foreground">Premium Beats</div>
            </div>
            <div className="animate-fade-in">
              <div className="text-3xl font-bold text-primary mb-2">10,000+</div>
              <div className="text-muted-foreground">Active Producers</div>
            </div>
            <div className="animate-fade-in">
              <div className="text-3xl font-bold text-primary mb-2">1M+</div>
              <div className="text-muted-foreground">Downloads</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 border-t border-border">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4 animate-fade-in" data-testid="text-features-title">
              Everything You Need to Create
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto animate-fade-in" data-testid="text-features-description">
              From discovery to licensing, we've built the ultimate platform for music creators and producers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="hover-glow animate-fade-in" data-testid="card-feature-discover">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Search className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-4">Discover Premium Beats</h3>
                <p className="text-muted-foreground">
                  Browse thousands of high-quality beats from talented producers worldwide. Filter by genre, mood, BPM, and more.
                </p>
              </CardContent>
            </Card>

            <Card className="hover-glow animate-fade-in" data-testid="card-feature-license">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <ShieldCheck className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-4">Instant Licensing</h3>
                <p className="text-muted-foreground">
                  License beats instantly with clear, legal agreements. Choose from basic, premium, or exclusive licenses.
                </p>
              </CardContent>
            </Card>

            <Card className="hover-glow animate-fade-in" data-testid="card-feature-community">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Users className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-4">Producer Community</h3>
                <p className="text-muted-foreground">
                  Connect with producers, artists, and creators. Share your work and discover collaboration opportunities.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-card/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Trusted by Creators Worldwide</h2>
            <p className="text-xl text-muted-foreground">See what producers and artists are saying about BeatHub</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="hover-glow">
              <CardContent className="p-6">
                <div className="flex items-center mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-muted-foreground mb-4">
                  "BeatHub has completely transformed my workflow. The quality of beats is incredible and licensing is so easy."
                </p>
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center mr-3">
                    <span className="text-primary-foreground text-sm font-medium">DJ</span>
                  </div>
                  <div>
                    <div className="font-medium">DJ Producer</div>
                    <div className="text-sm text-muted-foreground">Hip-Hop Producer</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover-glow">
              <CardContent className="p-6">
                <div className="flex items-center mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-muted-foreground mb-4">
                  "As an artist, BeatHub gives me access to beats I never would have found otherwise. Game changer!"
                </p>
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center mr-3">
                    <span className="text-primary-foreground text-sm font-medium">MC</span>
                  </div>
                  <div>
                    <div className="font-medium">MC Artist</div>
                    <div className="text-sm text-muted-foreground">Recording Artist</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover-glow">
              <CardContent className="p-6">
                <div className="flex items-center mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-muted-foreground mb-4">
                  "Finally a platform that respects producers and makes it easy to monetize our music. Highly recommended!"
                </p>
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center mr-3">
                    <span className="text-primary-foreground text-sm font-medium">BP</span>
                  </div>
                  <div>
                    <div className="font-medium">Beat Producer</div>
                    <div className="text-sm text-muted-foreground">Trap Producer</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 border-t border-border">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4 animate-fade-in" data-testid="text-cta-title">
            Ready to Create Your Next Hit?
          </h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto animate-fade-in" data-testid="text-cta-description">
            Join thousands of artists and producers who trust BeatHub for their music creation needs.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-slide-up">
            <Button size="lg" asChild className="text-lg px-8 py-6" data-testid="button-cta-browse">
              <a href="/api/login">Browse Beats</a>
            </Button>
            <Button size="lg" variant="outline" asChild className="text-lg px-8 py-6" data-testid="button-cta-upload">
              <a href="/api/login">Upload Your Beats</a>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <Music className="h-5 w-5 text-primary-foreground" />
                </div>
                <span className="text-xl font-bold gradient-text">
                  BeatHub
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                The world's largest marketplace for beats and instrumentals.
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Marketplace</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>Browse Beats</li>
                <li>Top Producers</li>
                <li>New Releases</li>
                <li>Free Downloads</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">For Producers</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>Upload Beats</li>
                <li>Producer Tools</li>
                <li>Analytics</li>
                <li>Payouts</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Support</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>Help Center</li>
                <li>Licensing Guide</li>
                <li>Contact Us</li>
                <li>Legal</li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-border mt-8 pt-8 text-center text-sm text-muted-foreground">
            © 2024 BeatHub. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
