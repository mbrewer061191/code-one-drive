
// FIX: Removed reference to "vite/client" as it was causing a type resolution error and does not appear to be used.

// Ensures process.env access doesn't fail TS check
// FIX: Commented out conflicting declaration. 'process' should be provided by environment types or @types/node.
/*
declare var process: {
  env: {
    [key: string]: string | undefined;
  }
};
*/

// FIX: Add type definitions for the ImageCapture API which is not always present in default TS libs.
// This resolves "Cannot find name 'ImageCapture'" errors.
interface ImageCapture {
  takePhoto(photoSettings?: object): Promise<Blob>;
  getPhotoCapabilities(): Promise<any>;
  getPhotoSettings(): Promise<any>;
  grabFrame(): Promise<ImageBitmap>;
  readonly track: MediaStreamTrack;
}

declare var ImageCapture: {
  prototype: ImageCapture;
  new (videoTrack: MediaStreamTrack): ImageCapture;
};

// FIX: Augment MediaTrackCapabilities to include non-standard 'zoom' and 'torch' properties.
// This resolves "Property 'zoom' does not exist" and "Property 'torch' does not exist" errors.
interface MediaTrackCapabilities {
    zoom?: {
        max: number;
        min: number;
        step: number;
    };
    torch?: boolean;
}
