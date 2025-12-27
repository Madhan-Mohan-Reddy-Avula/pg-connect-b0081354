import jsPDF from 'jspdf';
import { format } from 'date-fns';

interface ReceiptData {
  guestName: string;
  guestPhone: string;
  pgName: string;
  pgAddress: string;
  ownerName: string;
  amount: number;
  month: string;
  paidDate: string | null;
  receiptId: string;
}

export function generateRentReceipt(data: ReceiptData): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Header
  doc.setFillColor(0, 0, 0);
  doc.rect(0, 0, pageWidth, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('RENT RECEIPT', pageWidth / 2, 25, { align: 'center' });
  
  // Receipt info
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  const receiptDate = data.paidDate ? format(new Date(data.paidDate), 'dd MMMM yyyy') : format(new Date(), 'dd MMMM yyyy');
  doc.text(`Receipt No: ${data.receiptId.substring(0, 8).toUpperCase()}`, 20, 55);
  doc.text(`Date: ${receiptDate}`, pageWidth - 20, 55, { align: 'right' });
  
  // Divider line
  doc.setDrawColor(200, 200, 200);
  doc.line(20, 62, pageWidth - 20, 62);
  
  // PG Details
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('FROM', 20, 75);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text(data.pgName, 20, 85);
  doc.setFontSize(10);
  doc.text(data.pgAddress, 20, 92);
  doc.text(`Owner: ${data.ownerName}`, 20, 99);
  
  // Guest Details
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('TO', 20, 120);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text(data.guestName, 20, 130);
  doc.setFontSize(10);
  doc.text(`Phone: ${data.guestPhone}`, 20, 137);
  
  // Payment Details Box
  doc.setFillColor(245, 245, 245);
  doc.roundedRect(20, 155, pageWidth - 40, 60, 3, 3, 'F');
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('PAYMENT DETAILS', 30, 170);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  
  const monthFormatted = format(new Date(data.month), 'MMMM yyyy');
  doc.text('Rent for month:', 30, 185);
  doc.text(monthFormatted, 100, 185);
  
  doc.text('Amount:', 30, 195);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(`₹${data.amount.toLocaleString()}`, 100, 195);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('Status:', 30, 205);
  doc.text(data.paidDate ? 'PAID' : 'PENDING', 100, 205);
  
  // Amount in words
  const amountInWords = numberToWords(data.amount);
  doc.setFontSize(9);
  doc.text(`Amount in words: ${amountInWords} Rupees Only`, 20, 230);
  
  // Footer
  doc.setDrawColor(200, 200, 200);
  doc.line(20, 250, pageWidth - 20, 250);
  
  doc.setFontSize(9);
  doc.text('This is a computer-generated receipt and does not require a signature.', pageWidth / 2, 260, { align: 'center' });
  
  // Authorized signature area
  doc.setFontSize(10);
  doc.text('Authorized Signature', pageWidth - 50, 280, { align: 'center' });
  doc.line(pageWidth - 80, 275, pageWidth - 20, 275);
  
  // Save
  const fileName = `Rent_Receipt_${data.guestName.replace(/\s+/g, '_')}_${monthFormatted.replace(/\s+/g, '_')}.pdf`;
  doc.save(fileName);
}

function numberToWords(num: number): string {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  
  if (num === 0) return 'Zero';
  
  const convertLessThanThousand = (n: number): string => {
    if (n === 0) return '';
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
    return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + convertLessThanThousand(n % 100) : '');
  };
  
  if (num < 1000) return convertLessThanThousand(num);
  if (num < 100000) {
    const thousands = Math.floor(num / 1000);
    const remainder = num % 1000;
    return convertLessThanThousand(thousands) + ' Thousand' + (remainder ? ' ' + convertLessThanThousand(remainder) : '');
  }
  if (num < 10000000) {
    const lakhs = Math.floor(num / 100000);
    const remainder = num % 100000;
    return convertLessThanThousand(lakhs) + ' Lakh' + (remainder ? ' ' + numberToWords(remainder) : '');
  }
  
  const crores = Math.floor(num / 10000000);
  const remainder = num % 10000000;
  return convertLessThanThousand(crores) + ' Crore' + (remainder ? ' ' + numberToWords(remainder) : '');
}
