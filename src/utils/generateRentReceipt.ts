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

// Helper function to wrap text within a max width
const wrapText = (doc: jsPDF, text: string, maxWidth: number): string[] => {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  words.forEach(word => {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const testWidth = doc.getTextWidth(testLine);
    
    if (testWidth > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  });
  
  if (currentLine) {
    lines.push(currentLine);
  }
  
  return lines;
};

export const generateRentReceipt = (data: ReceiptData) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const leftMargin = 20;
  const rightMargin = 20;
  const contentWidth = pageWidth - leftMargin - rightMargin;
  const leftColWidth = 80;
  const rightCol = 115;
  const rightColWidth = 70;
  const lineHeight = 6;
  
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
  
  let currentY = 55;
  
  // Left column - PG Details
  doc.setFont('helvetica', 'bold');
  doc.text('FROM:', leftMargin, currentY);
  currentY += lineHeight;
  
  doc.setFont('helvetica', 'normal');
  
  // PG Name with wrapping
  const pgNameLines = wrapText(doc, data.pgName, leftColWidth);
  pgNameLines.forEach(line => {
    doc.text(line, leftMargin, currentY);
    currentY += lineHeight;
  });
  
  // PG Address with wrapping
  const addressLines = wrapText(doc, data.pgAddress, leftColWidth);
  addressLines.forEach(line => {
    doc.text(line, leftMargin, currentY);
    currentY += lineHeight;
  });
  
  // City
  if (data.pgCity) {
    doc.text(data.pgCity, leftMargin, currentY);
    currentY += lineHeight;
  }
  
  // Owner info
  const ownerText = `Owner: ${data.ownerName}`;
  const ownerLines = wrapText(doc, ownerText, leftColWidth);
  ownerLines.forEach(line => {
    doc.text(line, leftMargin, currentY);
    currentY += lineHeight;
  });
  
  if (data.ownerContact) {
    doc.text(`Contact: ${data.ownerContact}`, leftMargin, currentY);
    currentY += lineHeight;
  }
  
  const leftColEndY = currentY;
  
  // Right column - Guest Details
  let rightY = 55;
  doc.setFont('helvetica', 'bold');
  doc.text('TO:', rightCol, rightY);
  rightY += lineHeight;
  
  doc.setFont('helvetica', 'normal');
  
  // Guest Name with wrapping
  const guestNameLines = wrapText(doc, data.guestName, rightColWidth);
  guestNameLines.forEach(line => {
    doc.text(line, rightCol, rightY);
    rightY += lineHeight;
  });
  
  if (data.guestPhone) {
    doc.text(data.guestPhone, rightCol, rightY);
    rightY += lineHeight;
  }
  
  // Use the maximum Y from both columns for separator
  const separatorY = Math.max(leftColEndY, rightY) + 5;
  
  // Separator line
  doc.setDrawColor(200, 200, 200);
  doc.line(leftMargin, separatorY, pageWidth - rightMargin, separatorY);
  
  // Payment details section
  const paymentY = separatorY + 10;
  const paymentMonth = data.paymentMonth || data.month;
  const paymentDate = data.paymentDate || data.paidDate;
  const purpose = data.paymentPurpose || 'rent';
  
  // Calculate height needed for payment details
  let paymentDetailsHeight = 45;
  if (data.transactionId && data.transactionId.length > 20) {
    paymentDetailsHeight += 6;
  }
  
  doc.setFillColor(245, 245, 245);
  doc.rect(leftMargin, paymentY - 5, contentWidth, paymentDetailsHeight, 'F');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('PAYMENT DETAILS', leftMargin + 5, paymentY + 5);
  
  doc.setFontSize(10);
  
  let detailY = paymentY + 15;
  const labelX = leftMargin + 5;
  const valueX = leftMargin + 50;
  const maxValueWidth = contentWidth - 55;
  
  // Purpose
  doc.setFont('helvetica', 'normal');
  doc.text('Purpose:', labelX, detailY);
  doc.setFont('helvetica', 'bold');
  doc.text(purpose.charAt(0).toUpperCase() + purpose.slice(1), valueX, detailY);
  detailY += lineHeight + 2;
  
  // Payment Month
  doc.setFont('helvetica', 'normal');
  doc.text('Month:', labelX, detailY);
  doc.setFont('helvetica', 'bold');
  doc.text(paymentMonth ? format(new Date(paymentMonth), 'MMMM yyyy') : 'N/A', valueX, detailY);
  detailY += lineHeight + 2;
  
  // Transaction ID with wrapping if too long
  if (data.transactionId) {
    doc.setFont('helvetica', 'normal');
    doc.text('Transaction ID:', labelX, detailY);
    doc.setFont('helvetica', 'bold');
    
    if (doc.getTextWidth(data.transactionId) > maxValueWidth) {
      const txnLines = wrapText(doc, data.transactionId, maxValueWidth);
      txnLines.forEach((line, index) => {
        doc.text(line, valueX, detailY + (index * lineHeight));
      });
      detailY += (txnLines.length * lineHeight) + 2;
    } else {
      doc.text(data.transactionId, valueX, detailY);
      detailY += lineHeight + 2;
    }
  }
  
  // Payment Date
  if (paymentDate) {
    doc.setFont('helvetica', 'normal');
    doc.text('Payment Date:', labelX, detailY);
    doc.setFont('helvetica', 'bold');
    doc.text(format(new Date(paymentDate), 'PPP'), valueX, detailY);
    detailY += lineHeight + 2;
  }
  
  // Amount section
  const amountY = paymentY + paymentDetailsHeight + 10;
  
  doc.setFillColor(34, 34, 34);
  doc.rect(leftMargin, amountY, contentWidth, 25, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('AMOUNT PAID', leftMargin + 5, amountY + 16);
  
  doc.setFontSize(20);
  doc.text(`₹${data.amount.toLocaleString()}`, pageWidth - rightMargin - 5, amountY + 16, { align: 'right' });
  
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
