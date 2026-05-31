import { useEffect, useRef, useState } from 'react';

interface Props {
  onCapture: (dataUrl: string) => void;
  onCancel: () => void;
}

// Opens the webcam, shows a live preview, and captures a single JPEG frame
// as a base64 data URL. Cleans up the camera stream on unmount.
export function CameraCapture({ onCapture, onCancel }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: 640, height: 480 },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setReady(true);
        }
      } catch {
        setError(
          'Could not access the camera. Check browser permissions and that no other app is using it.'
        );
      }
    }

    start();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  function capture() {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    // JPEG at 0.7 quality keeps the upload small.
    const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    onCapture(dataUrl);
  }

  return (
    <div className="camera">
      {error ? (
        <div className="error-box">{error}</div>
      ) : (
        <div className="camera-frame">
          <video ref={videoRef} playsInline muted className="camera-video" />
          {!ready && <div className="camera-loading">Starting camera…</div>}
        </div>
      )}
      <div className="camera-actions">
        <button className="btn-ghost" onClick={onCancel}>
          Cancel
        </button>
        <button
          className="btn-primary btn-inline"
          onClick={capture}
          disabled={!ready || !!error}
        >
          Capture photo
        </button>
      </div>
    </div>
  );
}
