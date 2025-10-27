import placeholderData from "./placeholder-images.json";

interface PlaceholderImage {
  id: string;
  description: string;
  imageUrl: string;
  imageHint: string;
}

export const PlaceHolderImages: PlaceholderImage[] = placeholderData.placeholderImages;
