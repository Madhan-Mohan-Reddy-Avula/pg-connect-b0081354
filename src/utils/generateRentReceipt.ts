import jsPDF from 'jspdf';
import { format } from 'date-fns';

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
  month?: string;
  transactionId?: string;
  paymentDate?: string;
  paidDate?: string | null;
  receiptId?: string;
  status?: string;
}

export const generateRentReceipt = (data: ReceiptData) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Header
  doc.setFillColor(34, 34, 34);
  doc.rect(0, 0, pageWidth, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('PAYMENT RECEIPT', pageWidth / 2, 25, { align: 'center' });
  
  // Receipt details
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  const startY = 55;
  const leftCol = 20;
  const rightCol = 110;
  const lineHeight = 8;
  
  // Left column - PG Details
  doc.setFont('helvetica', 'bold');
  doc.text('FROM:', leftCol, startY);
  doc.setFont('helvetica', 'normal');
  doc.text(data.pgName, leftCol, startY + lineHeight);
  doc.text(data.pgAddress, leftCol, startY + lineHeight * 2);
  if (data.pgCity) doc.text(data.pgCity, leftCol, startY + lineHeight * 3);
  doc.text(`Owner: ${data.ownerName}`, leftCol, startY + lineHeight * 4);
  if (data.ownerContact) doc.text(`Contact: ${data.ownerContact}`, leftCol, startY + lineHeight * 5);
  
  // Right column - Guest Details
  doc.setFont('helvetica', 'bold');
  doc.text('TO:', rightCol, startY);
  doc.setFont('helvetica', 'normal');
  doc.text(data.guestName, rightCol, startY + lineHeight);
  if (data.guestPhone) doc.text(data.guestPhone, rightCol, startY + lineHeight * 2);
  
  // Separator line
  doc.setDrawColor(200, 200, 200);
  doc.line(20, startY + lineHeight * 7, pageWidth - 20, startY + lineHeight * 7);
  
  // Payment details section
  const paymentY = startY + lineHeight * 9;
  const paymentMonth = data.paymentMonth || data.month;
  const paymentDate = data.paymentDate || data.paidDate;
  const purpose = data.paymentPurpose || 'rent';
  
  doc.setFillColor(245, 245, 245);
  doc.rect(20, paymentY - 5, pageWidth - 40, 50, 'F');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('PAYMENT DETAILS', 25, paymentY + 5);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  const detailsY = paymentY + 15;
  
  doc.text('Purpose:', 25, detailsY);
  doc.setFont('helvetica', 'bold');
  doc.text(purpose.charAt(0).toUpperCase() + purpose.slice(1), 70, detailsY);
  
  doc.setFont('helvetica', 'normal');
  doc.text('Payment Month:', 25, detailsY + lineHeight);
  doc.setFont('helvetica', 'bold');
  doc.text(paymentMonth ? format(new Date(paymentMonth), 'MMMM yyyy') : 'N/A', 70, detailsY + lineHeight);
  
  if (data.transactionId) {
    doc.setFont('helvetica', 'normal');
    doc.text('Transaction ID:', 25, detailsY + lineHeight * 2);
    doc.setFont('helvetica', 'bold');
    doc.text(data.transactionId, 70, detailsY + lineHeight * 2);
  }
  
  if (paymentDate) {
    doc.setFont('helvetica', 'normal');
    doc.text('Payment Date:', 25, detailsY + lineHeight * 3);
    doc.setFont('helvetica', 'bold');
    doc.text(format(new Date(paymentDate), 'PPP'), 70, detailsY + lineHeight * 3);
  }
  
  // Amount section
  doc.setTextColor(0, 0, 0);
  const amountY = paymentY + 60;
  
  doc.setFillColor(34, 34, 34);
  doc.rect(20, amountY, pageWidth - 40, 25, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('AMOUNT PAID', 25, amountY + 16);
  
  doc.setFontSize(20);
  doc.text(`₹${data.amount.toLocaleString()}`, pageWidth - 25, amountY + 16, { align: 'right' });
  
  // Footer
  doc.setTextColor(128, 128, 128);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('This is a computer-generated receipt and does not require a signature.', pageWidth / 2, 280, { align: 'center' });
  doc.text(`Generated on ${format(new Date(), 'PPP p')}`, pageWidth / 2, 286, { align: 'center' });
  
  // Save the PDF
  const fileName = `Receipt_${purpose}_${paymentMonth ? format(new Date(paymentMonth), 'MMM_yyyy') : 'payment'}.pdf`;
  doc.save(fileName);
};
