import { useEffect, useRef, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Called with the decoded QR/barcode text. The parent usually closes the dialog. */
  onScan: (text: string) => void
  title?: string
}

/**
 * Camera scanner for QR codes AND product barcodes (EAN/UPC/Code 128…).
 * The zxing library is lazy-loaded so it stays out of the main bundle.
 */
export function ScanDialog({ open, onOpenChange, onScan, title = 'Scan code' }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setError(null)

    let cancelled = false
    let controls: { stop: () => void } | null = null
    let streamStarted = false

    // If nothing has started after 6s, the camera is unavailable or the
    // permission prompt was blocked — tell the user instead of showing black.
    const watchdog = setTimeout(() => {
      if (!cancelled && !streamStarted) {
        setError(
          'The camera is not available in this browser. Check that this device has a camera and that browser camera permission is allowed — or use the app on your phone instead.',
        )
      }
    }, 6000)

    ;(async () => {
      const video = videoRef.current
      if (!video) return
      try {
        const { BrowserMultiFormatReader } = await import('@zxing/browser')
        if (cancelled) return
        const reader = new BrowserMultiFormatReader()

        const onResult = (result: { getText: () => string } | undefined) => {
          if (result && !cancelled) {
            cancelled = true
            const text = result.getText()
            controls?.stop()
            onScan(text)
          }
        }

        // iOS Safari often fails zxing's default device picking; ask for the
        // rear camera explicitly, then fall back to any camera.
        const attempts: MediaStreamConstraints[] = [
          { video: { facingMode: 'environment' }, audio: false },
          { video: true, audio: false },
        ]
        let lastErr: unknown = null
        for (const constraints of attempts) {
          try {
            controls = await reader.decodeFromConstraints(constraints, video, onResult)
            break
          } catch (e) {
            lastErr = e
          }
        }
        if (!controls) throw lastErr ?? new Error('unknown camera error')

        streamStarted = !!video.srcObject
        clearTimeout(watchdog)
        if (!streamStarted && !cancelled) {
          setError('The camera started but no video is arriving. Try closing and reopening the app.')
        }
        if (cancelled) controls.stop()
      } catch (e) {
        clearTimeout(watchdog)
        if (!cancelled) {
          const detail = e instanceof Error ? `${e.name}: ${e.message}` : String(e)
          setError(
            e instanceof Error && e.name === 'NotAllowedError'
              ? 'Camera access was denied. Check Settings → Safari → Camera (or the app\'s permissions) and try again.'
              : e instanceof Error && (e.name === 'NotFoundError' || e.name === 'OverconstrainedError')
                ? 'No camera was found on this device.'
                : `Could not start the camera. (${detail})`,
          )
        }
      }
    })()

    return () => {
      cancelled = true
      clearTimeout(watchdog)
      controls?.stop()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="overflow-hidden rounded-xl bg-black">
          <video ref={videoRef} className="aspect-square w-full object-cover" muted playsInline />
        </div>

        {error ? (
          <p className="text-center text-sm text-red-600">{error}</p>
        ) : (
          <p className="text-center text-sm text-stone-500">
            Point the camera at a location QR code or a product barcode.
          </p>
        )}
      </DialogContent>
    </Dialog>
  )
}
