import VerificationForm from "@/components/verify/VerificationForm";

export default function Home() {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          Certificate Verification
        </h1>
        <p className="mt-6 text-lg leading-8 text-muted-foreground">
          Verify the authenticity of a certificate by providing its unique ID and uploading the document.
        </p>
      </div>

      <div className="mx-auto mt-16 max-w-xl">
        <VerificationForm />
      </div>
    </div>
  );
}
