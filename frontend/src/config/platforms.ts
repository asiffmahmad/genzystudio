export interface PlatformCapabilities {
  supportsText: boolean;
  supportsImages: boolean;
  supportsVideos: boolean;
  supportsLinks: boolean;
  supportsMultipleImages: boolean;
  supportsHashtags: boolean;
  characterLimit: number | null;
}

export const PLATFORM_CAPABILITIES: Record<string, PlatformCapabilities> = {
  LinkedIn: {
    supportsText: true,
    supportsImages: true,
    supportsVideos: true,
    supportsLinks: true,
    supportsMultipleImages: true,
    supportsHashtags: true,
    characterLimit: 3000,
  },
  X: {
    supportsText: true,
    supportsImages: true,
    supportsVideos: true,
    supportsLinks: true,
    supportsMultipleImages: true,
    supportsHashtags: true,
    characterLimit: 280,
  },
  Instagram: {
    supportsText: true,
    supportsImages: true,
    supportsVideos: true,
    supportsLinks: false, // Generally not clickable in captions
    supportsMultipleImages: true,
    supportsHashtags: true,
    characterLimit: 2200,
  },
  Facebook: {
    supportsText: true,
    supportsImages: true,
    supportsVideos: true,
    supportsLinks: true,
    supportsMultipleImages: true,
    supportsHashtags: true,
    characterLimit: 63206,
  },
};
