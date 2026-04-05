export function getYouTubeId(src: string): string | null {
  const m = src.match(
    /(?:youtu\.be|youtube|youtube\.com|youtube-nocookie\.com)(?:\/shorts)?\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|)((?:\w|-){11})/
  );
  return m ? m[1] : null;
}

export function getVimeoId(src: string): string | null {
  const m = src.match(/(?:vimeo\.com\/(?:video\/)?)(\d+)/);
  return m ? m[1] : null;
}

export function isHLSorDASH(src: string): boolean {
  return /\.(m3u8|mpd)(\?.*)?$/i.test(src);
}

export function isDirectVideo(src: string): boolean {
  return /\.(mp4|webm|ogg)(\?.*)?$/i.test(src);
}
