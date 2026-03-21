'use client';

import React from 'react';
import {
  MediaPlayer,
  MediaProvider,
  PlayButton,
  Time,
  TimeSlider,
  useMediaState,
} from '@vidstack/react';
import '@vidstack/react/player/styles/base.css';
import type { VideoPlayerProps } from './types';
import { Pause, Play } from 'lucide-react';

// million-ignore
export function VidstackPlayer({
  src,
  autoPlay,
  controls = true,
  onPlay,
  onPause,
  onTimeUpdate,
  onEnded,
}: VideoPlayerProps) {
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <MediaPlayer
        src={src}
        autoPlay={autoPlay}
        style={{ width: '100%', height: '100%' }}
        onPlay={onPlay}
        onPause={onPause}
        onTimeUpdate={onTimeUpdate ? (detail) => onTimeUpdate(detail.currentTime) : undefined}
        onEnded={onEnded}
      >
        <MediaProvider />
        {controls && <PlayerControls />}
      </MediaPlayer>
    </div>
  );
}

function PlayerControls() {
  const paused = useMediaState('paused');
  const ended = useMediaState('ended');

  return (
    <div
      className="absolute bottom-0 left-0 right-0 flex items-center gap-2 px-3 py-2"
      style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.6), transparent)' }}
    >
      <PlayButton
        onMouseDown={(e) => e.preventDefault()}
        className="h-7 w-7 flex items-center justify-center rounded-md text-white/90 hover:text-white transition-colors flex-shrink-0"
      >
        {paused || ended ? (
          <Play size={15} fill="currentColor" />
        ) : (
          <Pause size={15} fill="currentColor" />
        )}
      </PlayButton>

      <TimeSlider.Root
        onMouseDown={(e) => e.stopPropagation()}
        className="flex-1 h-4 flex items-center group/slider relative"
      >
        <TimeSlider.Track className="relative h-1 w-full rounded-full bg-white/30">
          <TimeSlider.TrackFill className="absolute h-full rounded-full bg-white" />
          <TimeSlider.Progress className="absolute h-full rounded-full bg-white/50" />
        </TimeSlider.Track>
        <TimeSlider.Thumb className="absolute w-3 h-3 rounded-full bg-white opacity-0 group-hover/slider:opacity-100 transition-opacity" />
      </TimeSlider.Root>

      <div className="text-xs tabular-nums text-white/90 flex-shrink-0 flex items-center gap-1">
        <Time type="current" className="text-white/90" />
        <span>/</span>
        <Time type="duration" className="text-white/90" />
      </div>
    </div>
  );
}
