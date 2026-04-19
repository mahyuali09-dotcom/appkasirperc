import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import useLocalStorage from '../hooks/useLocalStorage';
import { useApp } from '../src/context/AppContext';
import { Transaction, WhatsAppSettings, ReceiptSettings } from '../types';
import Card from '../components/ui/Card';
import ConfirmationModal from '../components/modals/ConfirmationModal';
import { generateWhatsAppReminderLink } from '../utils/whatsapp';
import { DEFAULT_WHATSAPP_SETTINGS, DEFAULT_RECEIPT_SETTINGS } from '../constants';

const ReceivablesPage: React.FC = () => {
    const { 
        transactions, 
        updateTransaction, 
        whatsappSettings: whatsAppSettings, 
        receiptSettings 
    } = useApp();
    const navigate = useNavigate();

    const [searchQuery, setSearchQuery] = useState('');
    const [transactionToMarkAsPaid, setTransactionToMarkAsPaid] = useState<Transaction | null>(null);
    const [expandedCustomers, setExpandedCustomers] = useState<Set<string>>(new Set());
    
    const formatCurrency = (amount: number) => `Rp ${new Intl.NumberFormat('id-ID').format(amount)}`;

    const receivableTransactions = useMemo(() => 
        transactions.filter(t => (t.remainingBalance ?? 0) > 0), 
    [transactions]);

    const receivablesByCustomer = useMemo(() => {
        const grouped = receivableTransactions.reduce((acc, t) => {
            const customerKey = t.customerName.toLowerCase();
            if (!acc[customerKey]) {
                acc[customerKey] = {
                    customerName: t.customerName,
                    customerContact: t.customerContact,
                    transactions: [],
                    totalOwed: 0,
                };
            }
            acc[customerKey].transactions.push(t);
            acc[customerKey].totalOwed += t.remainingBalance || 0;
            return acc;
        }, {} as Record<string, { customerName: string; customerContact?: string; transactions: Transaction[]; totalOwed: number }>);
        
        return Object.values(grouped);
    }, [receivableTransactions]);

    const filteredAndSortedData = useMemo(() => {
        const lowercasedQuery = searchQuery.toLowerCase();
        return receivablesByCustomer
            .filter(c => 
                c.customerName.toLowerCase().includes(lowercasedQuery) ||
                (c.customerContact && c.customerContact.includes(lowercasedQuery))
            )
            .sort((a, b) => b.totalOwed - a.totalOwed); // Sort by highest amount owed
    }, [receivablesByCustomer, searchQuery]);

    const summary = useMemo(() => ({
        totalReceivables: receivableTransactions.reduce((sum, t) => sum + (t.remainingBalance || 0), 0),
        customerCount: receivablesByCustomer.length,
        transactionCount: receivableTransactions.length,
    }), [receivableTransactions, receivablesByCustomer]);

    const toggleCustomerExpansion = (customerName: string) => {
        setExpandedCustomers(prev => {
            const newSet = new Set(prev);
            if (newSet.has(customerName)) {
                newSet.delete(customerName);
            } else {
                newSet.add(customerName);
            }
            return newSet;
        });
    };

    const handleMarkAsPaidClick = (transaction: Transaction) => {
        setTransactionToMarkAsPaid(transaction);
    };

    const handleConfirmMarkAsPaid = async () => {
        if (!transactionToMarkAsPaid) return;
        
        const newStatus = transactionToMarkAsPaid.status === 'Selesai' ? 'Diambil' : transactionToMarkAsPaid.status;
        const updatedTx: Transaction = {
            ...transactionToMarkAsPaid,
            paymentAmount: transactionToMarkAsPaid.grandTotal,
            remainingBalance: 0,
            status: newStatus,
        };
        
        await updateTransaction(updatedTx);
        setTransactionToMarkAsPaid(null);
    };
    
    const handleNotify = (transaction: Transaction) => {
        const link = generateWhatsAppReminderLink(transaction, whatsAppSettings, receiptSettings);
        if (link !== '#') {
            window.open(link, '_blank', 'noopener,noreferrer');
        }
    };

    const handleViewOrder = (transaction: Transaction) => {
        navigate('/pesanan', { state: { search: transaction.orderNumber } });
    };

    return (
        <div className="space-y-8 pb-8">
            <Card>
                <h1 className="text-xl font-bold text-slate-800">Laporan Piutang Pelanggan</h1>
                <p className="text-slate-500">Daftar semua transaksi yang belum lunas.</p>
            </Card>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="!p-4">
                    <p className="text-sm font-medium text-primary-800">Total Piutang</p>
                    <p className="text-2xl font-extrabold text-red-600">{formatCurrency(summary.totalReceivables)}</p>
                </Card>
                <Card className="!p-4">
                    <p className="text-sm font-medium text-primary-800">Jumlah Pelanggan</p>
                    <p className="text-2xl font-extrabold text-primary-700">{summary.customerCount}</p>
                </Card>
                <Card className="!p-4">
                    <p className="text-sm font-medium text-primary-800">Jumlah Pesanan</p>
                    <p className="text-2xl font-extrabold text-primary-700">{summary.transactionCount}</p>
                </Card>
            </div>
            
            <Card>
                <div className="mb-4">
                    <label htmlFor="search-customer" className="sr-only">Cari Pelanggan</label>
                    <input
                        id="search-customer"
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Cari berdasarkan nama atau kontak pelanggan..."
                        className="block w-full px-4 py-2 bg-white border border-slate-300 rounded-full shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    />
                </div>
                <div className="space-y-4">
                    {filteredAndSortedData.length > 0 ? (
                        filteredAndSortedData.map(customer => (
                            <div key={customer.customerName} className="bg-white border border-slate-200 rounded-lg">
                                <button
                                    className="w-full flex justify-between items-center p-4 text-left hover:bg-slate-50 rounded-t-lg"
                                    onClick={() => toggleCustomerExpansion(customer.customerName)}
                                    aria-expanded={expandedCustomers.has(customer.customerName)}
                                >
                                    <div>
                                        <p className="font-bold text-slate-800">{customer.customerName}</p>
                                        <p className="text-sm text-slate-500">{customer.customerContact}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-extrabold text-red-600 text-lg">{formatCurrency(customer.totalOwed)}</p>
                                        <p className="text-xs text-slate-500">{customer.transactions.length} pesanan</p>
                                    </div>
                                </button>

                                {expandedCustomers.has(customer.customerName) && (
                                    <div className="border-t border-slate-200 p-4 space-y-4">
                                        {customer.transactions.map(t => (
                                            <div key={t.id} className="p-3 bg-slate-50 rounded-md">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <p className="text-sm font-semibold">Pesanan #{t.orderNumber || t.id.slice(-4)}</p>
                                                        <p className="text-xs text-slate-500">{new Date(t.timestamp).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-sm font-bold text-red-600">{formatCurrency(t.remainingBalance || 0)}</p>
                                                        <p className="text-xs text-slate-500">dari {formatCurrency(t.grandTotal)}</p>
                                                    </div>
                                                </div>
                                                <div className="mt-2 pt-2 border-t border-slate-200 grid grid-cols-3 gap-2">
                                                    <button onClick={() => handleMarkAsPaidClick(t)} className="text-center py-2 px-3 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md">Lunas</button>
                                                    <button onClick={() => handleNotify(t)} disabled={!t.customerContact} className="text-center py-2 px-3 text-sm font-medium text-green-700 bg-green-100 hover:bg-green-200 rounded-md disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed">Notifikasi WA</button>
                                                    <button onClick={() => handleViewOrder(t)} className="text-center py-2 px-3 text-sm font-medium text-primary-700 bg-primary-100 hover:bg-primary-200 rounded-md">Lihat Pesanan</button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-10">
                            <p className="text-slate-500">Tidak ada data piutang ditemukan.</p>
                        </div>
                    )}
                </div>
            </Card>

             <ConfirmationModal
                isOpen={!!transactionToMarkAsPaid}
                onClose={() => setTransactionToMarkAsPaid(null)}
                onConfirm={handleConfirmMarkAsPaid}
                title="Konfirmasi Pelunasan"
                message={`Apakah Anda yakin ingin menandai pesanan untuk "${transactionToMarkAsPaid?.customerName}" sebagai LUNAS? Sisa bayar akan menjadi Rp 0.`}
                confirmText="Ya, Lunas"
                cancelText="Batal"
                confirmButtonClass="bg-green-600 hover:bg-green-700 focus:ring-green-500"
            />
        </div>
    );
};

export default ReceivablesPage;