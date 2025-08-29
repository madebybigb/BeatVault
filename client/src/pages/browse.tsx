import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useGlobalPlayer } from "@/hooks/useGlobalPlayer";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { 
  Search, 
  Play, 
  Pause,
  Heart,
  MoreHorizontal,
  TrendingUp,
  Star,
  Tag,
  DollarSign,
  Music,
  Headphones,
  BarChart3,
  Filter,
  Grid3X3,
  List,
  ChevronRight
} from "lucide-react";
import type { Beat } from "@shared/schema";

const categories = [
  { icon: Star, label: "New & Notable", active: false, filter: "new" },
  { icon: Heart, label: "For You", active: false, filter: "foryou" },
  { icon: BarChart3, label: "Top Charts", active: true, filter: "trending" },
  { icon: Tag, label: "Exclusive Only", active: false, filter: "exclusive" },
  { icon: DollarSign, label: "Under $20", active: false, filter: "under20" },
  { icon: Music, label: "Free Beats", active: false, filter: "free" },
  { icon: Headphones, label: "Beats", active: false, filter: "all" },
];

const popularTags = [
  "drake", "trap", "guitar", "fl berry", "travis scott", "gunna", "rnb", 
  "type beat", "juice wrld", "future", "j cole", "hip hop"
];

const filters = {
  genre: ["All", "Trap", "Hip Hop", "R&B", "Pop", "Drill", "Afrobeat", "Electronic"],
  mood: ["All", "Dark", "Aggressive", "Chill", "Melodic", "Emotional", "Hard", "Bouncy"],
  bpm: ["All", "60-90", "90-120", "120-140", "140-160", "160+"],
  key: ["All", "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"],
  instruments: ["All", "Guitar", "Piano", "Drums", "Bass", "Synth", "Vocals", "Strings"],
  price: ["All", "Free", "$1-$20", "$20-$50", "$50-$100", "$100+"]
};

