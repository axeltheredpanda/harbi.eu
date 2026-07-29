export type NowPlaying = {
  title: string;
  artist: string;
  url: string;
};

/** Defaults until overridden in Settings → site_settings. */
export const nowPlaying: NowPlaying = {
  title: "TODO",
  artist: "TODO",
  url: "https://youtube.com/TODO",
};
