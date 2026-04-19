import { Transaction, ReceiptSettings, WhatsAppSettings } from '../types';

// Helper for WA formatting
const formatCurrencyWA = (amount: number) => `Rp ${new Intl.NumberFormat('id-ID').format(amount)}`;


export const generateWhatsAppLink = (transaction: Transaction, whatsAppSettings: WhatsAppSettings, receiptSettings: ReceiptSettings): string => {
    const contact = transaction.customerContact?.replace(/[^0-9]/g, '');
    if (!contact) {
        alert('Nomor kontak pelanggan tidak tersedia.');
        return '#';
    }
    
    // Assume Indonesian country code if not present (08... -> 628...)
    const whatsappNumber = contact.startsWith('62') ? contact : `62${contact.substring(contact.startsWith('0') ? 1 : 0)}`;

    const template = whatsAppSettings.notificationTemplates?.[transaction.status] 
        || 'Halo {nama_pelanggan}, status pesanan Anda #{nomor_pesanan} sekarang adalah *{status_pesanan}*.';

    const message = template
        .replace(/{nama_pelanggan}/g, transaction.customerName)
        .replace(/{nomor_pesanan}/g, transaction.orderNumber || transaction.id.slice(-4))
        .replace(/{status_pesanan}/g, transaction.status)
        .replace(/{nama_usaha}/g, receiptSettings.companyName)
        .replace(/{total_belanja}/g, formatCurrencyWA(transaction.grandTotal))
        .replace(/{sisa_bayar}/g, formatCurrencyWA(transaction.remainingBalance || 0));
        
    const encodedMessage = encodeURIComponent(message);
    
    return `https://wa.me/${whatsappNumber}?text=${encodedMessage}`;
};

export const generateWhatsAppReminderLink = (transaction: Transaction, whatsAppSettings: WhatsAppSettings, receiptSettings: ReceiptSettings): string => {
    const contact = transaction.customerContact?.replace(/[^0-9]/g, '');
    if (!contact) {
        alert('Nomor kontak pelanggan tidak tersedia.');
        return '#';
    }
    const whatsappNumber = contact.startsWith('62') ? contact : `62${contact.substring(contact.startsWith('0') ? 1 : 0)}`;

    const template = whatsAppSettings.notificationTemplates?.['Pengingat Bayar'] 
        || 'Halo {nama_pelanggan}, kami ingin mengingatkan mengenai sisa pembayaran untuk pesanan #{nomor_pesanan} sebesar {sisa_bayar}. Mohon untuk segera dilunasi. Terima kasih. - {nama_usaha}';

    const message = template
        .replace(/{nama_pelanggan}/g, transaction.customerName)
        .replace(/{nomor_pesanan}/g, transaction.orderNumber || transaction.id.slice(-4))
        .replace(/{status_pesanan}/g, transaction.status)
        .replace(/{nama_usaha}/g, receiptSettings.companyName)
        .replace(/{total_belanja}/g, formatCurrencyWA(transaction.grandTotal))
        .replace(/{sisa_bayar}/g, formatCurrencyWA(transaction.remainingBalance || 0));
        
    const encodedMessage = encodeURIComponent(message);
    
    return `https://wa.me/${whatsappNumber}?text=${encodedMessage}`;
};

export const generateWhatsAppReceiptLink = (transaction: Transaction, receiptSettings: ReceiptSettings): string => {
    const contact = transaction.customerContact?.replace(/[^0-9]/g, '');
    if (!contact) {
        alert('Nomor kontak pelanggan tidak tersedia.');
        return '#';
    }
    
    // Assume Indonesian country code if not present (08... -> 628...)
    const whatsappNumber = contact.startsWith('62') ? contact : `62${contact.substring(contact.startsWith('0') ? 1 : 0)}`;

    let message = `*${receiptSettings.companyName}*\n`;
    if (receiptSettings.companyAddress) message += `${receiptSettings.companyAddress}\n`;
    if (receiptSettings.companyPhone) message += `${receiptSettings.companyPhone}\n`;
    message += `\n*--- STRUK PEMBAYARAN ---*\n\n`;

    message += `No. Trx: *${transaction.orderNumber || transaction.id.slice(-4)}*\n`;
    message += `Tanggal: ${new Date(transaction.timestamp).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour:'2-digit', minute:'2-digit'})}\n`;
    message += `Pelanggan: ${transaction.customerName}\n`;
    message += `Kasir: ${receiptSettings.cashierName}\n`;
    message += `-----------------------------------\n\n`;

    transaction.items.forEach(item => {
        message += `*${item.serviceName}*\n`;
        let detailLine = `${item.quantity} x ${formatCurrencyWA(item.pricePerUnit)}`;
        if (item.area) {
            detailLine += ` x ${item.area}${item.unit}`;
        }
        detailLine += ` = *${formatCurrencyWA(item.total + (item.discount || 0))}*\n`;
        message += detailLine;
        if ((item.discount || 0) > 0) {
            message += `  Diskon: -${formatCurrencyWA(item.discount as number)}\n`;
        }
        message += `\n`;
    });

    message += `-----------------------------------\n`;
    message += `Subtotal: ${formatCurrencyWA(transaction.subtotal)}\n`;
    if ((transaction.discount || 0) > 0) {
        message += `Diskon: -${formatCurrencyWA(transaction.discount as number)}\n`;
    }
    if (receiptSettings.isTaxEnabled && transaction.tax > 0) {
        message += `Pajak (${receiptSettings.taxRate}%): ${formatCurrencyWA(transaction.tax)}\n`;
    }
    message += `\n*Total: ${formatCurrencyWA(transaction.grandTotal)}*\n`;
    
    const isPaidOff = (transaction.remainingBalance ?? 0) <= 0;
    
    if ((transaction.downPayment || 0) > 0) {
        message += `DP Dibayar: ${formatCurrencyWA(transaction.downPayment as number)}\n`;
        message += `*Sisa Bayar: ${formatCurrencyWA(transaction.remainingBalance as number)}*\n`;
    }
    
    message += `-----------------------------------\n`;
    message += `Bayar (${transaction.paymentMethod}): ${formatCurrencyWA(transaction.paymentAmount)}\n`;
    if (transaction.paymentMethod === 'Tunai') {
        message += `Kembali: ${formatCurrencyWA(transaction.change < 0 ? 0 : transaction.change)}\n`;
    }
    
    message += `\n*Status: ${isPaidOff ? 'LUNAS' : 'BELUM LUNAS'}*\n`;

    message += `\n${receiptSettings.footerMessage}\n`;

    const encodedMessage = encodeURIComponent(message);
    
    return `https://wa.me/${whatsappNumber}?text=${encodedMessage}`;
};