import { useState, useRef, useEffect, useCallback } from "react";
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Download, Heart, Share, Repeat, Shuffle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";

interface MobileAudioPlayerProps {
  beatId: string;
  title: string;
  producer: string;
  audioUrl: string;
  isLiked: boolean;
  onLikeToggle: () => void;
  onNext?: () => void;
  onPrevious?: () => void;
  showNextPrev?: boolean;
}

export function MobileAudioPlayer({
  beatId,
  title,
  producer,
  audioUrl,
  isLiked,
  onLikeToggle,
  onNext,
  onPrevious,
  showNextPrev = false
}: MobileAudioPlayerProps) {
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const audioRef = useRef<HTMLAudioElement>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);

  // Touch gesture states
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [touchEnd, setTouchEnd] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // PWA offline cache mutations
  const cacheBeatMutation = useMutation({
    mutationFn: async ({ beatId, audioUrl, cacheSize }: { beatId: string; audioUrl: string; cacheSize: number }) => {
      return await apiRequest(`/api/offline/cache/${beatId}`, {
        method: 'POST',
        body: JSON.stringify({ audioUrl, cacheSize })
      });
    },
    onSuccess: () => {
      toast({
        title: "Beat cached",
        description: "Beat is now available offline",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/offline/cache'] });
    },
    onError: () => {
      toast({
        title: "Cache failed",
        description: "Could not cache beat for offline use",
        variant: "destructive",
      });
    }
  });

  // Share functionality
  const shareBeat = useCallback(async () => {
    try {
      const response = await fetch(`/api/beat/${beatId}/share`);
      const shareData = await response.json();

      if (navigator.share) {
        await navigator.share({
          title: shareData.title,
          text: shareData.text,
          url: shareData.url
        });
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(shareData.url);
        toast({
          title: "Link copied",
          description: "Beat link copied to clipboard",
        });
      }
    } catch (error) {
      toast({
        title: "Share failed",
        description: "Could not share this beat",
        variant: "destructive",
      });
    }
  }, [beatId, toast]);

  // Audio event handlers
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedData = () => {
      setDuration(audio.duration);
      setIsLoading(false);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      if (isRepeat) {
        audio.currentTime = 0;
        audio.play();
      } else {
        setIsPlaying(false);
        if (onNext && !isShuffle) {
          onNext();
        }
      }
    };

    const handleLoadStart = () => {
      setIsLoading(true);
    };

    const handleCanPlay = () => {
      setIsLoading(false);
    };

    audio.addEventListener('loadeddata', handleLoadedData);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('loadstart', handleLoadStart);
    audio.addEventListener('canplay', handleCanPlay);

    return () => {
      audio.removeEventListener('loadeddata', handleLoadedData);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('loadstart', handleLoadStart);
      audio.removeEventListener('canplay', handleCanPlay);
    };
  }, [isRepeat, onNext, isShuffle]);

  // Touch gesture handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY
    });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY
    });
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distanceX = touchStart.x - touchEnd.x;
    const distanceY = touchStart.y - touchEnd.y;
    const isLeftSwipe = distanceX > 50;
    const isRightSwipe = distanceX < -50;
    const isVerticalSwipe = Math.abs(distanceY) > Math.abs(distanceX);

    if (!isVerticalSwipe) {
      if (isLeftSwipe && onNext) {
        onNext();
      } else if (isRightSwipe && onPrevious) {
        onPrevious();
      }
    }
  };

  // Playback controls
  const togglePlayPause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().catch(() => {
        toast({
          title: "Playback failed",
          description: "Could not play this beat",
          variant: "destructive",
        });
      });
      setIsPlaying(true);
    }
  }, [isPlaying, toast]);

  const handleSeek = (value: number[]) => {
    const audio = audioRef.current;
    if (!audio) return;
    
    const newTime = (value[0] / 100) * duration;
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleVolumeChange = (value: number[]) => {
    const audio = audioRef.current;
    if (!audio) return;
    
    const newVolume = value[0] / 100;
    audio.volume = newVolume;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  const toggleMute = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isMuted) {
      audio.volume = volume;
      setIsMuted(false);
    } else {
      audio.volume = 0;
      setIsMuted(true);
    }
  };

  const skip = (seconds: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    
    const newTime = Math.max(0, Math.min(duration, currentTime + seconds));
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleDownload = () => {
    if (!isAuthenticated) {
      toast({
        title: "Login required",
        description: "Please log in to download beats",
        variant: "destructive",
      });
      return;
    }

    // Estimate cache size (3MB average for a beat)
    const estimatedSize = 3 * 1024 * 1024;
    cacheBeatMutation.mutate({ beatId, audioUrl, cacheSize: estimatedSize });
  };

  return (
    <div 
      className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 to-black/80 backdrop-blur-lg border-t border-white/10 p-4 z-50"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      data-testid="mobile-audio-player"
    >
      <audio
        ref={audioRef}
        src={audioUrl}
        preload="metadata"
      />
      
      {/* Track info */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-white font-semibold text-sm truncate" data-testid="track-title">
            {title}
          </h3>
          <p className="text-gray-400 text-xs truncate" data-testid="track-producer">
            {producer}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={onLikeToggle}
            className="p-2 h-8 w-8 text-white hover:bg-white/10"
            data-testid="button-like"
          >
            <Heart className={`h-4 w-4 ${isLiked ? 'fill-red-500 text-red-500' : ''}`} />
          </Button>
          
          <Button
            size="sm"
            variant="ghost"
            onClick={shareBeat}
            className="p-2 h-8 w-8 text-white hover:bg-white/10"
            data-testid="button-share"
          >
            <Share className="h-4 w-4" />
          </Button>
          
          <Button
            size="sm"
            variant="ghost"
            onClick={handleDownload}
            disabled={cacheBeatMutation.isPending}
            className="p-2 h-8 w-8 text-white hover:bg-white/10"
            data-testid="button-download"
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-4">
        <Slider
          value={[duration ? (currentTime / duration) * 100 : 0]}
          onValueChange={handleSeek}
          max={100}
          step={0.1}
          className="w-full"
          data-testid="progress-slider"
        />
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span data-testid="current-time">{formatTime(currentTime)}</span>
          <span data-testid="total-time">{formatTime(duration)}</span>
        </div>
      </div>

      {/* Main controls */}
      <div className="flex items-center justify-center gap-6 mb-3">
        {showNextPrev && (
          <Button
            size="sm"
            variant="ghost"
            onClick={onPrevious}
            disabled={!onPrevious}
            className="p-2 h-10 w-10 text-white hover:bg-white/10"
            data-testid="button-previous"
          >
            <SkipBack className="h-5 w-5" />
          </Button>
        )}

        <Button
          size="sm"
          variant="ghost"
          onClick={() => skip(-10)}
          className="p-2 h-10 w-10 text-white hover:bg-white/10"
          data-testid="button-skip-back"
        >
          <span className="text-xs font-bold">-10</span>
        </Button>

        <Button
          size="lg"
          variant="default"
          onClick={togglePlayPause}
          disabled={isLoading}
          className="h-12 w-12 rounded-full bg-blue-600 hover:bg-blue-700 text-white"
          data-testid="button-play-pause"
        >
          {isLoading ? (
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent" />
          ) : isPlaying ? (
            <Pause className="h-6 w-6" />
          ) : (
            <Play className="h-6 w-6 ml-0.5" />
          )}
        </Button>

        <Button
          size="sm"
          variant="ghost"
          onClick={() => skip(30)}
          className="p-2 h-10 w-10 text-white hover:bg-white/10"
          data-testid="button-skip-forward"
        >
          <span className="text-xs font-bold">+30</span>
        </Button>

        {showNextPrev && (
          <Button
            size="sm"
            variant="ghost"
            onClick={onNext}
            disabled={!onNext}
            className="p-2 h-10 w-10 text-white hover:bg-white/10"
            data-testid="button-next"
          >
            <SkipForward className="h-5 w-5" />
          </Button>
        )}
      </div>

      {/* Secondary controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsShuffle(!isShuffle)}
            className={`p-2 h-8 w-8 hover:bg-white/10 ${isShuffle ? 'text-blue-400' : 'text-white'}`}
            data-testid="button-shuffle"
          >
            <Shuffle className="h-4 w-4" />
          </Button>
          
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsRepeat(!isRepeat)}
            className={`p-2 h-8 w-8 hover:bg-white/10 ${isRepeat ? 'text-blue-400' : 'text-white'}`}
            data-testid="button-repeat"
          >
            <Repeat className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2 flex-1 max-w-32">
          <Button
            size="sm"
            variant="ghost"
            onClick={toggleMute}
            className="p-2 h-8 w-8 text-white hover:bg-white/10"
            data-testid="button-mute"
          >
            {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </Button>
          
          <Slider
            value={[isMuted ? 0 : volume * 100]}
            onValueChange={handleVolumeChange}
            max={100}
            step={1}
            className="flex-1"
            data-testid="volume-slider"
          />
        </div>
      </div>
    </div>
  );
}