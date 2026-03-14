import QRCode from "qrcode"

export async function generateQRCode(data: string): Promise<string> {
  try {
    const qrCodeDataUrl = await QRCode.toDataURL(data, {
      width: 300,
      margin: 2,
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
    })
    return qrCodeDataUrl
  } catch (error) {
    console.error("[FundFlow] Error generating QR code:", error)
    throw new Error("Failed to generate QR code")
  }
}

export async function generateGroupQRCode(groupId: string, groupName: string): Promise<string> {
  const shareData = `Join ${groupName} on FundFlow! Use code: ${groupId}`
  return generateQRCode(shareData)
}
