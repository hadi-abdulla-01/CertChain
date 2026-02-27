import { getCertificateById } from "@/app/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle2, ExternalLink, ShieldAlert } from "lucide-react";
import Link from "next/link";

type Props = {
  params: { id: string };
};

export default async function VerifyCertificatePage({ params }: Props) {
  const certificate = await getCertificateById(params.id);

  if (!certificate) {
    return (
      <div className="container mx-auto max-w-2xl py-24">
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Certificate Not Found</AlertTitle>
          <AlertDescription>
            The certificate with ID <span className="font-mono bg-muted px-1 py-0.5 rounded">{params.id}</span> could not be found. Please check the ID and try again.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-2xl py-12">
      <Card className="overflow-hidden">
        <CardHeader className="bg-card/90">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Badge className="bg-green-600 text-primary-foreground hover:bg-green-700">
                <CheckCircle2 className="mr-2 h-4 w-4" /> Verified on CertChain
              </Badge>
              <CardTitle className="mt-2 text-2xl">Certificate of Completion</CardTitle>
              <CardDescription>This certificate is authentic and its integrity is secured on the blockchain.</CardDescription>
            </div>
            <div className="flex-shrink-0">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-20 w-20 text-primary/50"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
                <path d="m9 12 2 2 4-4" />
              </svg>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid gap-4">
            <div className="grid gap-1">
              <p className="text-sm font-medium text-muted-foreground">Recipient</p>
              <p className="text-lg font-semibold">{certificate.studentName}</p>
            </div>
            <div className="grid gap-1">
              <p className="text-sm font-medium text-muted-foreground">Course Completed</p>
              <p className="text-lg font-semibold">{certificate.courseName}</p>
            </div>
            <div className="grid gap-1">
              <p className="text-sm font-medium text-muted-foreground">Date of Issue</p>
              <p className="text-lg font-semibold">{certificate.issueDate}</p>
            </div>
          </div>
          <Separator className="my-6" />
          <div className="grid gap-4 text-sm">
            <h3 className="font-semibold">Verification Details</h3>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Certificate ID</span>
              <span className="font-mono text-xs">{certificate.id}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Certificate Hash (SHA-256)</span>
              <span className="font-mono text-xs truncate max-w-[150px] sm:max-w-xs">{certificate.certificateHash}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Transaction Hash</span>
              <Button variant="link" asChild className="h-auto p-0 font-mono text-xs">
                <Link href={`https://sepolia.etherscan.io/tx/${certificate.transactionHash}`} target="_blank" rel="noopener noreferrer" title="View transaction on Sepolia Etherscan">
                  <span className="truncate max-w-[150px] sm:max-w-xs">{certificate.transactionHash}</span>
                  <ExternalLink className="ml-2 h-3 w-3 flex-shrink-0" />
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
