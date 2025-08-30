import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Upload as UploadIcon, Music, ImageIcon, CheckCircle, AlertCircle, Package, Tag } from 'lucide-react';
import { FileUpload } from '@/components/ui/file-upload';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { isUnauthorizedError } from '@/lib/authUtils';
import { insertBeatSchema } from '@shared/schema';
import { z } from 'zod';

const uploadFormSchema = insertBeatSchema.extend({
  tags: z.string().optional(),
  audioUrl: z.string().optional(),
  artworkUrl: z.string().optional(),
  stemsUrl: z.string().optional(),
  beatTagUrl: z.string().optional(),
});

type UploadFormData = z.infer<typeof uploadFormSchema>;

export default function UploadBeat() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [artworkFile, setArtworkFile] = useState<File | null>(null);
  const [stemsFile, setStemsFile] = useState<File | null>(null);
  const [beatTagFile, setBeatTagFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const form = useForm<UploadFormData>({
    resolver: zodResolver(uploadFormSchema),
    defaultValues: {
      title: '',
      description: '',
      audioUrl: '',
      artworkUrl: '',
      stemsUrl: '',
      beatTagUrl: '',
      price: '29.95',
      bpm: 140,
      key: 'C major',
      genre: 'trap',
      mood: 'dark',
      tags: '',
      isExclusive: false,
      isFree: false,
    },
  });

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

  const uploadMutation = useMutation({
    mutationFn: async (data: UploadFormData) => {
      setIsUploading(true);
      try {
        // First, upload files if they exist
        let audioUrl = data.audioUrl;
        let artworkUrl = data.artworkUrl;
        let stemsUrl = data.stemsUrl;
        let beatTagUrl = data.beatTagUrl;
        
        if (audioFile || artworkFile || stemsFile || beatTagFile) {
          const formData = new FormData();
          if (audioFile) formData.append('audio', audioFile);
          if (artworkFile) formData.append('artwork', artworkFile);
          if (stemsFile) formData.append('stems', stemsFile);
          if (beatTagFile) formData.append('beatTag', beatTagFile);
          
          const uploadResponse = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
            credentials: 'include',
          });
          
          if (!uploadResponse.ok) {
            throw new Error('File upload failed');
          }
          
          const uploadResult = await uploadResponse.json();
          if (uploadResult.audioUrl) audioUrl = uploadResult.audioUrl;
          if (uploadResult.artworkUrl) artworkUrl = uploadResult.artworkUrl;
          if (uploadResult.stemsUrl) stemsUrl = uploadResult.stemsUrl;
          if (uploadResult.beatTagUrl) beatTagUrl = uploadResult.beatTagUrl;
        }
        
        const { tags, ...beatData } = data;
        const tagsArray = tags ? tags.split(',').map(tag => tag.trim()).filter(Boolean) : [];
        
        const response = await apiRequest('POST', '/api/beats', {
          ...beatData,
          audioUrl,
          artworkUrl,
          stemsUrl,
          beatTagUrl,
          tags: tagsArray,
          price: parseFloat(data.price),
        });
        return response.json();
      } finally {
        setIsUploading(false);
      }
    },
    onSuccess: () => {
      setAudioFile(null);
      setArtworkFile(null);
      setStemsFile(null);
      setBeatTagFile(null);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ['/api/beats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/user', user?.id, 'beats'] });
      toast({
        title: "Beat uploaded successfully!",
        description: "Your beat has been published and is now available for licensing.",
      });
      form.reset();
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
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
      toast({
        title: "Upload failed",
        description: "Failed to upload your beat. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: UploadFormData) => {
    uploadMutation.mutate(data);
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
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-4 gradient-text" data-testid="text-upload-title">
              Upload Your Beat
            </h1>
            <p className="text-xl text-muted-foreground" data-testid="text-upload-description">
              Share your music with the world and start earning from your beats.
            </p>
          </div>

          {/* Success Message */}
          {uploadMutation.isSuccess && (
            <Card className="mb-8 border-green-500/20 bg-green-500/10">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-6 w-6 text-green-500" />
                  <div>
                    <h3 className="font-semibold text-green-500">Beat Uploaded Successfully!</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Your beat is now live on the marketplace. You can view it in your{' '}
                      <a href="/producer-dashboard" className="text-primary hover:underline">
                        producer dashboard
                      </a>
                      .
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Upload Form */}
            <div className="lg:col-span-2">
              <Card data-testid="card-upload-form">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <UploadIcon className="h-5 w-5" />
                    Beat Details
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                      {/* Basic Information */}
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold">Basic Information</h3>
                        
                        {/* Title */}
                        <FormField
                          control={form.control}
                          name="title"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Title *</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="e.g., Trap Type Beat - Dark Vibes"
                                  {...field}
                                  data-testid="input-beat-title"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {/* Description */}
                        <FormField
                          control={form.control}
                          name="description"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Description</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="Describe your beat, inspiration, or intended use..."
                                  rows={4}
                                  {...field}
                                  value={field.value || ''}
                                  data-testid="textarea-beat-description"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Media Files */}
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold">Media Files</h3>
                        
                        {/* Audio File Upload */}
                        <FormField
                          control={form.control}
                          name="audioUrl"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Audio File *</FormLabel>
                              <FormControl>
                                <div className="space-y-4">
                                  <FileUpload
                                    accept=".mp3,.wav,.flac,.m4a"
                                    onFileChange={(file) => {
                                      setAudioFile(file);
                                      field.onChange(file ? `file:${file.name}` : '');
                                    }}
                                    file={audioFile}
                                    placeholder="Drag and drop your beat file here"
                                    description="MP3, WAV, FLAC, or M4A up to 50MB"
                                  />
                                  <div className="text-xs text-muted-foreground">
                                    <p>OR enter audio URL:</p>
                                  </div>
                                  <div className="relative">
                                    <Music className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input 
                                      placeholder="https://your-audio-host.com/beat.mp3"
                                      className="pl-10"
                                      {...field}
                                      data-testid="input-audio-url"
                                    />
                                  </div>
                                </div>
                              </FormControl>
                              <p className="text-xs text-muted-foreground">
                                Upload an audio file or provide a direct URL.
                              </p>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {/* Artwork Upload */}
                        <FormField
                          control={form.control}
                          name="artworkUrl"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Artwork Image</FormLabel>
                              <FormControl>
                                <div className="space-y-4">
                                  <FileUpload
                                    accept=".jpg,.jpeg,.png,.webp"
                                    onFileChange={(file) => {
                                      setArtworkFile(file);
                                      field.onChange(file ? `file:${file.name}` : '');
                                    }}
                                    file={artworkFile}
                                    placeholder="Drag and drop your artwork here"
                                    description="JPG, PNG, or WebP up to 50MB. Recommended: 1400x1400px"
                                  />
                                  <div className="text-xs text-muted-foreground">
                                    <p>OR enter image URL:</p>
                                  </div>
                                  <div className="relative">
                                    <ImageIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input 
                                      placeholder="https://your-image-host.com/artwork.jpg"
                                      className="pl-10"
                                      {...field}
                                      data-testid="input-artwork-url"
                                    />
                                  </div>
                                </div>
                              </FormControl>
                              <p className="text-xs text-muted-foreground">
                                Upload an image file or provide a direct URL.
                              </p>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {/* Beat Tag Upload */}
                        <FormField
                          control={form.control}
                          name="beatTagUrl"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Beat Tag (Optional)</FormLabel>
                              <FormControl>
                                <div className="space-y-4">
                                  <FileUpload
                                    accept=".mp3,.wav,.flac,.m4a"
                                    onFileChange={(file) => {
                                      setBeatTagFile(file);
                                      field.onChange(file ? `file:${file.name}` : '');
                                    }}
                                    file={beatTagFile}
                                    placeholder="Drag and drop your beat tag here"
                                    description="MP3, WAV, FLAC, or M4A - plays every 15 seconds over preview"
                                  />
                                </div>
                              </FormControl>
                              <p className="text-xs text-muted-foreground">
                                Upload a short audio tag that will play over your beat preview to protect your work.
                              </p>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {/* Stems Upload */}
                        <FormField
                          control={form.control}
                          name="stemsUrl"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Stems Package (Optional)</FormLabel>
                              <FormControl>
                                <div className="space-y-4">
                                  <FileUpload
                                    accept=".zip,.rar"
                                    onFileChange={(file) => {
                                      setStemsFile(file);
                                      field.onChange(file ? `file:${file.name}` : '');
                                    }}
                                    file={stemsFile}
                                    placeholder="Drag and drop your stems package here"
                                    description="ZIP or RAR file up to 1GB containing individual track stems"
                                  />
                                </div>
                              </FormControl>
                              <p className="text-xs text-muted-foreground">
                                Upload a compressed package containing individual instrument tracks (drums, melody, bass, etc.).
                              </p>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Pricing & Details */}
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold">Pricing & Details</h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Price */}
                          <FormField
                            control={form.control}
                            name="price"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Price ($) *</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    placeholder="29.95"
                                    {...field}
                                    data-testid="input-beat-price"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          {/* BPM */}
                          <FormField
                            control={form.control}
                            name="bpm"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>BPM *</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number"
                                    min="60"
                                    max="200"
                                    placeholder="140"
                                    {...field}
                                    onChange={(e) => field.onChange(parseInt(e.target.value))}
                                    data-testid="input-beat-bpm"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Key */}
                          <FormField
                            control={form.control}
                            name="key"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Key *</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger data-testid="select-beat-key">
                                      <SelectValue placeholder="Select key" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="C major">C major</SelectItem>
                                    <SelectItem value="C minor">C minor</SelectItem>
                                    <SelectItem value="D major">D major</SelectItem>
                                    <SelectItem value="D minor">D minor</SelectItem>
                                    <SelectItem value="E major">E major</SelectItem>
                                    <SelectItem value="E minor">E minor</SelectItem>
                                    <SelectItem value="F major">F major</SelectItem>
                                    <SelectItem value="F minor">F minor</SelectItem>
                                    <SelectItem value="G major">G major</SelectItem>
                                    <SelectItem value="G minor">G minor</SelectItem>
                                    <SelectItem value="A major">A major</SelectItem>
                                    <SelectItem value="A minor">A minor</SelectItem>
                                    <SelectItem value="B major">B major</SelectItem>
                                    <SelectItem value="B minor">B minor</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          {/* Genre */}
                          <FormField
                            control={form.control}
                            name="genre"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Genre *</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger data-testid="select-beat-genre">
                                      <SelectValue placeholder="Select genre" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="trap">Trap</SelectItem>
                                    <SelectItem value="drill">Drill</SelectItem>
                                    <SelectItem value="hip-hop">Hip Hop</SelectItem>
                                    <SelectItem value="r&b">R&B</SelectItem>
                                    <SelectItem value="pop">Pop</SelectItem>
                                    <SelectItem value="electronic">Electronic</SelectItem>
                                    <SelectItem value="reggaeton">Reggaeton</SelectItem>
                                    <SelectItem value="afrobeat">Afrobeat</SelectItem>
                                    <SelectItem value="rock">Rock</SelectItem>
                                    <SelectItem value="country">Country</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        {/* Mood */}
                        <FormField
                          control={form.control}
                          name="mood"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Mood *</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-beat-mood">
                                    <SelectValue placeholder="Select mood" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="dark">Dark</SelectItem>
                                  <SelectItem value="melodic">Melodic</SelectItem>
                                  <SelectItem value="aggressive">Aggressive</SelectItem>
                                  <SelectItem value="chill">Chill</SelectItem>
                                  <SelectItem value="upbeat">Upbeat</SelectItem>
                                  <SelectItem value="emotional">Emotional</SelectItem>
                                  <SelectItem value="energetic">Energetic</SelectItem>
                                  <SelectItem value="romantic">Romantic</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {/* Tags */}
                        <FormField
                          control={form.control}
                          name="tags"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Tags</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="e.g., gunna, lil baby, melodic (comma separated)"
                                  {...field}
                                  data-testid="input-beat-tags"
                                />
                              </FormControl>
                              <p className="text-xs text-muted-foreground">
                                Add tags to help people discover your beat. Separate with commas.
                              </p>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Options */}
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold">Options</h3>
                        
                        <div className="flex items-center space-x-6">
                          <FormField
                            control={form.control}
                            name="isFree"
                            render={({ field }) => (
                              <FormItem className="flex items-center space-x-2">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value || false}
                                    onCheckedChange={field.onChange}
                                    data-testid="checkbox-is-free"
                                  />
                                </FormControl>
                                <FormLabel className="!mt-0">Free download</FormLabel>
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="isExclusive"
                            render={({ field }) => (
                              <FormItem className="flex items-center space-x-2">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value || false}
                                    onCheckedChange={field.onChange}
                                    data-testid="checkbox-is-exclusive"
                                  />
                                </FormControl>
                                <FormLabel className="!mt-0">Exclusive license only</FormLabel>
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>

                      <Button 
                        type="submit" 
                        disabled={uploadMutation.isPending || isUploading}
                        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-6 text-lg"
                        data-testid="button-upload-submit"
                      >
                        {uploadMutation.isPending || isUploading ? (
                          <>
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3" />
                            {isUploading ? 'Uploading Files...' : 'Publishing Beat...'}
                          </>
                        ) : (
                          <>
                            <UploadIcon className="h-5 w-5 mr-3" />
                            Upload Beat
                          </>
                        )}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </div>

            {/* Tips Sidebar */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Upload Tips</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Music className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <h4 className="font-medium">Audio Quality</h4>
                      <p className="text-sm text-muted-foreground">
                        Upload high-quality audio files (WAV or MP3 320kbps) for the best listening experience.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <ImageIcon className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <h4 className="font-medium">Artwork</h4>
                      <p className="text-sm text-muted-foreground">
                        Add eye-catching artwork. Square images (1400x1400px) work best for beat covers.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <h4 className="font-medium">Pricing Strategy</h4>
                      <p className="text-sm text-muted-foreground">
                        Research similar beats to set competitive pricing. Consider offering some free beats to build your audience.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Need Help?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    New to selling beats? Check out our producer guide for tips on creating successful listings.
                  </p>
                  <Button variant="outline" className="w-full" asChild>
                    <a href="/producer-dashboard">
                      View Dashboard
                    </a>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
