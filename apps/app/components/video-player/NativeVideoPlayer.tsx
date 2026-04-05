'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import type { VideoPlayerProps } from './types';
import { Pause, Play } from 'lucide-react';

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function NativeVideoPlayer({
  src,
  autoPlay,
  controls = true,
  onPlay,
  onPause,
  onTimeUpdate,
  onEnded,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play();
    } else {
      v.pause();
    }
  }, []);

  const seekTo = useCallback((time: number) => {
    if (videoRef.current) videoRef.current.currentTime = time;
  }, []);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const handlePlay = () => { setPlaying(true); onPlay?.(); };
    const handlePause = () => { setPlaying(false); onPause?.(); };
    const handleTimeUpdate = () => {
      setCurrentTime(v.currentTime);
      onTimeUpdate?.(v.currentTime);
    };
    const handleDurationChange = () => setDuration(v.duration || 0);
    const handleEnded = () => { setPlaying(false); onEnded?.(); };

    v.addEventListener('play', handlePlay);
    v.addEventListener('pause', handlePause);
    v.addEventListener('timeupdate', handleTimeUpdate);
    v.addEventListener('durationchange', handleDurationChange);
    v.addEventListener('ended', handleEnded);
    return () => {
      v.removeEventListener('play', handlePlay);
      v.removeEventListener('pause', handlePause);
      v.removeEventListener('timeupdate', handleTimeUpdate);
      v.removeEventListener('durationchange', handleDurationChange);
      v.removeEventListener('ended', handleEnded);
    };
  }, [onPlay, onPause, onTimeUpdate, onEnded]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <video
        ref={videoRef}
        src={src}
        autoPlay={autoPlay}
        style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
      />

      {controls && (
        <div
          className="absolute bottom-0 left-0 right-0 flex items-center gap-2 px-3 py-2"
          style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.6), transparent)' }}
        >
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={togglePlay}
            className="h-7 w-7 flex items-center justify-center rounded-md text-white/90 hover:text-white transition-colors flex-shrink-0"
          >
            {playing ? <Pause size={15} fill="currentColor" /> : <Play size={15} fill="currentColor" />}
          </button>

          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.1}
            value={currentTime}
            onMouseDown={(e) => e.stopPropagation()}
            onChange={(e) => seekTo(Number(e.target.value))}
            className="flex-1 h-1 accent-white cursor-pointer"
          />

          <span className="text-xs tabular-nums text-white/90 flex-shrink-0">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>
      )}
    </div>
  );
}
