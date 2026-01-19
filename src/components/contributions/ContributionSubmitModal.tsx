// components/contributions/ContributionSubmitModal.tsx
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle2,
  AlertCircle,
  Loader2,
  ExternalLink,
  Copy,
  Check,
  Info,
  Coins,
} from "lucide-react";
import { CreateContributionDTO } from "@/types";
import { motion, AnimatePresence } from "framer-motion";
import { calculateExpectedTokens, DEFAULT_POINTS_TO_TOKEN_RATIO } from "@/lib/contracts/contributionTracker";

interface ContributionSubmitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  formData: CreateContributionDTO;
  backendId: string | null;
  loading: boolean;
  step: "generating" | "confirming" | "submitting" | "success" | "error" | "";
  error?: string;
  txHash?: string;
  estimatedPoints?: number;
}

export const ContributionSubmitModal = ({
  isOpen,
  onClose,
  onConfirm,
  formData,
  backendId,
  loading,
  step,
  error,
  txHash,
  estimatedPoints = 0,
}: ContributionSubmitModalProps) => {
  const [copied, setCopied] = useState(false);

  // Calculate expected tokens after verification
  const expectedTokens = estimatedPoints > 0 
    ? calculateExpectedTokens(estimatedPoints, DEFAULT_POINTS_TO_TOKEN_RATIO)
    : "0";

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getStepContent = () => {
    switch (step) {
      case "generating":
        return (
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <h3 className="text-lg font-semibold mb-2">Generating Unique ID</h3>
            <p className="text-sm text-muted-foreground text-center">
              Creating a unique identifier for your contribution...
            </p>
          </div>
        );

      case "confirming":
        return (
          <div className="space-y-6">
            {/* Contribution Details */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Contribution Details</h3>
              
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <span className="text-sm text-muted-foreground">Type:</span>
                  <Badge variant="outline" className="ml-2">
                    {formData.type}
                  </Badge>
                </div>
                
                <div className="flex justify-between items-start">
                  <span className="text-sm text-muted-foreground">Project:</span>
                  <span className="text-sm font-medium text-right max-w-[60%]">
                    {formData.name}
                  </span>
                </div>
                
                <div className="flex justify-between items-start">
                  <span className="text-sm text-muted-foreground">Points:</span>
                  <span className="text-sm font-mono font-bold text-primary">
                    {estimatedPoints.toLocaleString()}
                  </span>
                </div>

                <div className="flex justify-between items-start">
                  <span className="text-sm text-muted-foreground">Expected $PBUILD:</span>
                  <div className="text-right">
                    <div className="text-sm font-mono font-bold text-success flex items-center gap-1">
                      <Coins className="h-4 w-4" />
                      {expectedTokens}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      After verification
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Transaction Info */}
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="text-sm">
                <div className="space-y-2">
                  <p className="font-semibold">What happens next:</p>
                  <ol className="list-decimal list-inside space-y-1 text-xs">
                    <li>Your contribution will be submitted to the blockchain</li>
                    <li>You'll confirm the transaction in your wallet</li>
                    <li>Status will be set to "Pending" awaiting verification</li>
                    <li>Verifiers will review your submission (24-48 hours)</li>
                    <li>Once approved, {expectedTokens} $PBUILD will be minted to your wallet</li>
                  </ol>
                  <div className="pt-2 mt-2 border-t border-border">
                    <p className="text-xs text-muted-foreground">
                      <strong>Gas fee:</strong> ~$0.10-$2.00 depending on network
                    </p>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          </div>
        );

      case "submitting":
        return (
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <h3 className="text-lg font-semibold mb-2">Submitting to Blockchain</h3>
            <p className="text-sm text-muted-foreground text-center">
              Please confirm the transaction in your wallet...
            </p>
            <p className="text-xs text-muted-foreground mt-4">
              Do not close this window
            </p>
          </div>
        );

      case "success":
        return (
          <div className="flex flex-col items-center justify-center py-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", duration: 0.5 }}
            >
              <div className="h-16 w-16 rounded-full bg-success/10 flex items-center justify-center mb-4">
                <CheckCircle2 className="h-8 w-8 text-success" />
              </div>
            </motion.div>
            <h3 className="text-lg font-semibold mb-2">Submission Successful!</h3>
            <p className="text-sm text-muted-foreground text-center mb-6">
              Your contribution has been submitted to the blockchain
            </p>
            
            {txHash && (
              <div className="w-full space-y-2">
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground mb-1">Transaction Hash:</p>
                    <code className="text-xs font-mono break-all">
                      {txHash.slice(0, 10)}...{txHash.slice(-8)}
                    </code>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open(`https://etherscan.io/tx/${txHash}`, "_blank")}
                    className="shrink-0 ml-2"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  Your contribution is now pending review by verifiers
                </p>
              </div>
            )}
          </div>
        );

      case "error":
        return (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Submission Failed</h3>
            <p className="text-sm text-muted-foreground text-center mb-4">
              {error || "An error occurred while submitting your contribution"}
            </p>
            <Alert variant="destructive" className="w-full">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                {error?.includes("rejected") && "Transaction was rejected. Please try again."}
                {error?.includes("NonceAlreadyUsed") && "This contribution has already been submitted."}
                {error?.includes("insufficient") && "Insufficient gas. Please add funds to your wallet."}
                {!error?.includes("rejected") && !error?.includes("NonceAlreadyUsed") && !error?.includes("insufficient") && 
                  "Please check your wallet and try again."}
              </AlertDescription>
            </Alert>
          </div>
        );

      default:
        return null;
    }
  };

  const getFooterButtons = () => {
    switch (step) {
      case "generating":
        return null;

      case "confirming":
        return (
          <>
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={onConfirm} disabled={loading || !backendId}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Confirming...
                </>
              ) : (
                "Confirm & Submit"
              )}
            </Button>
          </>
        );

      case "submitting":
        return (
          <Button disabled>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Processing...
          </Button>
        );

      case "success":
        return (
          <Button onClick={onClose} className="w-full">
            Done
          </Button>
        );

      case "error":
        return (
          <>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={onConfirm}>
              Try Again
            </Button>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-125">
        <DialogHeader>
          <DialogTitle>
            {step === "generating" && "Preparing Submission"}
            {step === "confirming" && "Confirm Submission"}
            {step === "submitting" && "Submitting..."}
            {step === "success" && "Success!"}
            {step === "error" && "Error"}
          </DialogTitle>
          <DialogDescription>
            {step === "generating" && "Setting up your contribution submission"}
            {step === "confirming" && "Review your contribution before submitting to the blockchain"}
            {step === "submitting" && "Processing your transaction"}
            {step === "success" && "Your contribution has been successfully submitted"}
            {step === "error" && "Something went wrong with your submission"}
          </DialogDescription>
        </DialogHeader>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {getStepContent()}
          </motion.div>
        </AnimatePresence>

        <DialogFooter>
          {getFooterButtons()}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};