import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, X } from "lucide-react";
import { generateRentReceipt } from "@/utils/generateRentReceipt";

interface ReceiptData {
  guestName: string;
  guestPhone?: string;
  pgName: string;
  pgAddress: string;
  pgCity?: string;
  ownerName: string;
  ownerContact?: string;
  amount: number;
  paymentPurpose?: string;
  paymentMonth?: string | null;
  transactionId?: string;
  paymentDate?: string;
  status?: string;
}

interface ReceiptPreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: ReceiptData | null;
}

const ReceiptPreview = ({ open, onOpenChange, data }: ReceiptPreviewProps) => {
  if (!data) return null;

  const handleDownload = () => {
    generateRentReceipt(data);
    onOpenChange(false);
  };

  const purpose = data.paymentPurpose || "rent";
  const formattedMonth = data.paymentMonth
    ? format(new Date(data.paymentMonth), "MMMM yyyy")
    : "N/A";
  const formattedDate = data.paymentDate
    ? format(new Date(data.paymentDate), "PPP")
    : "N/A";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">Receipt Preview</DialogTitle>
        </DialogHeader>

        {/* Receipt Preview Card */}
        <div className="bg-background border border-border rounded-lg overflow-hidden">
          {/* Header */}
          <div className="bg-foreground text-background p-4 text-center">
            <h2 className="text-lg font-bold">PAYMENT RECEIPT</h2>
          </div>

          {/* Content */}
          <div className="p-4 space-y-4">
            {/* From/To Section */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-semibold text-foreground mb-1">FROM:</p>
                <p className="text-muted-foreground">{data.pgName}</p>
                <p className="text-muted-foreground text-xs">{data.pgAddress}</p>
                {data.pgCity && (
                  <p className="text-muted-foreground text-xs">{data.pgCity}</p>
                )}
                <p className="text-muted-foreground text-xs mt-1">
                  Owner: {data.ownerName}
                </p>
              </div>
              <div>
                <p className="font-semibold text-foreground mb-1">TO:</p>
                <p className="text-muted-foreground">{data.guestName}</p>
                {data.guestPhone && (
                  <p className="text-muted-foreground text-xs">{data.guestPhone}</p>
                )}
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-border" />

            {/* Payment Details */}
            <div className="bg-muted/50 rounded-lg p-3 space-y-2">
              <p className="font-semibold text-foreground text-sm">PAYMENT DETAILS</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-muted-foreground">Purpose:</span>
                  <span className="ml-2 font-medium text-foreground capitalize">
                    {purpose}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Month:</span>
                  <span className="ml-2 font-medium text-foreground">
                    {formattedMonth}
                  </span>
                </div>
                {data.transactionId && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Transaction ID:</span>
                    <span className="ml-2 font-medium text-foreground font-mono">
                      {data.transactionId}
                    </span>
                  </div>
                )}
                <div className="col-span-2">
                  <span className="text-muted-foreground">Payment Date:</span>
                  <span className="ml-2 font-medium text-foreground">
                    {formattedDate}
                  </span>
                </div>
              </div>
            </div>

            {/* Amount */}
            <div className="bg-foreground text-background rounded-lg p-3 flex items-center justify-between">
              <span className="font-semibold">AMOUNT PAID</span>
              <span className="text-xl font-bold">
                ₹{data.amount.toLocaleString()}
              </span>
            </div>

            {/* Footer note */}
            <p className="text-[10px] text-muted-foreground text-center">
              This is a computer-generated receipt and does not require a signature.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button
            variant="outline"
            className="flex-1 border-border"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-4 w-4 mr-2" />
            Close
          </Button>
          <Button
            className="flex-1 bg-foreground text-background hover:bg-foreground/90"
            onClick={handleDownload}
          >
            <Download className="h-4 w-4 mr-2" />
            Download PDF
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReceiptPreview;
