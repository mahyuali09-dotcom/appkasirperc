import { Transaction, ReceiptSettings } from '../types';

const formatNumber = (amount: number) => new Intl.NumberFormat('id-ID').format(amount);

export const generateReceiptHTML = (
    transaction: Transaction,
    receiptSettings: ReceiptSettings,
    logo: string | null
): string => {
    const formattedDate = new Date(transaction.timestamp).toLocaleDateString('id-ID');
    const formattedTime = new Date(transaction.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

    const itemsHtml = transaction.items.map(item => `
        <div class="item">
            <div class="item-name">${item.serviceName}${item.area ? ` (${item.area} ${item.unit})` : ''}</div>
            <div class="item-details">
                <span>${item.quantity} x ${formatNumber(item.pricePerUnit)}</span>
                <span>${formatNumber(item.total + (item.discount || 0))}</span>
            </div>
            ${(item.discount || 0) > 0 ? `
            <div class="item-details discount">
                <span>Diskon</span>
                <span>-${formatNumber(item.discount as number)}</span>
            </div>
            ` : ''}
        </div>
    `).join('');

    return `
        <html>
        <head>
            <title>Struk</title>
            <style>
                body { 
                    font-family: 'monospace', 'Courier New'; 
                    width: 300px; 
                    font-size: 12px;
                    color: #000;
                }
                .center { text-align: center; }
                .separator { border-top: 1px dashed #000; margin: 8px 0; }
                .header p { margin: 2px 0; }
                .header .company-name { font-weight: bold; }
                .item { margin-bottom: 5px; }
                .item-name { margin-bottom: 2px; }
                .item-details { display: flex; justify-content: space-between; }
                .item-details.discount { font-size: 11px; }
                .summary-row { display: flex; justify-content: space-between; font-weight: bold; margin: 2px 0;}
                .summary-row-light { display: flex; justify-content: space-between; margin: 2px 0;}
                .logo { max-width: 180px; max-height: 70px; margin: 0 auto 10px; }
            </style>
        </head>
        <body>
            <div class="center header">
                ${logo ? `<img src="${logo}" alt="Logo" class="logo">` : ''}
                <p class="company-name">${receiptSettings.companyName || ''}</p>
                <p>${receiptSettings.companyAddress || ''}</p>
                <p>${receiptSettings.companyPhone || ''}</p>
            </div>
            <div class="separator"></div>
            <div>
                <p>Tanggal: ${formattedDate} ${formattedTime}</p>
                <p>Kasir : ${receiptSettings.cashierName}</p>
                <p>No Trx : ${transaction.orderNumber || ''}</p>
                <p>Pelanggan : ${transaction.customerName}</p>
                ${transaction.customerContact ? `<p>Kontak : ${transaction.customerContact}</p>` : ''}
                <p>Jenis : ${transaction.customerType || 'Pelanggan Baru'}</p>
                <p>File : ${transaction.fileType || 'Ada'}</p>
                ${transaction.paymentNotes ? `<p>Keterangan: ${transaction.paymentNotes}</p>` : ''}
            </div>
            <div class="separator"></div>
            ${itemsHtml}
            <div class="separator"></div>
            <div>
                <div class="summary-row-light">
                    <span>Subtotal</span>
                    <span>${formatNumber(transaction.subtotal)}</span>
                </div>
                ${(transaction.discount || 0) > 0 ? `
                <div class="summary-row-light">
                    <span>Diskon</span>
                    <span>-${formatNumber(transaction.discount as number)}</span>
                </div>
                ` : ''}
                ${receiptSettings.isTaxEnabled && transaction.tax > 0 ? `
                <div class="summary-row-light">
                    <span>Pajak (${receiptSettings.taxRate}%)</span>
                    <span>${formatNumber(transaction.tax)}</span>
                </div>
                ` : ''}
                <div class="summary-row">
                    <span>Total</span>
                    <span>${formatNumber(transaction.grandTotal)}</span>
                </div>
                ${(transaction.downPayment || 0) > 0 ? `
                <div class="summary-row-light">
                    <span>DP Dibayar</span>
                    <span>${formatNumber(transaction.downPayment as number)}</span>
                </div>
                <div class="summary-row">
                    <span>Sisa Bayar</span>
                    <span>${formatNumber(transaction.remainingBalance as number)}</span>
                </div>
                `: ''}
                <div class="separator"></div>
                 <div class="summary-row-light">
                    <span>${transaction.paymentMethod === 'Tunai' ? 'TUNAI' : 'TRANSFER'}</span>
                    <span>${formatNumber(transaction.paymentAmount)}</span>
                </div>
                ${transaction.paymentMethod === 'Tunai' ? `
                <div class="summary-row-light">
                    <span>Kembalian</span>
                    <span>${formatNumber(transaction.change < 0 ? 0 : transaction.change)}</span>
                </div>
                ` : ''}
            </div>
            <div class="separator"></div>
            <div class="center">
                <p>${receiptSettings.footerMessage}</p>
            </div>
        </body>
        </html>
    `;
};


export const printReceipt = (htmlContent: string) => {
    const receiptWindow = window.open('', 'PRINT', 'height=600,width=400');
    if (!receiptWindow) {
        alert("Gagal membuka jendela cetak. Pastikan pop-up diizinkan.");
        return;
    }
    receiptWindow.document.write(htmlContent);
    receiptWindow.document.close();
    receiptWindow.focus();
    setTimeout(() => { // Timeout needed for images to load
        receiptWindow.print();
        receiptWindow.close();
    }, 500);
};
