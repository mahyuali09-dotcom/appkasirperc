import React from 'react';
import { Transaction, ReceiptSettings } from '../types';
import { STATUS_COLORS } from '../constants';

interface ShareableReceiptProps {
    transaction: Transaction;
    receiptSettings: ReceiptSettings;
    logo: string | null;
}

const formatCurrency = (amount: number) => `Rp ${new Intl.NumberFormat('id-ID').format(amount)}`;

const ShareableReceipt: React.FC<ShareableReceiptProps> = ({ transaction, receiptSettings, logo }) => {
    
    return (
        <div className="bg-white text-slate-800 p-8 shadow-lg font-sans" style={{ width: '680px' }}>
            {/* Header */}
            <header className="flex justify-between items-start pb-6 border-b-2 border-slate-200">
                <div className="flex items-center">
                    {logo && <img src={logo} alt="Logo" className="h-16 w-auto mr-6" />}
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">{receiptSettings.companyName}</h1>
                        <p className="text-sm text-slate-500">{receiptSettings.companyAddress}</p>
                        <p className="text-sm text-slate-500">{receiptSettings.companyPhone}</p>
                    </div>
                </div>
                <div className="text-right">
                    <h2 className="text-3xl font-bold uppercase text-slate-400">Struk</h2>
                    <p className="text-sm text-slate-500 mt-1"># {transaction.orderNumber}</p>
                </div>
            </header>

            {/* Customer & Transaction Info */}
            <section className="grid grid-cols-2 gap-8 my-6">
                <div>
                    <h3 className="text-sm font-semibold uppercase text-slate-500 mb-2">Ditagihkan Kepada:</h3>
                    <p className="text-lg font-bold text-slate-800">{transaction.customerName}</p>
                    {transaction.customerContact && <p className="text-sm text-slate-600">{transaction.customerContact}</p>}
                    <p className="text-sm text-slate-600">{transaction.customerType}</p>
                </div>
                <div className="text-right">
                    <div className="mb-2">
                        <span className="text-sm font-semibold uppercase text-slate-500">Tanggal Transaksi: </span>
                        <span className="text-sm font-medium text-slate-700">{new Date(transaction.timestamp).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
                    </div>
                    <div>
                        <span className="text-sm font-semibold uppercase text-slate-500">Status Pesanan: </span>
                        <span className={`text-sm font-bold px-2 py-1 rounded-full ${STATUS_COLORS[transaction.status]}`}>{transaction.status}</span>
                    </div>
                </div>
            </section>

            {/* Items Table */}
            <section>
                <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="p-3 text-left font-semibold uppercase text-slate-600">Deskripsi</th>
                            <th className="p-3 text-right font-semibold uppercase text-slate-600">Kuantitas</th>
                            <th className="p-3 text-right font-semibold uppercase text-slate-600">Harga Satuan</th>
                            <th className="p-3 text-right font-semibold uppercase text-slate-600">Diskon</th>
                            <th className="p-3 text-right font-semibold uppercase text-slate-600">Total</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                        {transaction.items.map(item => (
                            <tr key={item.id}>
                                <td className="p-3">
                                    <p className="font-medium text-slate-800">{item.serviceName}</p>
                                    {item.area && <p className="text-xs text-slate-500">{item.area} {item.unit}</p>}
                                </td>
                                <td className="p-3 text-right">{item.quantity}</td>
                                <td className="p-3 text-right">{formatCurrency(item.pricePerUnit)}</td>
                                <td className="p-3 text-right text-green-600">{formatCurrency(item.discount || 0)}</td>
                                <td className="p-3 text-right font-semibold">{formatCurrency(item.total)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </section>

            {/* Summary */}
            <section className="flex justify-end mt-6">
                <div className="w-full max-w-xs space-y-2 text-sm">
                    <div className="flex justify-between">
                        <span className="text-slate-600">Subtotal:</span>
                        <span className="font-medium text-slate-800">{formatCurrency(transaction.subtotal)}</span>
                    </div>
                     {(transaction.discount || 0) > 0 && (
                        <div className="flex justify-between text-green-600">
                            <span >Total Diskon:</span>
                            <span className="font-medium">-{formatCurrency(transaction.discount as number)}</span>
                        </div>
                    )}
                    {receiptSettings.isTaxEnabled && transaction.tax > 0 && (
                        <div className="flex justify-between">
                            <span className="text-slate-600">Pajak ({receiptSettings.taxRate}%):</span>
                            <span className="font-medium text-slate-800">{formatCurrency(transaction.tax)}</span>
                        </div>
                    )}
                    <div className="pt-2 mt-2 border-t-2 border-slate-200 flex justify-between">
                        <span className="text-lg font-bold text-slate-900">Grand Total:</span>
                        <span className="text-lg font-bold text-slate-900">{formatCurrency(transaction.grandTotal)}</span>
                    </div>
                     {(transaction.downPayment || 0) > 0 && (
                        <>
                            <div className="flex justify-between">
                                <span className="text-slate-600">DP Dibayar:</span>
                                <span className="font-medium text-green-600">{formatCurrency(transaction.downPayment as number)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="font-bold text-red-600">Sisa Bayar:</span>
                                <span className="font-bold text-red-600">{formatCurrency(transaction.remainingBalance as number)}</span>
                            </div>
                        </>
                    )}
                </div>
            </section>
            
            {/* Footer */}
            <footer className="mt-8 pt-6 border-t-2 border-slate-200 text-sm text-slate-500">
                {transaction.paymentNotes && (
                    <div className="mb-4">
                        <h4 className="font-semibold text-slate-600">Catatan:</h4>
                        <p>{transaction.paymentNotes}</p>
                    </div>
                )}
                 <div className="mb-4">
                    <p>Metode Pembayaran: <span className="font-semibold text-slate-700">{transaction.paymentMethod}</span></p>
                </div>
                <div className="text-center">
                    <p>{receiptSettings.footerMessage}</p>
                </div>
            </footer>
        </div>
    );
};

export default ShareableReceipt;
