import { recommendationService } from "./recommendationService";

interface SpotifyTrack {
  id: string;
  name: string;
  artists: Array<{ name: string }>;
  album: {
    name: string;
    images: Array<{ url: string; height: number; width: number }>;
  };
  duration_ms: number;
  preview_url: string | null;
  external_urls: {
    spotify: string;
  };
  audio_features?: {
    danceability: number;
    energy: number;
    key: number;
    loudness: number;
    mode: number;
    speechiness: number;
    acousticness: number;
    instrumentalness: number;
    liveness: number;
    valence: number;
    tempo: number;
    time_signature: number;
  };
}

interface SpotifyPlaylist {
  id: string;
  name: string;
  description: string;
  tracks: {
    items: Array<{
      track: SpotifyTrack;
    }>;
  };
  external_urls: {
    spotify: string;
  };
}

export class SpotifyService {
  private clientId: string;
  private clientSecret: string;
  private accessToken: string | null = null;
  private tokenExpiry: Date | null = null;

  constructor() {
    this.clientId = process.env.SPOTIFY_CLIENT_ID || '';
    this.clientSecret = process.env.SPOTIFY_CLIENT_SECRET || '';
  }

  private async getAccessToken(): Promise<string> {
    if (this.accessToken && this.tokenExpiry && this.tokenExpiry > new Date()) {
      return this.accessToken!;
    }

    try {
      const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': 'Basic ' + Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')
        },
        body: 'grant_type=client_credentials'
      });

      if (!response.ok) {
        throw new Error('Failed to get Spotify access token');
      }

      const data = await response.json();
      this.accessToken = data.access_token;
      this.tokenExpiry = new Date(Date.now() + (data.expires_in * 1000));

      return this.accessToken;
    } catch (error) {
      console.error('Spotify authentication error:', error);
      throw new Error('Failed to authenticate with Spotify');
    }
  }

  async searchTracks(query: string, limit: number = 20): Promise<SpotifyTrack[]> {
    try {
      const token = await this.getAccessToken();

      const response = await fetch(
        `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=${limit}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to search Spotify tracks');
      }

      const data = await response.json();
      return data.tracks.items;
    } catch (error) {
      console.error('Spotify search error:', error);
      return [];
    }
  }

  async getTrackAudioFeatures(trackId: string): Promise<SpotifyTrack['audio_features']> {
    try {
      const token = await this.getAccessToken();

      const response = await fetch(
        `https://api.spotify.com/v1/audio-features/${trackId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to get track audio features');
      }

      return await response.json();
    } catch (error) {
      console.error('Spotify audio features error:', error);
      return undefined;
    }
  }

  async getRecommendations(
    seedGenres: string[] = [],
    seedTracks: string[] = [],
    targetAttributes: {
      danceability?: number;
      energy?: number;
      valence?: number;
      tempo?: number;
    } = {},
    limit: number = 20
  ): Promise<SpotifyTrack[]> {
    try {
      const token = await this.getAccessToken();

      const params = new URLSearchParams({
        limit: limit.toString(),
        ...(seedGenres.length > 0 && { seed_genres: seedGenres.join(',') }),
        ...(seedTracks.length > 0 && { seed_tracks: seedTracks.join(',') }),
        ...Object.fromEntries(
          Object.entries(targetAttributes).map(([key, value]) => [`target_${key}`, value.toString()])
        )
      });

      const response = await fetch(
        `https://api.spotify.com/v1/recommendations?${params}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to get Spotify recommendations');
      }

      const data = await response.json();
      return data.tracks;
    } catch (error) {
      console.error('Spotify recommendations error:', error);
      return [];
    }
  }

  async getSimilarBeats(beatGenre: string, beatMood: string, bpm: number): Promise<SpotifyTrack[]> {
    try {
      // Convert beat attributes to Spotify-compatible parameters
      const seedGenres = [beatGenre.toLowerCase()];
      const targetAttributes = {
        tempo: bpm,
        danceability: beatMood.toLowerCase().includes('happy') || beatMood.toLowerCase().includes('upbeat') ? 0.7 : 0.4,
        energy: beatMood.toLowerCase().includes('energetic') || beatMood.toLowerCase().includes('intense') ? 0.8 : 0.5,
        valence: beatMood.toLowerCase().includes('happy') || beatMood.toLowerCase().includes('positive') ? 0.8 : 0.4
      };

      return await this.getRecommendations(seedGenres, [], targetAttributes, 10);
    } catch (error) {
      console.error('Get similar beats error:', error);
      return [];
    }
  }

  async createPlaylistFromBeats(
    userId: string,
    beatIds: string[],
    playlistName: string,
    description: string = ''
  ): Promise<{ spotifyUrl: string; playlistId: string } | null> {
    // Note: This would require user authentication with Spotify
    // For now, we'll return a placeholder implementation
    console.log('Creating Spotify playlist:', { userId, beatIds, playlistName, description });

    // In a real implementation, you would:
    // 1. Use Spotify Web API to create a playlist
    // 2. Add tracks to the playlist
    // 3. Return the playlist URL

    return {
      spotifyUrl: `https://open.spotify.com/playlist/placeholder`,
      playlistId: 'placeholder'
    };
  }

  async shareToSpotify(trackUrl: string): Promise<string> {
    // Generate a shareable Spotify link
    // This could be enhanced to create a Spotify playlist or use Spotify's sharing features
    return trackUrl;
  }
}

export const spotifyService = new SpotifyService();