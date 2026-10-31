import { useEffect, useRef, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Called with the decoded QR/barcode text. The parent usually closes the dialog. */
  onScan: (text: string) => void
  title?: string
}

type Phase =
  | 'loading'      // importing zxing
  | 'requesting'   // getUserMedia in flight
  | 'decoding'     // stream attached, decoder running
  | 'error'

const PHASE_LABEL: Record<Exclude<Phase, 'error'>, string> = {
  loading: 'Step 1/3 — loading the decoder…',
  requesting: 'Step 2/3 — asking iOS for the camera…',
  decoding: 'Step 3/3 — camera on, point at a code',
}

/**
 * Camera scanner for QR codes AND product barcodes (EAN/UPC/Code 128…).
 * The zxing library is lazy-loaded so it stays out of the main bundle.
 */
export function ScanDialog({ open, onOpenChange, onScan, title = 'Scan code' }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [phase, setPhase] = useState<Phase>('loading')
  const [error, setError] = useState<string | null>(null)
  const phaseRef = useRef<Phase>('loading')

  useEffect(() => {
    phaseRef.current = phase
  }, [phase])

  useEffect(() => {
    if (!open) return
    setError(null)
    setPhase('loading')
    phaseRef.current = 'loading'

    let cancelled = false
    let controls: { stop: () => void } | null = null

    // If the camera request neither resolves nor rejects within 10s, iOS has
    // hung it — report exactly which step we were on.
    const watchdog = setTimeout(() => {
      if (!cancelled) {
        setError(
          `Camera did not respond within 10s (stuck at: "${PHASE_LABEL[phaseRef.current as Exclude<Phase, 'error'>] ?? phaseRef.current}"). ` +
          `iOS gave no error — fully close the app and try again, or check Settings → Safari → Camera. [v3]`,
        )
      }
    }, 10_000)

    ;(async () => {
      const video = videoRef.current
      if (!video) return
      try {
        setPhase('loading')
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

        setPhase('requesting')
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

        clearTimeout(watchdog)
        if (!video.srcObject) {
          setError('The camera stream was accepted but no video is arriving. Fully close the app and try again.')
        } else {
          // iOS sometimes needs an explicit play() nudge
          video.play().catch(() => {})
          setPhase('decoding')
        }
        if (cancelled) controls.stop()
      } catch (e) {
        clearTimeout(watchdog)
        if (!cancelled) {
          const detail = e instanceof Error ? `${e.name}: ${e.message}` : String(e)
          setError(
            e instanceof Error && e.name === 'NotAllowedError'
              ? 'Camera access was denied by iOS. Check Settings → Safari → Camera → Allow, and if you use the Home Screen app: delete it and re-add it after allowing in Safari.'
              : e instanceof Error && (e.name === 'NotFoundError' || e.name === 'OverconstrainedError')
                ? 'No camera was found on this device.'
                : `Camera error — please send me this text: ${detail}`,
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
          <video ref={videoRef} className="aspect-square w-full object-cover" muted playsInline autoPlay />
        </div>

        {error ? (
          <p className="text-center text-sm text-red-600">{error}</p>
        ) : (
          <p className="text-center text-sm text-stone-500">
            {PHASE_LABEL[phase as Exclude<Phase, 'error'>]}
          </p>
        )}
      </DialogContent>
    </Dialog>
  )
}
