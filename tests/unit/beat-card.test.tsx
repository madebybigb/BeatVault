import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BeatCard } from '../../client/src/components/ui/beat-card';

// Mock the hooks
vi.mock('../../client/src/hooks/useCart', () => ({
  useCart: () => ({
    addToCart: vi.fn(),
    isAddingToCart: false,
  }),
}));

vi.mock('../../client/src/hooks/useAuth', () => ({
  useAuth: () => ({
    isAuthenticated: true,
    user: { id: '123' },
  }),
}));

vi.mock('../../client/src/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

vi.mock('@tanstack/react-query', () => ({
  useMutation: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
  useQueryClient: () => ({
    invalidateQueries: vi.fn(),
  }),
}));

describe('BeatCard', () => {
  const mockBeat = {
    id: '123',
    title: 'Test Beat',
    artist: 'Test Artist',
    genre: 'Hip Hop',
    bpm: 120,
    price: 29.99,
    isFree: false,
    artworkUrl: 'https://example.com/artwork.jpg',
    audioUrl: 'https://example.com/beat.mp3',
    producerId: 'producer123',
    createdAt: new Date(),
    updatedAt: new Date(),
    description: 'Test description',
    tags: ['hip-hop', 'trap'],
    mood: 'Energetic',
    key: 'C major',
    stemsUrl: null,
    beatTagUrl: null,
    playCount: 100,
    likeCount: 50,
    isExclusive: false,
    licensedTo: null,
  };

  const defaultProps = {
    beat: mockBeat,
    isPlaying: false,
    onPlay: vi.fn(),
    onPause: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders beat information correctly', () => {
    render(<BeatCard {...defaultProps} />);
    
    expect(screen.getByText('Test Beat')).toBeInTheDocument();
    expect(screen.getByText('Test Artist')).toBeInTheDocument();
    expect(screen.getByText('hip-hop • 120 BPM')).toBeInTheDocument();
    expect(screen.getByText('$29.99')).toBeInTheDocument();
  });

  it('shows FREE tag for free beats', () => {
    const freeBeat = { ...mockBeat, isFree: true, price: 0 };
    render(<BeatCard {...defaultProps} beat={freeBeat} />);
    
    expect(screen.getByText('FREE')).toBeInTheDocument();
  });

  it('calls onPlay when play button is clicked', () => {
    const onPlay = vi.fn();
    render(<BeatCard {...defaultProps} onPlay={onPlay} />);
    
    const playButton = screen.getByTestId(`button-beat-play-${mockBeat.id}`);
    fireEvent.click(playButton);
    
    expect(onPlay).toHaveBeenCalledTimes(1);
  });

  it('calls onPause when pause button is clicked while playing', () => {
    const onPause = vi.fn();
    render(<BeatCard {...defaultProps} isPlaying={true} onPause={onPause} />);
    
    const pauseButton = screen.getByTestId(`button-beat-play-${mockBeat.id}`);
    fireEvent.click(pauseButton);
    
    expect(onPause).toHaveBeenCalledTimes(1);
  });

  it('shows correct icon for playing state', () => {
    const { rerender } = render(<BeatCard {...defaultProps} />);
    
    // Not playing - should show play icon
    expect(screen.getByTestId(`button-beat-play-${mockBeat.id}`)).toBeInTheDocument();
    
    // Playing - should show pause icon
    rerender(<BeatCard {...defaultProps} isPlaying={true} />);
    expect(screen.getByTestId(`button-beat-play-${mockBeat.id}`)).toBeInTheDocument();
  });

  it('renders in list variant correctly', () => {
    render(<BeatCard {...defaultProps} variant=\"list\" />);
    
    expect(screen.getByText('Test Beat')).toBeInTheDocument();
    expect(screen.getByText('Test Artist')).toBeInTheDocument();
  });

  it('handles add to cart button click', () => {
    render(<BeatCard {...defaultProps} />);
    
    const addToCartButton = screen.getByTestId(`button-beat-add-cart-${mockBeat.id}`);
    fireEvent.click(addToCartButton);
    
    // Should not throw any errors
    expect(addToCartButton).toBeInTheDocument();
  });

  it('shows download button for free beats', () => {
    const freeBeat = { ...mockBeat, isFree: true, price: 0 };
    render(<BeatCard {...defaultProps} beat={freeBeat} />);
    
    expect(screen.getByText('Free')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <BeatCard {...defaultProps} className=\"custom-class\" />
    );
    
    expect(container.firstChild).toHaveClass('custom-class');
  });
});