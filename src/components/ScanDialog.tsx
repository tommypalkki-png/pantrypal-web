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

    ;(async () => {
      const video = videoRef.current
      if (!video) return
      try {
        const { BrowserMultiFormatReader } = await import('@zxing/browser')
        if (cancelled) return
        const reader = new BrowserMultiFormatReader()
        controls = await reader.decodeFromVideoDevice(undefined, video, result => {
          if (result && !cancelled) {
            cancelled = true
            const text = result.getText()
            controls?.stop()
            onScan(text)
          }
        })
        if (cancelled) controls.stop()
      } catch (e) {
        if (!cancelled) {
          setError(
            e instanceof Error && e.name === 'NotAllowedError'
              ? 'Camera access was denied. Allow camera permission and try again.'
              : 'Could not start the camera on this device.',
          )
        }
      }
    })()

    return () => {
      cancelled = true
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
