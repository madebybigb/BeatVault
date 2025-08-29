import { useState, useRef, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StickyPlayerProps {
  isVisible: boolean;
  currentBeat: {
    id: string;
    title: string;
    producer: string;
    artworkUrl?: string;
    audioUrl: string;
    beatTagUrl?: string;
  } | null;
  isPlaying: boolean;
  onPlay: () => void;
  onPause: () => void;
  onClose: () => void;
}

export function StickyPlayer({ 
  isVisible, 
  currentBeat, 
  isPlaying, 
  onPlay, 
  onPause, 
  onClose 
}: StickyPlayerProps) {
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [showBeatTag, setShowBeatTag] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const beatTagRef = useRef<HTMLAudioElement>(null);
  const beatTagIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (currentBeat && audioRef.current) {
      audioRef.current.src = currentBeat.audioUrl;
      audioRef.current.load();
    }
  }, [currentBeat]);

  useEffect(() => {
    if (currentBeat?.beatTagUrl && beatTagRef.current) {
      beatTagRef.current.src = currentBeat.beatTagUrl;
      beatTagRef.current.load();
    }
  }, [currentBeat?.beatTagUrl]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', onPause);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', onPause);
    };
  }, [onPause]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  useEffect(() => {
    if (isPlaying && audioRef.current) {
      audioRef.current.play();
      
      // Start beat tag interval if beat tag exists
      if (currentBeat?.beatTagUrl && beatTagRef.current) {
        beatTagIntervalRef.current = setInterval(() => {
          if (beatTagRef.current) {
            beatTagRef.current.currentTime = 0;
            beatTagRef.current.play();
            setShowBeatTag(true);
            setTimeout(() => setShowBeatTag(false), 3000); // Show for 3 seconds
          }
        }, 15000); // Every 15 seconds
      }
    } else {
      audioRef.current?.pause();
      if (beatTagIntervalRef.current) {
        clearInterval(beatTagIntervalRef.current);
        beatTagIntervalRef.current = null;
      }
    }

    return () => {
      if (beatTagIntervalRef.current) {
        clearInterval(beatTagIntervalRef.current);
      }
    };
  }, [isPlaying, currentBeat?.beatTagUrl]);

  const handleSeek = (value: number[]) => {
    if (audioRef.current) {
      audioRef.current.currentTime = value[0];
      setCurrentTime(value[0]);
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (!isVisible || !currentBeat) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-t">
      <Card className="rounded-none border-0 shadow-lg">
        <div className="flex items-center gap-4 p-4">
          {/* Audio elements */}
          <audio ref={audioRef} preload="metadata" />
          {currentBeat.beatTagUrl && (
            <audio ref={beatTagRef} preload="metadata" />
          )}
          
          {/* Beat Info */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <img
              src={currentBeat.artworkUrl || "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=60&h=60&fit=crop"}
              alt={currentBeat.title}
              className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
            />
            <div className="min-w-0 flex-1">
              <p className="font-medium text-sm truncate">{currentBeat.title}</p>
              <p className="text-xs text-muted-foreground truncate">by {currentBeat.producer}</p>
              {showBeatTag && (
                <p className="text-xs text-primary animate-pulse">🎵 Producer Tag Playing</p>
              )}
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
              <SkipBack className="h-4 w-4" />
            </Button>
            
            <Button
              size="sm"
              variant="ghost"
              onClick={isPlaying ? onPause : onPlay}
              className="h-10 w-10 p-0 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isPlaying ? (
                <Pause className="h-5 w-5" />
              ) : (
                <Play className="h-5 w-5 ml-0.5" />
              )}
            </Button>
            
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
              <SkipForward className="h-4 w-4" />
            </Button>
          </div>

          {/* Progress */}
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <span className="text-xs text-muted-foreground w-10 text-right">
              {formatTime(currentTime)}
            </span>
            <Slider
              value={[currentTime]}
              max={duration || 100}
              step={1}
              onValueChange={handleSeek}
              className="flex-1"
            />
            <span className="text-xs text-muted-foreground w-10">
              {formatTime(duration)}
            </span>
          </div>

          {/* Volume */}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={toggleMute}
              className="h-8 w-8 p-0"
            >
              {isMuted ? (
                <VolumeX className="h-4 w-4" />
              ) : (
                <Volume2 className="h-4 w-4" />
              )}
            </Button>
            <Slider
              value={[isMuted ? 0 : volume * 100]}
              max={100}
              step={1}
              onValueChange={(value) => setVolume(value[0] / 100)}
              className="w-20"
            />
          </div>

          {/* Close */}
          <Button
            size="sm"
            variant="ghost"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            ×
          </Button>
        </div>
      </Card>
    </div>
  );
}