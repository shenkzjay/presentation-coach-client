import React, { useRef, useEffect, useState } from "react";

interface WaveformProps {
  recordingTime: number;
}

const Waveform: React.FC<WaveformProps> = ({ recordingTime }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [waveformData, setWaveformData] = useState<Uint8Array | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        canvas.width = 400;
        canvas.height = 80;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#155dfc";
        const numBars = recordingTime * 4;
        const barWidth = canvas.width / numBars;
        for (let i = 0; i < numBars; i++) {
          const barHeight = Math.random() * canvas.height * 0.5;
          ctx.fillRect(i * barWidth, canvas.height / 2 - barHeight / 2, barWidth, barHeight);
        }
      }
    }
  }, [recordingTime]);

  return <canvas ref={canvasRef} style={{ width: "100px", height: "40px" }} />;
};

export default Waveform;
