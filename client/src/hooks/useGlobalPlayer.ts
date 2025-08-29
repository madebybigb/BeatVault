import { create } from 'zustand';

interface GlobalPlayerState {
  currentBeat: {
    id: string;
    title: string;
    producer: string;
    artworkUrl?: string;
    audioUrl: string;
    beatTagUrl?: string;
  } | null;
  isPlaying: boolean;
  isVisible: boolean;
  play: (beat: {
    id: string;
    title: string;
    producer: string;
    artworkUrl?: string;
    audioUrl: string;
    beatTagUrl?: string;
  }) => void;
  pause: () => void;
  togglePlay: () => void;
  close: () => void;
}

export const useGlobalPlayer = create<GlobalPlayerState>((set, get) => ({
  currentBeat: null,
  isPlaying: false,
  isVisible: false,
  
  play: (beat) => {
    const { currentBeat, isPlaying } = get();
    
    // If same beat is already playing, just toggle play/pause
    if (currentBeat?.id === beat.id && isPlaying) {
      set({ isPlaying: false });
      return;
    }
    
    // If different beat or paused, start playing
    set({
      currentBeat: beat,
      isPlaying: true,
      isVisible: true,
    });
  },
  
  pause: () => {
    set({ isPlaying: false });
  },
  
  togglePlay: () => {
    const { isPlaying } = get();
    set({ isPlaying: !isPlaying });
  },
  
  close: () => {
    set({
      currentBeat: null,
      isPlaying: false,
      isVisible: false,
    });
  },
}));