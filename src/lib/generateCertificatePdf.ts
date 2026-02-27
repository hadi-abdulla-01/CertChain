/**
 * src/lib/generateCertificatePdf.ts
 *
 * Securely modifies the ORIGINAL certificate (PDF or Image)
 * by overlaying a small verification QR code.
 */

import { PDFDocument, rgb } from 'pdf-lib';
import { getQrDataUrl } from '@/components/common/RealQrCode';

export type CertificateData = {
    certificateId: string;
    originalBuffer: ArrayBuffer;
    isImage?: boolean;
    appUrl?: string;
};

/**
 * Adds a verification QR code to the document.
 * Encodes only the raw Certificate ID for maximum scannability.
 */
export async function generateCertificatePdf(data: CertificateData): Promise<{
    pdfBlob: Blob;
    pdfDataUrl: string;
}> {
    const {
        certificateId,
        originalBuffer,
        isImage = false,
    } = data;

    // Use only the ID to keep QR code density low (easier to scan)
    const qrValue = certificateId;
    
    // Generate high-res QR for embedding (600px for sharpness)
    const qrDataUrl = await getQrDataUrl(qrValue, 600); 

    let pdfDoc: PDFDocument;

    if (isImage) {
        pdfDoc = await PDFDocument.create();
        const image = await (qrDataUrl.includes('png') ? pdfDoc.embedPng(originalBuffer) : pdfDoc.embedJpg(originalBuffer));
        const page = pdfDoc.addPage([image.width, image.height]);
        page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
    } else {
        pdfDoc = await PDFDocument.load(originalBuffer);
    }

    const qrImage = await pdfDoc.embedPng(qrDataUrl);
    const pages = pdfDoc.getPages();
    const firstPage = pages[0];
    const { width, height } = firstPage.getSize();

    // Larger QR dimensions and margin for easier "Virtual Scanning"
    const qrSize = 100; 
    const margin = 25;

    // Draw solid white background (Quiet Zone) for scannability
    firstPage.drawRectangle({
        x: width - qrSize - margin - 15,
        y: margin - 15,
        width: qrSize + 30,
        height: qrSize + 30,
        color: rgb(1, 1, 1),
    });

    firstPage.drawImage(qrImage, {
        x: width - qrSize - margin,
        y: margin,
        width: qrSize,
        height: qrSize,
    });

    // Hidden metadata as fallback for forensic tools
    pdfDoc.setSubject(certificateId);

    const pdfBytes = await pdfDoc.save();
    const pdfBlob = new Blob([pdfBytes], { type: 'application/pdf' });
    const pdfDataUrl = URL.createObjectURL(pdfBlob);

    return { pdfBlob, pdfDataUrl };
}
