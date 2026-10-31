import { useEffect, useRef, useState } from 'react'
import { BrowserMultiFormatReader } from '@zxing/browser'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Called with the decoded QR/barcode text. The parent usually closes the dialog. */
  onScan: (text: string) => void
  title?: string
}

type Phase =
  | 'loading'      // decoder initialising
  | 'requesting'   // getUserMedia in flight
  | 'decoding'     // stream attached, decoder running
  | 'error'

const PHASE_LABEL: Record<Exclude<Phase, 'error'>, string> = {
  loading: 'Step 1/3 — starting the decoder…',
  requesting: 'Step 2/3 — asking iOS for the camera…',
  decoding: 'Step 3/3 — camera on, point at a code',
}

/**
 * Camera scanner for QR codes AND product barcodes (EAN/UPC/Code 128…).
 * zxing is statically bundled — a separate lazy chunk proved unreliable on
 * some iOS network paths.
 */
export function ScanDialog({ open, onOpenChange, onScan, title = 'Scan code' }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [phase, setPhase] = useState<Phase>('loading')
  const [error, setError] = useState<string | null>(null)
  const [slowHint, setSlowHint] = useState(false)
  const phaseRef = useRef<Phase>('loading')

  useEffect(() => {
    phaseRef.current = phase
  }, [phase])

  useEffect(() => {
    if (!open) return
    setError(null)
    setSlowHint(false)
    setPhase('loading')
    phaseRef.current = 'loading'

    let cancelled = false
    let controls: { stop: () => void } | null = null

    // If things take unusually long (slow network downloading the decoder,
    // or iOS hanging the camera request), say so — but keep trying.
    const slowTimer = setTimeout(() => {
      if (!cancelled) setSlowHint(true)
    }, 15_000)

    ;(async () => {
      const video = videoRef.current
      if (!video) return
      try {
        setPhase('loading')
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

        clearTimeout(slowTimer)
        if (!video.srcObject) {
          setError('The camera stream was accepted but no video is arriving. Fully close the app and try again.')
        } else {
          // iOS sometimes needs an explicit play() nudge
          video.play().catch(() => {})
          setPhase('decoding')
        }
        if (cancelled) controls.stop()
      } catch (e) {
        clearTimeout(slowTimer)
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
      clearTimeout(slowTimer)
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
          <div>
            <p className="text-center text-sm text-stone-500">
              {PHASE_LABEL[phase as Exclude<Phase, 'error'>]}
            </p>
            {slowHint && phase !== 'decoding' && (
              <p className="mt-1 text-center text-xs text-amber-600">
                Taking longer than usual — usually a slow connection downloading the
                scanner. Keep this open a few more seconds; it should start on its own.
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
