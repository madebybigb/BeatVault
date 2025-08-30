import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { StickyPlayer } from "@/components/layout/sticky-player";
import { useGlobalPlayer } from "@/hooks/useGlobalPlayer";

// Import pages
import Landing from "@/pages/landing";
import Home from "@/pages/home";
import Browse from "@/pages/browse";
import UploadBeat from "@/pages/upload-beat";
import Cart from "@/pages/cart";
import ProducerDashboard from "@/pages/producer-dashboard";
import Profile from "@/pages/profile";
import Wishlist from "@/pages/wishlist";
import Collections from "@/pages/collections";
import NotFound from "@/pages/not-found";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();
  const { currentBeat, isPlaying, isVisible, togglePlay, pause, close } = useGlobalPlayer();

  return (
    <Switch>
      {isLoading || !isAuthenticated ? (
        <Route path="/" component={Landing} />
      ) : (
        <>
          <Route path="/" component={Home} />
          <Route path="/browse" component={Browse} />
          <Route path="/upload-beat" component={UploadBeat} />
          <Route path="/cart" component={Cart} />
          <Route path="/producer-dashboard" component={ProducerDashboard} />
          <Route path="/profile/:userId?" component={Profile} />
          <Route path="/wishlist" component={Wishlist} />
          <Route path="/collections" component={Collections} />
          {/* Legacy route support */}
          <Route path="/upload" component={UploadBeat} />
          <Route path="/dashboard" component={ProducerDashboard} />
        </>
      )}
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function AppWithPlayer() {
  const { currentBeat, isPlaying, isVisible, togglePlay, pause, close } = useGlobalPlayer();
  
  return (
    <>
      <Router />
      <StickyPlayer
        isVisible={isVisible}
        currentBeat={currentBeat}
        isPlaying={isPlaying}
        onPlay={togglePlay}
        onPause={pause}
        onClose={close}
      />
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="dark">
          <Toaster />
          <AppWithPlayer />
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