export default function Browse() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilters, setSelectedFilters] = useState({
    genre: "All",
    mood: "All", 
    bpm: "All",
    key: "All",
    instruments: "All",
    price: "All"
  });
  const [activeCategory, setActiveCategory] = useState("trending");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [savedFilters, setSavedFilters] = useState(false);
  
  const { play, pause, currentBeat, isPlaying } = useGlobalPlayer();

  useEffect(() => {
    if (!authLoading && !user) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [user, authLoading, toast]);

  const { data: beats = [], isLoading } = useQuery<Beat[]>({
    queryKey: ["/api/beats", { search: searchQuery, category: activeCategory, ...selectedFilters }],
    retry: false,
  });

  const handlePlayBeat = (beat: Beat) => {
    if (currentBeat?.id === beat.id && isPlaying) {
      pause();
    } else {
      play({
        id: beat.id,
        title: beat.title,
        producer: beat.producer,
        artworkUrl: beat.artworkUrl,
        audioUrl: beat.audioUrl,
        beatTagUrl: beat.beatTagUrl,
      });
    }
  };

  const formatPrice = (price: number, isFree: boolean) => {
    if (isFree) return "FREE";
    return `$${price.toFixed(2)}`;
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      {/* Header */}
      <div className="border-b border-gray-800 bg-[#0f0f0f] sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold">Explore Tracks</h1>
            <Button variant="ghost" size="sm" className="text-gray-400">
              Hide <ChevronRight className="w-4 h-4 ml-1 rotate-90" />
            </Button>
          </div>

          {/* Category Circles */}
          <div className="flex items-center gap-4 mb-6 overflow-x-auto">
            {categories.map((category, index) => (
              <Button
                key={index}
                variant={category.active ? "default" : "ghost"}
                size="sm"
                className={`flex flex-col items-center gap-2 h-auto py-3 px-4 rounded-2xl min-w-[100px] ${
                  activeCategory === category.filter 
                    ? "bg-[#006aff] hover:bg-[#0056cc] text-white" 
                    : "bg-gray-800 hover:bg-gray-700 text-gray-300"
                }`}
                onClick={() => setActiveCategory(category.filter)}
                data-testid={`category-${category.label.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
                  <category.icon className="w-4 h-4" />
                </div>
                <span className="text-xs text-center">{category.label}</span>
              </Button>
            ))}
          </div>

          {/* Search and Tags */}
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search for tags"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-gray-800 border-gray-700 text-white placeholder-gray-400"
                data-testid="input-search-beats"
              />
            </div>

            {/* Popular Tags */}
            <div className="flex flex-wrap gap-2">
              {popularTags.map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="bg-gray-800 hover:bg-gray-700 text-gray-300 cursor-pointer"
                  data-testid={`tag-${tag}`}
                  onClick={() => setSearchQuery(tag)}
                >
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="border-b border-gray-800 bg-[#0f0f0f] sticky top-[180px] z-30">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 overflow-x-auto">
              <Select value={selectedFilters.genre} onValueChange={(value) => 
                setSelectedFilters(prev => ({ ...prev, genre: value }))
              }>
                <SelectTrigger className="w-[120px] bg-gray-800 border-gray-700">
                  <SelectValue placeholder="All time" />
                </SelectTrigger>
                <SelectContent>
                  {filters.genre.map((option) => (
                    <SelectItem key={option} value={option}>{option}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="bg-gray-800 hover:bg-gray-700">
                    Saved Filters
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem>My Favorites</DropdownMenuItem>
                  <DropdownMenuItem>Recently Played</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Select value={selectedFilters.mood} onValueChange={(value) => 
                setSelectedFilters(prev => ({ ...prev, mood: value }))
              }>
                <SelectTrigger className="w-[100px] bg-gray-800 border-gray-700">
                  <SelectValue placeholder="Genre" />
                </SelectTrigger>
                <SelectContent>
                  {filters.mood.map((option) => (
                    <SelectItem key={option} value={option}>{option}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedFilters.bpm} onValueChange={(value) => 
                setSelectedFilters(prev => ({ ...prev, bpm: value }))
              }>
                <SelectTrigger className="w-[120px] bg-gray-800 border-gray-700">
                  <SelectValue placeholder="Track Type" />
                </SelectTrigger>
                <SelectContent>
                  {filters.bpm.map((option) => (
                    <SelectItem key={option} value={option}>{option}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedFilters.price} onValueChange={(value) => 
                setSelectedFilters(prev => ({ ...prev, price: value }))
              }>
                <SelectTrigger className="w-[100px] bg-gray-800 border-gray-700">
                  <SelectValue placeholder="Price" />
                </SelectTrigger>
                <SelectContent>
                  {filters.price.map((option) => (
                    <SelectItem key={option} value={option}>{option}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedFilters.instruments} onValueChange={(value) => 
                setSelectedFilters(prev => ({ ...prev, instruments: value }))
              }>
                <SelectTrigger className="w-[130px] bg-gray-800 border-gray-700">
                  <SelectValue placeholder="Instruments" />
                </SelectTrigger>
                <SelectContent>
                  {filters.instruments.map((option) => (
                    <SelectItem key={option} value={option}>{option}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedFilters.key} onValueChange={(value) => 
                setSelectedFilters(prev => ({ ...prev, key: value }))
              }>
                <SelectTrigger className="w-[80px] bg-gray-800 border-gray-700">
                  <SelectValue placeholder="Key" />
                </SelectTrigger>
                <SelectContent>
                  {filters.key.map((option) => (
                    <SelectItem key={option} value={option}>{option}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button variant="ghost" size="sm" className="text-gray-400">
                Refresh
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === "list" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("list")}
                data-testid="view-list"
              >
                <List className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === "grid" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("grid")}
                data-testid="view-grid"
              >
                <Grid3X3 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Beat Listings */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-800 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : beats.length === 0 ? (
          <div className="text-center py-12">
            <Music className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-400 mb-2">No beats found</h3>
            <p className="text-gray-500">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="space-y-2">
            {beats.map((beat: Beat, index: number) => (
              <Card key={beat.id} className="bg-gray-900/50 border-gray-800 hover:bg-gray-800/50 transition-colors">
                <div className="flex items-center gap-4 p-4">
                  {/* Track Number */}
                  <div className="w-6 text-gray-400 text-sm">
                    {index + 1}
                  </div>

                  {/* Play Button & Artwork */}
                  <div className="relative">
                    <div className="w-12 h-12 rounded bg-gray-700 flex items-center justify-center overflow-hidden">
                      {beat.artworkUrl ? (
                        <img src={beat.artworkUrl} alt={beat.title} className="w-full h-full object-cover" />
                      ) : (
                        <Music className="w-6 h-6 text-gray-400" />
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="absolute inset-0 w-full h-full bg-black/50 hover:bg-black/70 text-white opacity-0 hover:opacity-100 transition-opacity"
                      onClick={() => handlePlayBeat(beat)}
                      data-testid={`play-beat-${beat.id}`}
                    >
                      {currentBeat?.id === beat.id && isPlaying ? (
                        <Pause className="w-4 h-4" />
                      ) : (
                        <Play className="w-4 h-4" />
                      )}
                    </Button>
                  </div>

                  {/* Beat Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {beat.isFree && <span className="text-orange-500 text-xs">🔥 FREE</span>}
                      {beat.isExclusive && <span className="text-red-500 text-xs">🔥 EXCLUSIVE</span>}
                      <h3 className="font-medium text-white truncate">
                        {beat.title}
                      </h3>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <span>{beat.producer}</span>
                      <span>•</span>
                      <span>{beat.bpm} BPM</span>
                    </div>
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1 max-w-md">
                    {beat.tags?.slice(0, 4).map((tag) => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className="bg-gray-800 text-gray-400 text-xs"
                      >
                        #{tag}
                      </Badge>
                    ))}
                  </div>

                  {/* Price & Actions */}
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className={`font-bold ${beat.isFree ? 'text-orange-500' : 'text-[#006aff]'}`}>
                        {formatPrice(beat.price, beat.isFree)}
                      </div>
                    </div>

                    <Button variant="ghost" size="sm" className="text-gray-400 hover:text-red-500">
                      <Heart className="w-4 h-4" />
                    </Button>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-gray-400">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem>Add to Cart</DropdownMenuItem>
                        <DropdownMenuItem>Add to Playlist</DropdownMenuItem>
                        <DropdownMenuItem>Share</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
      
      <Footer />
    </div>
  );
}