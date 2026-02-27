'use client';

/**
 * VerificationForm.tsx
 * 
 * Implements visual QR detection for uploaded PDFs and Images,
 * Camera scanning, and Manual ID Entry.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { useMetaMask } from '@/hooks/useMetaMask';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  CheckCircle2, XCircle, Loader2, Camera, StopCircle, RotateCcw, ExternalLink, ShieldCheck, Upload, AlertTriangle, Search, Keyboard
} from 'lucide-react';
import { BrowserQRCodeReader } from '@zxing/browser';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import * as pdfjs from 'pdfjs-dist';

// Initialize PDF.js worker
if (typeof window !== 'undefined') {
  pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;
}

// ── Types ───────────────────────────────────────────────────────────────
type Mode = 'choose' | 'scan' | 'upload' | 'manual';
type Status = 'idle' | 'loading' | 'valid' | 'invalid' | 'error';

type CertResult = {
  studentName: string;
  courseName: string;
  issueDate: string;
  issuingUniversity: string;
  universityName: string;
  universityDomain: string;
  isRevoked: boolean;
  certificateId: string;
  transactionHash: string;
};

// ── QR Scanner Component ────────────────────────────────────────────────
function QrScanner({ onScan }: { onScan: (result: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserQRCodeReader | null>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const [scanning, setScanning] = useState(false);
  const [error, setScanError] = useState('');

  const startScan = useCallback(async () => {
    setScanError('');
    setScanning(true);
    try {
      const reader = new BrowserQRCodeReader();
      readerRef.current = reader;
      const devices = await BrowserQRCodeReader.listVideoInputDevices();
      if (!devices.length) throw new Error('No camera found on this device.');

      const deviceId = devices[devices.length - 1].deviceId;
      const controls = await reader.decodeFromVideoDevice(
        deviceId,
        videoRef.current!,
        (result) => {
          if (result) {
            const text = result.getText();
            const match = text.match(/\/verify\/([a-f0-9-]{36})/i);
            const certId = match ? match[1] : text.trim();
            controlsRef.current?.stop();
            setScanning(false);
            onScan(certId);
          }
        }
      );
      controlsRef.current = controls;
    } catch (err: any) {
      setScanError(err?.message || 'Camera access denied or error occurred.');
      setScanning(false);
    }
  }, [onScan]);

  const stopScan = useCallback(() => {
    controlsRef.current?.stop();
    setScanning(false);
  }, []);

  useEffect(() => () => { controlsRef.current?.stop(); }, []);

  return (
    <div className="space-y-4">
      <div className="relative aspect-square w-full max-w-xs mx-auto overflow-hidden rounded-xl border-2 border-dashed border-primary/40 bg-black">
        <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
        {!scanning && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/80">
            <Camera className="h-12 w-12 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Camera preview</p>
          </div>
        )}
      </div>

      {error && <p className="text-sm text-destructive text-center">{error}</p>}

      <div className="flex justify-center gap-3">
        {!scanning ? (
          <Button onClick={startScan} className="gap-2">
            <Camera className="h-4 w-4" /> Start Camera
          </Button>
        ) : (
          <Button onClick={stopScan} variant="destructive" className="gap-2">
            <StopCircle className="h-4 w-4" /> Stop Scanning
          </Button>
        )}
      </div>
    </div>
  );
}

// ── Result View ──────────────────────────────────────────────────────────
function ResultCard({ status, result, certId }: {
  status: 'valid' | 'invalid';
  result?: CertResult;
  certId: string;
}) {
  const isValid = status === 'valid';

  return (
    <Card className={isValid ? 'border-green-500/40 bg-green-500/5 animate-in zoom-in-95 duration-300' : 'border-red-500/40 bg-red-500/5 max-w-lg mx-auto animate-in zoom-in-95 duration-300'}>
      <CardHeader>
        <CardTitle className="flex items-center gap-4">
          {isValid
            ? <CheckCircle2 className="h-10 w-10 text-green-500 shrink-0" />
            : <XCircle className="h-10 w-10 text-red-500 shrink-0" />
          }
          <div className="flex flex-col gap-1.5">
            <span className="text-xl font-bold">Verification Result</span>
            <Badge className={isValid ? 'bg-green-600 hover:bg-green-600 px-3' : 'bg-red-600 hover:bg-red-600 px-3'}>
              {isValid ? '✓ Certificate Valid' : '✗ Unverified Document'}
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {isValid && result ? (
          <div className="grid grid-cols-2 gap-y-4 text-sm">
            {[
              { label: 'Student Name', value: result.studentName },
              { label: 'Course', value: result.courseName },
              { label: 'Issue Date', value: result.issueDate },
              { label: 'Issued By', value: result.universityName },
              { label: 'Certificate ID', value: certId },
            ].map(({ label, value }) => (
              <div key={label} className="flex flex-col gap-1">
                <p className="text-muted-foreground text-[10px] uppercase tracking-wider font-semibold">{label}</p>
                <p className="font-medium break-all">{value}</p>
              </div>
            ))}
            {result.transactionHash && (
              <div className="col-span-2 mt-2">
                <Separator className="mb-4 opacity-50" />
                <Button asChild variant="outline" size="sm" className="w-full gap-2 border-primary/30 hover:bg-primary/5">
                  <a href={`https://sepolia.etherscan.io/tx/${result.transactionHash}`} target="_blank">
                    <ExternalLink className="h-4 w-4" /> View On-Chain Proof
                  </a>
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-start gap-3 text-sm text-red-500/70 bg-red-500/5 p-4 rounded-lg border border-red-500/10">
            <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              This Certificate ID ({certId}) does not match any official blockchain records. It may have been tampered with or was not issued through this platform.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Main Component ────────────────────────────────────────────────────────
export default function VerificationForm() {
  const { getReadContract } = useMetaMask();
  const { toast } = useToast();

  const [mode, setMode] = useState<Mode>('choose');
  const [status, setStatus] = useState<Status>('idle');
  const [result, setResult] = useState<CertResult | undefined>(undefined);
  const [certId, setCertId] = useState('');
  const [manualId, setManualId] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const decodeQrFromCanvas = async (canvas: HTMLCanvasElement): Promise<string | null> => {
    const reader = new BrowserQRCodeReader();
    try {
      const dataUrl = canvas.toDataURL('image/png', 1.0);
      const img = new Image();
      img.src = dataUrl;
      await new Promise((resolve) => img.onload = resolve);
      
      const result = await reader.decodeFromImageElement(img);
      if (result) {
        const text = result.getText();
        const match = text.match(/\/verify\/([a-f0-9-]{36})/i);
        return match ? match[1] : text.trim();
      }
    } catch (e) {
      console.warn('QR decode failed:', e);
    }
    return null;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setStatus('loading');
    setErrorMsg('');
    setMode('upload');

    try {
      let extractedId: string | null = null;
      const reader = new FileReader();

      if (file.type === 'application/pdf') {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
        
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 4.0 }); 
        
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d', { alpha: false });
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        if (context) {
          context.fillStyle = 'white';
          context.fillRect(0, 0, canvas.width, canvas.height);
          await page.render({ canvasContext: context, viewport }).promise;
          extractedId = await decodeQrFromCanvas(canvas);
        }
      } else if (file.type.startsWith('image/')) {
        const img = new Image();
        const dataUrl = await new Promise<string>((resolve) => {
          reader.onload = (ev) => resolve(ev.target?.result as string);
          reader.readAsDataURL(file);
        });
        
        img.src = dataUrl;
        await new Promise((resolve) => img.onload = resolve);
        
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          extractedId = await decodeQrFromCanvas(canvas);
        }
      }

      if (!extractedId) {
        setStatus('invalid');
        setCertId('Unknown');
        toast({ 
          variant: 'destructive',
          title: 'No QR Code Found', 
          description: 'The digital scanner could not find a QR code in this document.' 
        });
        return;
      }

      handleQrScan(extractedId);
      
    } catch (err: any) {
      console.error('Upload verification error:', err);
      setStatus('error');
      setErrorMsg(err.message || 'Error processing file.');
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualId.trim()) return;
    handleQrScan(manualId.trim());
  };

  const reset = () => {
    setMode('choose');
    setStatus('idle');
    setResult(undefined);
    setCertId('');
    setManualId('');
    setErrorMsg('');
  };

  const handleQrScan = async (scannedId: string) => {
    setCertId(scannedId);
    setStatus('loading');
    
    try {
      const docRef = doc(db, 'certificates', scannedId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        setStatus('invalid');
        return;
      }

      const storedData = docSnap.data();
      const contract = getReadContract();
      
      if (!contract) {
        setStatus('valid');
        setResult({
          studentName: storedData.studentName,
          courseName: storedData.courseName,
          issueDate: storedData.issueDate,
          issuingUniversity: storedData.universityWallet || '',
          universityName: storedData.universityName || '',
          universityDomain: '',
          isRevoked: false,
          certificateId: scannedId,
          transactionHash: storedData.transactionHash || '',
        });
        return;
      }

      try {
        const hashHex = storedData.certificateHash.startsWith('0x') ? storedData.certificateHash : `0x${storedData.certificateHash}`;
        const onChain = await contract.verifyCertificate(hashHex);
        
        const onChainValid = onChain[7] as boolean;

        if (!onChainValid) {
          setStatus('invalid');
        } else {
          setStatus('valid');
          setResult({
            studentName: onChain[0] || storedData.studentName,
            courseName: onChain[1] || storedData.courseName,
            issueDate: storedData.issueDate,
            issuingUniversity: onChain[3],
            universityName: onChain[4] || storedData.universityName || '',
            universityDomain: onChain[5] || '',
            isRevoked: onChain[6] || false,
            certificateId: scannedId,
            transactionHash: storedData.transactionHash || '',
          });
        }
      } catch (chainErr) {
        setStatus('valid');
        setResult({
          studentName: storedData.studentName,
          courseName: storedData.courseName,
          issueDate: storedData.issueDate,
          issuingUniversity: storedData.universityWallet || '',
          universityName: storedData.universityName || '',
          universityDomain: '',
          isRevoked: false,
          certificateId: scannedId,
          transactionHash: storedData.transactionHash || '',
        });
      }
    } catch (err: any) {
      setStatus('error');
      setErrorMsg('Failed to fetch certificate details.');
    }
  };

  return (
    <div className="space-y-8 max-w-xl mx-auto">
      {status === 'idle' && mode === 'choose' && (
        <div className="grid grid-cols-1 gap-8">
          {/* Method 1: File Upload */}
          <div className="space-y-4">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Upload className="h-3 w-3" /> Method 1: Document Upload
            </Label>
            <label className="group relative flex flex-col items-center gap-4 rounded-2xl border-2 border-dashed border-primary/30 
                           bg-card p-10 text-center transition-all hover:border-primary hover:bg-primary/5 cursor-pointer">
              <Upload className="h-12 w-12 text-primary transition-transform group-hover:scale-110" />
              <div>
                <p className="text-lg font-bold text-foreground">Upload PDF or Image</p>
                <p className="text-xs text-muted-foreground mt-1">
                  We will automatically scan for the QR code
                </p>
              </div>
              <input type="file" accept="application/pdf,image/*" className="sr-only" onChange={handleFileUpload} />
            </label>
          </div>

          <div className="relative flex items-center py-2">
            <div className="flex-grow border-t border-muted/20"></div>
            <span className="flex-shrink mx-4 text-muted-foreground text-[10px] uppercase tracking-[0.2em] font-bold">OR</span>
            <div className="flex-grow border-t border-muted/20"></div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Method 2: Manual ID */}
            <div className="space-y-4">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Keyboard className="h-3 w-3" /> Method 2: Manual Entry
              </Label>
              <form onSubmit={handleManualSubmit} className="space-y-2">
                <Input 
                  placeholder="Enter Certificate ID..." 
                  value={manualId} 
                  onChange={(e) => setManualId(e.target.value)}
                  className="bg-card font-mono text-xs h-12"
                />
                <Button type="submit" className="w-full gap-2 h-10" disabled={!manualId.trim()}>
                  <Search className="h-4 w-4" /> Verify ID
                </Button>
              </form>
            </div>

            {/* Method 3: Camera Scanner */}
            <div className="space-y-4">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Camera className="h-3 w-3" /> Method 3: Camera
              </Label>
              <Button 
                variant="outline" 
                onClick={() => setMode('scan')} 
                className="w-full h-[104px] flex-col gap-3 border-primary/30 hover:bg-primary/5"
              >
                <Camera className="h-6 w-6" />
                <div className="flex flex-col items-center">
                  <span className="font-bold">Open Scanner</span>
                  <span className="text-[10px] text-muted-foreground">Scan physical QR</span>
                </div>
              </Button>
            </div>
          </div>
        </div>
      )}

      {(mode === 'scan' || (mode === 'upload' && status === 'idle')) && (
        <div className="flex flex-col items-center gap-4">
          <QrScanner onScan={handleQrScan} />
          <Button variant="ghost" size="sm" onClick={reset}>Cancel</Button>
        </div>
      )}

      {status === 'loading' && (
        <div className="flex flex-col items-center gap-6 py-20 text-center animate-in fade-in duration-500">
          <div className="relative">
            <Loader2 className="h-16 w-16 animate-spin text-primary opacity-20" />
            <ShieldCheck className="absolute inset-0 m-auto h-8 w-8 text-primary animate-pulse" />
          </div>
          <div>
            <p className="text-lg font-semibold">Verifying Authenticity</p>
            <p className="text-sm text-muted-foreground">Communicating with the blockchain...</p>
          </div>
        </div>
      )}

      {(status === 'valid' || status === 'invalid') && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <ResultCard status={status} result={result} certId={certId} />
          <div className="flex justify-center">
            <Button onClick={reset} variant="ghost" className="gap-2 text-muted-foreground hover:text-foreground">
              <RotateCcw className="h-4 w-4" /> Verify Another
            </Button>
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className="space-y-4 text-center">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto" />
          <h2 className="text-xl font-bold">Error</h2>
          <p className="text-muted-foreground">{errorMsg}</p>
          <Button onClick={reset}>Try Again</Button>
        </div>
      )}
    </div>
  );
}
