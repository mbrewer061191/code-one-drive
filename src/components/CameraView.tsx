
import React, { useState, useEffect, useRef } from 'react';
import { PhotoWithMeta } from '../types';

interface CameraViewProps {
    mode: 'single-case' | 'patrol';
    onCancel?: () => void;
    onDone?: (photos: PhotoWithMeta[]) => void;
    onSaveSet?: (photos: PhotoWithMeta[]) => void;
    onFinishPatrol?: (photos: PhotoWithMeta[]) => void;
}

const CameraView: React.FC<CameraViewProps> = ({ mode, onCancel, onDone, onSaveSet, onFinishPatrol }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [imageCapture, setImageCapture] = useState<ImageCapture | null>(null);
    const [capturedPhotos, setCapturedPhotos] = useState<PhotoWithMeta[]>([]);
    
    const [zoom, setZoom] = useState(1);
    const [zoomCapabilities, setZoomCapabilities] = useState<{min: number, max: number, step: number} | null>(null);
    const [torch, setTorch] = useState(false);
    const [torchAvailable, setTorchAvailable] = useState(false);

    useEffect(() => {
        let activeStream: MediaStream | null = null;
        
        const videoConstraints: MediaStreamConstraints = {
            video: {
                facingMode: 'environment',
                width: { ideal: 4032 }, 
                height: { ideal: 3024 },
            },
            audio: false
        };

        navigator.mediaDevices.getUserMedia(videoConstraints)
            .then(mediaStream => {
                activeStream = mediaStream;
                setStream(mediaStream);
                if (videoRef.current) {
                    videoRef.current.srcObject = mediaStream;
                    videoRef.current.play().catch(e => console.warn("Video play failed", e));
                }
                const track = mediaStream.getVideoTracks()[0];
                
                if (typeof ImageCapture !== 'undefined') {
                    setImageCapture(new ImageCapture(track));
                }

                const capabilities = track.getCapabilities();
                if (capabilities.zoom) {
                    setZoomCapabilities({
                        min: capabilities.zoom.min || 1,
                        max: capabilities.zoom.max || 10,
                        step: capabilities.zoom.step || 0.1,
                    });
                    setZoom(capabilities.zoom.min || 1);
                } else {
                    // Fallback capabilities for digital zoom
                    setZoomCapabilities({ min: 1, max: 4, step: 0.1 });
                }

                if (capabilities.torch) {
                    setTorchAvailable(true);
                }
            })
            .catch(err => {
                console.error("Could not access camera.", err);
                alert("Could not access camera. Make sure you have given permission and aren't using the camera in another app.");
                if (onCancel) onCancel();
            });
            
        return () => { activeStream?.getTracks().forEach(track => track.stop()); };
    }, [onCancel]);
    
    useEffect(() => {
        if (!stream) return;
        const track = stream.getVideoTracks()[0];
        const caps = track.getCapabilities();
        
        if (caps.zoom) {
            (track as any).applyConstraints({ advanced: [{ zoom: zoom }] }).catch((e: any) => {
                console.warn("Hardware zoom failed, using digital fallback", e);
                if (videoRef.current) videoRef.current.style.transform = `scale(${zoom})`;
            });
        } else if (videoRef.current) {
            videoRef.current.style.transform = `scale(${zoom})`;
        }
    }, [zoom, stream]);

    useEffect(() => {
        if (!stream || !torchAvailable) return;
        const track = stream.getVideoTracks()[0];
        (track as any).applyConstraints({ advanced: [{ torch: torch }] }).catch((e: any) => console.warn("Could not apply torch", e));
    }, [torch, stream, torchAvailable]);

    const addTimestampToBlob = (blob: Blob): Promise<Blob> => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            const url = URL.createObjectURL(blob);
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    URL.revokeObjectURL(url);
                    return reject(new Error('Could not get canvas context'));
                }

                ctx.drawImage(img, 0, 0);

                const timestamp = new Date().toLocaleString('en-US', {
                    year: 'numeric', month: 'short', day: 'numeric',
                    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true,
                });
                
                const fontSize = Math.max(24, Math.min(96, Math.round(img.width * 0.03))); 
                const padding = fontSize * 0.5;
                ctx.font = `bold ${fontSize}px 'Roboto', sans-serif`;
                ctx.textAlign = 'right';
                ctx.textBaseline = 'bottom';

                const textMetrics = ctx.measureText(timestamp);
                const textWidth = textMetrics.width;
                const textHeight = fontSize; 

                const bgX = canvas.width - textWidth - padding * 2;
                const bgY = canvas.height - textHeight - padding * 1.5;
                const bgWidth = textWidth + padding * 2;
                const bgHeight = textHeight + padding * 1.5;
                
                ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
                ctx.fillRect(bgX, bgY, bgWidth, bgHeight);
                
                ctx.fillStyle = 'white';
                ctx.fillText(timestamp, canvas.width - padding, canvas.height - padding);

                canvas.toBlob((newBlob) => {
                        URL.revokeObjectURL(url);
                        if (newBlob) resolve(newBlob);
                        else reject(new Error('Canvas toBlob failed.'));
                    }, 'image/jpeg', 0.95);
            };
            img.onerror = () => {
                URL.revokeObjectURL(url);
                reject(new Error('Failed to load image.'));
            };
            img.src = url;
        });
    };

    const handleCapture = async () => {
        try {
            let originalBlob: Blob;
            const isDigitalZoom = videoRef.current && !stream?.getVideoTracks()[0].getCapabilities().zoom;

            if (imageCapture && !isDigitalZoom) {
                originalBlob = await imageCapture.takePhoto();
            } else if (videoRef.current) {
                originalBlob = await new Promise<Blob>((resolve, reject) => {
                    const canvas = document.createElement('canvas');
                    const video = videoRef.current!;
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;
                    const ctx = canvas.getContext('2d');
                    if (!ctx) return reject("No canvas context");
                    if (isDigitalZoom) {
                        const zoomScale = zoom;
                        const w = video.videoWidth; const h = video.videoHeight;
                        const zW = w / zoomScale; const zH = h / zoomScale;
                        const zX = (w - zW) / 2; const zY = (h - zH) / 2;
                        ctx.drawImage(video, zX, zY, zW, zH, 0, 0, w, h);
                    } else {
                        ctx.drawImage(video, 0, 0);
                    }
                    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Canvas fallback failed.")), 'image/jpeg', 0.95);
                });
            } else { throw new Error("No video source."); }
            
            const timestampedBlob = await addTimestampToBlob(originalBlob);
            const file = new File([timestampedBlob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
            const reader = new FileReader();
            reader.onload = () => {
                const dataUrl = reader.result as string;
                const newPhoto: PhotoWithMeta = { file, dataUrl };
                setCapturedPhotos(prev => [...prev, newPhoto]);
            };
            reader.readAsDataURL(file);
        } catch (error) {
            console.error('Capture failed:', error);
            alert(`Capture failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    };
    
    const handleDeletePhoto = (index: number) => {
        setCapturedPhotos(prev => prev.filter((_, i) => i !== index));
    };

    const changeZoom = (delta: number) => {
        if (!zoomCapabilities) return;
        setZoom(prev => {
            const next = prev + delta;
            return Math.max(zoomCapabilities.min, Math.min(zoomCapabilities.max, next));
        });
    };

    const handleSaveAndNext = () => {
        if (onSaveSet && capturedPhotos.length > 0) {
            onSaveSet(capturedPhotos);
            setCapturedPhotos([]);
        }
    };
    
    return (
        <div className="camera-overlay">
            <div className="camera-video-wrapper">
                <video ref={videoRef} autoPlay playsInline muted className="camera-video" />
                <div className="camera-top-controls">
                    {torchAvailable && (
                        <button className={`camera-icon-button ${torch ? 'active' : ''}`} onClick={() => setTorch(!torch)} aria-label="Toggle Flash">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
                        </button>
                    )}
                </div>
            </div>
            
            {capturedPhotos.length > 0 && (
                <div className="captured-photos-bar">
                    {capturedPhotos.map((p, i) => 
                        <div key={i} className="captured-thumbnail">
                            <img src={p.dataUrl} alt={`Captured photo ${i+1}`} />
                            <button className="delete-photo" onClick={() => handleDeletePhoto(i)} aria-label="Delete photo">&times;</button>
                        </div>
                    )}
                </div>
            )}
            
            <div className="camera-controls-wrapper">
                {zoomCapabilities && zoomCapabilities.max > zoomCapabilities.min && (
                    <div className="camera-zoom-row">
                        <button className="zoom-btn" onClick={() => changeZoom(-0.5)}>&minus;</button>
                        <input 
                            type="range" className="camera-zoom-slider" 
                            min={zoomCapabilities.min} max={zoomCapabilities.max} 
                            step={zoomCapabilities.step} value={zoom} 
                            onChange={e => setZoom(parseFloat(e.target.value))} 
                        />
                        <button className="zoom-btn" onClick={() => changeZoom(0.5)}>+</button>
                    </div>
                )}
                
                <div className="camera-main-controls">
                    {mode === 'single-case' ? (
                        <button className="camera-action-button" onClick={onCancel}>Cancel</button>
                    ) : (
                        <button className="camera-action-button" onClick={() => onFinishPatrol && onFinishPatrol(capturedPhotos)}>
                            Finish
                        </button>
                    )}
                    
                    <button className="capture-button" onClick={handleCapture} aria-label="Capture photo">
                        <div className="capture-button-inner" />
                    </button>
                    
                    {mode === 'single-case' ? (
                        <button className="camera-action-button" onClick={() => onDone && onDone(capturedPhotos)} disabled={capturedPhotos.length === 0}>
                            Done ({capturedPhotos.length})
                        </button>
                    ) : (
                        <button className="camera-action-button" onClick={handleSaveAndNext} disabled={capturedPhotos.length === 0}>
                            Next Site &rarr;
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CameraView;
