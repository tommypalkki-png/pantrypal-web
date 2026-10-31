import { useEffect, useRef, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

/** Handle for the lazily-loaded zxing reader (fallback when the OS has no native decoder). */
type ZxingReader = {
  decodeFromVideoElement: (
    video: HTMLVideoElement,
    cb: (result: { getText: () => string } | null) => void,
  ) => Promise<{ stop: () => void }>
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Called with the decoded QR/barcode text. The parent usually closes the dialog. */
  onScan: (text: string) => void
  title?: string
}

type Phase = 'mounting' | 'requesting' | 'decoding'

const PHASE_LABEL: Record<Phase, string> = {
  mounting: 'Step 1/3 — opening the camera view…',
  requesting: 'Step 2/3 — asking iOS for the camera…',
  decoding: 'Step 3/3 — camera on, point at a code',
}

const BARCODE_FORMATS = [
  'qr_code', 'ean_13', 'ean_8', 'upc_a', 'upc_e',
  'code_128', 'code_39', 'itf', 'codabar', 'data_matrix',
]

declare global {
  interface Window {
    BarcodeDetector?: new (options?: { formats?: string[] }) => {
      detect: (source: HTMLVideoElement) => Promise<Array<{ rawValue: string }>>
    }
  }
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

/**
 * Camera scanner. Manages the MediaStream directly (zxing's device handling
 * proved fragile on iOS) and prefers the OS-native BarcodeDetector when
 * available, falling back to zxing decoding from the video element.
 */
export function ScanDialog({ open, onOpenChange, onScan, title = 'Scan code' }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [phase, setPhase] = useState<Phase>('mounting')
  const [error, setError] = useState<string | null>(null)
  const [slowHint, setSlowHint] = useState(false)

  useEffect(() => {
    if (!open) return
    setError(null)
    setSlowHint(false)
    setPhase('mounting')

    let cancelled = false
    let stream: MediaStream | null = null

    const slowTimer = setTimeout(() => {
      if (!cancelled) setSlowHint(true)
    }, 15_000)

    ;(async () => {
      // 1) Wait for the video element — dialog portal timing on iOS can lag.
      setPhase('mounting')
      let video = videoRef.current
      for (let i = 0; !video && i < 30 && !cancelled; i++) {
        await sleep(100)
        video = videoRef.current
      }
      if (cancelled) return
      if (!video) {
        setError('Internal error: the camera view did not mount [v6-mount]. Please screenshot this.')
        return
      }

      // 2) Ask iOS for the camera — rear first, then any.
      setPhase('requesting')
      try {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment' },
            audio: false,
          })
        } catch {
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
        }
      } catch (e) {
        const detail = e instanceof Error ? `${e.name}: ${e.message}` : String(e)
        setError(
          e instanceof Error && e.name === 'NotAllowedError'
            ? 'Camera access was denied by iOS. Check Settings → Safari → Camera → Allow.'
            : e instanceof Error && (e.name === 'NotFoundError' || e.name === 'OverconstrainedError')
              ? 'No camera was found on this device.'
              : `Camera error — please screenshot this: ${detail}`,
        )
        return
      }
      if (cancelled) {
        stream.getTracks().forEach(t => t.stop())
        return
      }

      // 3) Attach and start decoding.
      video.srcObject = stream
      try { await video.play() } catch { /* iOS may reject; srcObject still renders */ }
      setPhase('decoding')
      clearTimeout(slowTimer)

      let detector: InstanceType<NonNullable<typeof window.BarcodeDetector>> | null = null
      if (window.BarcodeDetector) {
        try {
          detector = new window.BarcodeDetector({ formats: BARCODE_FORMATS })
        } catch { /* fall back to zxing */ }
      }
      let zxingReader: ZxingReader | null = null
      if (!detector) {
        try {
          // Lazy-load zxing only when the OS decoder is unavailable.
          const mod = await import('@zxing/browser')
          if (cancelled) { stream.getTracks().forEach(t => t.stop()); return }
          zxingReader = new mod.BrowserMultiFormatReader() as unknown as ZxingReader
        } catch {
          setError('Could not load the barcode decoder. Check your connection and try again.')
          stream.getTracks().forEach(t => t.stop())
          return
        }
      }

      if (detector) {
        // Native OS decoder — poll frames.
        while (!cancelled) {
          try {
            let text: string | null = null
            if (video.readyState >= 2) {
              const codes = await detector.detect(video)
              if (codes.length > 0) text = codes[0].rawValue
            } else {
              await sleep(200)
            }
            if (text && !cancelled) {
              cancelled = true
              stream.getTracks().forEach(t => t.stop())
              onScan(text)
              return
            }
          } catch {
            await sleep(150)
          }
        }
      } else if (zxingReader) {
        // zxing fallback — continuous callback-based decoding.
        const zxingControlsRef: { current: { stop: () => void } | null } = { current: null }
        zxingReader.decodeFromVideoElement(video, result => {
          if (result && !cancelled) {
            cancelled = true
            const text = result.getText()
            zxingControlsRef.current?.stop()
            stream?.getTracks().forEach(t => t.stop())
            onScan(text)
          }
        })
          .then(controls => { zxingControlsRef.current = controls })
          .catch(() => {})
        while (!cancelled) {
          await sleep(200)
        }
        zxingControlsRef.current?.stop()
      }
    })()

    return () => {
      cancelled = true
      clearTimeout(slowTimer)
      stream?.getTracks().forEach(t => t.stop())
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
          <video ref={videoRef} className="aspect-square w-full object-cover" muted playsInline autoPlay />
        </div>

        {error ? (
          <p className="text-center text-sm text-red-600">{error}</p>
        ) : (
          <div>
            <p className="text-center text-sm text-stone-500">{PHASE_LABEL[phase]}</p>
            {slowHint && phase !== 'decoding' && (
              <p className="mt-1 text-center text-xs text-amber-600">
                Taking longer than usual. If this persists past 30 seconds, close the
                dialog, fully close Safari, and try once more.
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
