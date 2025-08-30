import { useEffect, useRef, useState } from "react";

interface AudioVisualizationProps {
  audioRef: React.RefObject<HTMLAudioElement>;
  isPlaying: boolean;
  className?: string;
}

export function AudioVisualization({ audioRef, isPlaying, className = "" }: AudioVisualizationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [dataArray, setDataArray] = useState<Uint8Array | null>(null);

  useEffect(() => {
    if (!audioRef.current) return;

    const initAudioContext = async () => {
      try {
        const audio = audioRef.current;
        if (!audio) return;

        // Create audio context
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const analyserNode = ctx.createAnalyser();
        const source = ctx.createMediaElementSource(audio);

        analyserNode.fftSize = 256;
        const bufferLength = analyserNode.frequencyBinCount;
        const data = new Uint8Array(bufferLength);

        source.connect(analyserNode);
        analyserNode.connect(ctx.destination);

        setAudioContext(ctx);
        setAnalyser(analyserNode);
        setDataArray(data);
      } catch (error) {
        console.error('Failed to initialize audio visualization:', error);
      }
    };

    if (isPlaying) {
      initAudioContext();
    }

    return () => {
      if (audioContext && audioContext.state !== 'closed') {
        audioContext.close();
      }
    };
  }, [audioRef, isPlaying]);

  useEffect(() => {
    if (!analyser || !dataArray || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      if (!analyser || !dataArray) return;

      analyser.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / dataArray.length) * 2.5;
      let barHeight;
      let x = 0;

      for (let i = 0; i < dataArray.length; i++) {
        barHeight = (dataArray[i] / 255) * canvas.height;

        // Create gradient for bars
        const gradient = ctx.createLinearGradient(0, canvas.height - barHeight, 0, canvas.height);
        gradient.addColorStop(0, '#3b82f6');
        gradient.addColorStop(1, '#8b5cf6');

        ctx.fillStyle = gradient;
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);

        x += barWidth + 1;
      }

      if (isPlaying) {
        animationRef.current = requestAnimationFrame(draw);
      }
    };

    if (isPlaying) {
      draw();
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [analyser, dataArray, isPlaying]);

  return (
    <canvas
      ref={canvasRef}
      width={300}
      height={60}
      className={`w-full h-12 ${className}`}
      style={{ background: 'transparent' }}
    />
  );
}