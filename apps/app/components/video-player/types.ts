export interface VideoPlayerProps {
  src: string;
  autoPlay?: boolean;
  /** Show custom control bar (default: true) */
  controls?: boolean;
  /**
   * When true, show a static thumbnail/preview instead of an interactive player.
   * Use this inside the blog editor (Lexical contenteditable) where iframes and
   * Vidstack's event listeners must not be rendered.
   */
  thumbnailMode?: boolean;
  onPlay?: () => void;
  onPause?: () => void;
  onTimeUpdate?: (time: number) => void;
  onEnded?: () => void;
}
