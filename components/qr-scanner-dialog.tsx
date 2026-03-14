"use client"

import { useEffect, useRef, useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Html5Qrcode } from "html5-qrcode"
import { Camera, X } from "lucide-react"

interface QrScannerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onScan: (code: string) => void
}

export function QrScannerDialog({ open, onOpenChange, onScan }: QrScannerDialogProps) {
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const qrCodeRegionId = "qr-reader"

  useEffect(() => {
    if (open && !isScanning) {
      startScanning()
    }

    return () => {
      stopScanning()
    }
  }, [open])

  const startScanning = async () => {
    try {
      setError(null)
      setIsScanning(true)

      const html5QrCode = new Html5Qrcode(qrCodeRegionId)
      scannerRef.current = html5QrCode

      await html5QrCode.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          console.log("[FundFlow] QR Code scanned:", decodedText)

          let groupCode = decodedText
          try {
            const url = new URL(decodedText)
            const pathParts = url.pathname.split("/")
            const groupIndex = pathParts.indexOf("group")
            if (groupIndex !== -1 && pathParts[groupIndex + 1]) {
              groupCode = pathParts[groupIndex + 1]
            }
          } catch {}

          onScan(groupCode)
          stopScanning()
          onOpenChange(false)
        },
        (errorMessage) => {},
      )
    } catch (err) {
      console.error("[FundFlow] Error starting QR scanner:", err)
      setError("Failed to access camera. Please check permissions.")
      setIsScanning(false)
    }
  }

  const stopScanning = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop()
        scannerRef.current.clear()
        scannerRef.current = null
      } catch (err) {
        console.error("[FundFlow] Error stopping scanner:", err)
      }
    }
    setIsScanning(false)
  }

  const handleClose = () => {
    stopScanning()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Scan QR Code
          </DialogTitle>
          <DialogDescription>Position the QR code within the frame to scan</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <div className="relative rounded-lg overflow-hidden bg-muted">
            <div id={qrCodeRegionId} className="w-full" />
            {!isScanning && !error && (
              <div className="absolute inset-0 flex items-center justify-center bg-muted">
                <div className="text-center space-y-2">
                  <Camera className="h-12 w-12 mx-auto text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Initializing camera...</p>
                </div>
              </div>
            )}
          </div>

          <Button variant="outline" onClick={handleClose} className="w-full bg-transparent">
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
