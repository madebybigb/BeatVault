import { useQuery } from '@tanstack/react-query';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Music, 
  Mic, 
  ArrowRight,
  Headphones,
  Heart,
  Play
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Collection } from '@shared/schema';

// Mock collections data with vibrant colors inspired by Spotify design
const mockCollections: Collection[] = [
  // Genres
  {
    id: '1',
    name: 'Hip Hop',
    type: 'genre',
    description: 'Heavy beats and urban vibes',
    color: '#FF6B6B',
    imageUrl: null,
    beatCount: 2847,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '2',
    name: 'R&B',
    type: 'genre',
    description: 'Smooth and soulful rhythms',
    color: '#4ECDC4',
    imageUrl: null,
    beatCount: 1923,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '3',
    name: 'Trap',
    type: 'genre',
    description: 'Hard-hitting 808s and snares',
    color: '#45B7D1',
    imageUrl: null,
    beatCount: 3156,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '4',
    name: 'Pop',
    type: 'genre',
    description: 'Catchy melodies and hooks',
    color: '#F9CA24',
    imageUrl: null,
    beatCount: 1567,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '5',
    name: 'Electronic',
    type: 'genre',
    description: 'Digital sounds and synths',
    color: '#6C5CE7',
    imageUrl: null,
    beatCount: 2234,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '6',
    name: 'Rock',
    type: 'genre',
    description: 'Guitar-driven energy',
    color: '#E17055',
    imageUrl: null,
    beatCount: 892,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  // Artist Types
  {
    id: '7',
    name: 'Drake Type Beat',
    type: 'artist',
    description: 'Melodic rap with emotional depth',
    color: '#A29BFE',
    imageUrl: null,
    beatCount: 1456,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '8',
    name: 'Travis Scott Type Beat',
    type: 'artist',
    description: 'Psychedelic trap with autotune',
    color: '#FD79A8',
    imageUrl: null,
    beatCount: 1123,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '9',
    name: 'The Weeknd Type Beat',
    type: 'artist',
    description: 'Dark R&B with atmospheric vibes',
    color: '#00B894',
    imageUrl: null,
    beatCount: 987,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '10',
    name: 'Future Type Beat',
    type: 'artist',
    description: 'Modern trap with heavy bass',
    color: '#FDCB6E',
    imageUrl: null,
    beatCount: 1789,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '11',
    name: 'Juice WRLD Type Beat',
    type: 'artist',
    description: 'Melodic emo rap beats',
    color: '#E84393',
    imageUrl: null,
    beatCount: 1345,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '12',
    name: 'Lil Baby Type Beat',
    type: 'artist',
    description: 'Atlanta trap with melodic flows',
    color: '#00CEC9',
    imageUrl: null,
    beatCount: 1098,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

interface CollectionCardProps {
  collection: Collection;
  size?: 'large' | 'medium' | 'small';
}

function CollectionCard({ collection, size = 'medium' }: CollectionCardProps) {
  const isGenre = collection.type === 'genre';
  const sizeClasses = {
    large: 'h-48 text-xl',
    medium: 'h-36 text-lg',
    small: 'h-28 text-base'
  };

  const handleExplore = () => {
    if (isGenre) {
      window.location.href = `/browse?genre=${encodeURIComponent(collection.name)}`;
    } else {
      // For artist type beats, search for the artist name
      window.location.href = `/browse?search=${encodeURIComponent(collection.name)}`;
    }
  };

  return (
    <Card 
      className="group overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl border-0 cursor-pointer"
      style={{ backgroundColor: collection.color }}
      onClick={handleExplore}
      data-testid={`card-collection-${collection.id}`}
    >
      <CardContent className={cn(
        "p-6 relative h-full flex flex-col justify-between text-white",
        sizeClasses[size]
      )}>
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-4 right-4">
            {isGenre ? (
              <Music className="h-16 w-16 rotate-12" />
            ) : (
              <Mic className="h-16 w-16 rotate-12" />
            )}
          </div>
          <div className="absolute bottom-4 left-4">
            <Headphones className="h-8 w-8 -rotate-12 opacity-60" />
          </div>
        </div>

        {/* Content */}
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <Badge 
              variant="secondary" 
              className="bg-white/20 text-white border-0 backdrop-blur-sm text-xs"
            >
              {isGenre ? 'Genre' : 'Artist Type'}
            </Badge>
          </div>
          
          <h3 className="font-bold mb-1 truncate" data-testid={`text-collection-name-${collection.id}`}>
            {collection.name}
          </h3>
          <p className="text-white/80 text-sm mb-3 line-clamp-2" data-testid={`text-collection-description-${collection.id}`}>
            {collection.description}
          </p>
        </div>

        {/* Bottom Section */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-4 text-sm text-white/90">
            <div className="flex items-center gap-1">
              <Play className="h-4 w-4" />
              <span data-testid={`text-collection-count-${collection.id}`}>
                {(collection.beatCount || 0).toLocaleString()} beats
              </span>
            </div>
          </div>
          
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              handleExplore();
            }}
            className="bg-white/10 hover:bg-white/20 text-white border-0 rounded-full h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
            data-testid={`button-collection-explore-${collection.id}`}
          >
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Collections() {
  const { data: collections = mockCollections, isLoading } = useQuery<Collection[]>({
    queryKey: ['/api/collections'],
    retry: false,
  });

  const genres = collections.filter(c => c.type === 'genre');
  const artistTypes = collections.filter(c => c.type === 'artist');

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background text-white">
        <Header />
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          <div className="animate-pulse space-y-8">
            <div className="h-12 w-80 bg-muted rounded" />
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="h-36 bg-muted rounded-xl" />
              ))}
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-white">
      <Header />
      
      <div className="container mx-auto px-4 py-8 space-y-12 max-w-7xl">
        {/* Page Header */}
        <div className="text-center space-y-4">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-white via-blue-200 to-purple-300 bg-clip-text text-transparent">
            Collections
          </h1>
          <p className="text-muted-foreground text-xl max-w-2xl mx-auto">
            Explore beats by genre and discover artist-inspired collections to find your perfect sound
          </p>
        </div>

        {/* Featured Collection */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="h-8 w-1 bg-primary rounded-full" />
            <h2 className="text-3xl font-bold">Featured Collection</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <CollectionCard collection={genres[0]} size="large" />
            <div className="grid grid-cols-1 gap-4">
              <CollectionCard collection={artistTypes[0]} size="medium" />
              <CollectionCard collection={artistTypes[1]} size="medium" />
            </div>
          </div>
        </section>

        {/* Genres Section */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-8 w-1 bg-primary rounded-full" />
              <h2 className="text-3xl font-bold">Browse by Genre</h2>
            </div>
            <Badge variant="outline" className="px-4 py-2">
              {genres.length} genres
            </Badge>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {genres.slice(1).map((genre) => (
              <CollectionCard key={genre.id} collection={genre} size="small" />
            ))}
          </div>
        </section>

        {/* Artist Types Section */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-8 w-1 bg-primary rounded-full" />
              <h2 className="text-3xl font-bold">Artist Type Beats</h2>
            </div>
            <Badge variant="outline" className="px-4 py-2">
              {artistTypes.length} artists
            </Badge>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {artistTypes.slice(2).map((artist) => (
              <CollectionCard key={artist.id} collection={artist} size="medium" />
            ))}
          </div>
        </section>

        {/* Stats Section */}
        <section className="bg-gradient-to-r from-gray-900/50 to-gray-800/30 rounded-3xl p-8 text-center">
          <div className="max-w-4xl mx-auto">
            <h3 className="text-3xl font-bold mb-6">Discover Your Sound</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              <div className="space-y-2">
                <div className="text-3xl font-bold text-primary">
                  {collections.reduce((total, c) => total + (c.beatCount || 0), 0).toLocaleString()}
                </div>
                <div className="text-muted-foreground">Total Beats</div>
              </div>
              <div className="space-y-2">
                <div className="text-3xl font-bold text-green-400">
                  {genres.length}
                </div>
                <div className="text-muted-foreground">Genres</div>
              </div>
              <div className="space-y-2">
                <div className="text-3xl font-bold text-purple-400">
                  {artistTypes.length}
                </div>
                <div className="text-muted-foreground">Artist Types</div>
              </div>
              <div className="space-y-2">
                <div className="text-3xl font-bold text-yellow-400">
                  {collections.length}
                </div>
                <div className="text-muted-foreground">Collections</div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <Footer />
    </div>
  );
}