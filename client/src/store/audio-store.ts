import { create } from 'zustand';
import type { Beat } from '@shared/schema';

interface AudioStore {
  currentBeat: Beat | null;
  isPlaying: boolean;
  volume: number;
  currentTime: number;
  duration: number;
  isLoading: boolean;
  
  setCurrentBeat: (beat: Beat | null) => void;
  setIsPlaying: (playing: boolean) => void;
  setVolume: (volume: number) => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setIsLoading: (loading: boolean) => void;
  
  play: (beat?: Beat) => void;
  pause: () => void;
  stop: () => void;
  seek: (time: number) => void;
}

export const useAudioStore = create<AudioStore>((set, get) => ({
  currentBeat: null,
  isPlaying: false,
  volume: 1,
  currentTime: 0,
  duration: 0,
  isLoading: false,
  
  setCurrentBeat: (beat) => set({ currentBeat: beat }),
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  setVolume: (volume) => set({ volume }),
  setCurrentTime: (time) => set({ currentTime: time }),
  setDuration: (duration) => set({ duration }),
  setIsLoading: (loading) => set({ isLoading: loading }),
  
  play: (beat) => {
    const state = get();
    if (beat && beat.id !== state.currentBeat?.id) {
      set({ currentBeat: beat, isPlaying: true });
    } else {
      set({ isPlaying: true });
    }
  },
  
  pause: () => set({ isPlaying: false }),
  
  stop: () => set({ 
    isPlaying: false, 
    currentTime: 0,
    currentBeat: null 
  }),
  
  seek: (time) => set({ currentTime: time }),
}));
