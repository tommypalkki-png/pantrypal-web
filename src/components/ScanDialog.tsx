import { useEffect, useRef, useState } from 'react'
import QrScanner from 'qr-scanner'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Called with the decoded QR text. The parent usually closes the dialog. */
  onScan: (text: string) => void
  title?: string
}

export function ScanDialog({ open, onOpenChange, onScan, title = 'Scan QR code' }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const scannerRef = useRef<QrScanner | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setError(null)

    let cancelled = false
    const video = videoRef.current
    if (!video) return

    const scanner = new QrScanner(
      video,
      result => {
        if (cancelled) return
        cancelled = true // fire once
        scanner.destroy()
        scannerRef.current = null
        onScan(result.data)
      },
      {
        returnDetailedScanResult: true,
        highlightScanRegion: true,
        preferredCamera: 'environment',
      },
    )
    scannerRef.current = scanner
    scanner.start().catch((e: unknown) => {
      if (!cancelled) {
        setError(
          e instanceof Error && e.name === 'NotAllowedError'
            ? 'Camera access was denied. Allow camera permission and try again.'
            : 'Could not start the camera on this device.',
        )
      }
    })

    return () => {
      cancelled = true
      scanner.destroy()
      scannerRef.current = null
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
          {/* qr-scanner attaches to this video element */}
          <video ref={videoRef} className="aspect-square w-full object-cover" muted playsInline />
        </div>

        {error ? (
          <p className="text-center text-sm text-red-600">{error}</p>
        ) : (
          <p className="text-center text-sm text-stone-500">
            Point the camera at a location QR code.
          </p>
        )}
      </DialogContent>
    </Dialog>
  )
}
