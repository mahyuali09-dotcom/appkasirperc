import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Columns, List, Search, Phone, History, MessageSquare, Edit } from 'lucide-react';
import useLocalStorage from '../hooks/useLocalStorage';
import { useApp } from '../src/context/AppContext';
import { Transaction, OrderStatus, WhatsAppSettings, ReceiptSettings } from '../types';
import { ORDER_STATUSES, STATUS_COLORS, DEFAULT_WHATSAPP_SETTINGS, DEFAULT_RECEIPT_SETTINGS } from '../constants';
import { generateWhatsAppLink } from '../utils/whatsapp';
import Card from '../components/ui/Card';

const MonitoringPage: React.FC = () => {
    const { 
        transactions, 
        updateTransaction, 
        whatsappSettings: whatsAppSettings, 
        receiptSettings 
    } = useApp();
    const navigate = useNavigate();
    const [viewType, setViewType] = useState<'kanban' | 'table'>('kanban');
    const [searchQuery, setSearchQuery] = useState('');

    const filteredTransactions = useMemo(() => {
        const query = searchQuery.toLowerCase().trim();
        if (!query) return transactions;
        return transactions.filter(t => 
            t.customerName.toLowerCase().includes(query) ||
            (t.orderNumber && t.orderNumber.toLowerCase().includes(query)) ||
            (t.customerContact && t.customerContact.toLowerCase().includes(query))
        );
    }, [transactions, searchQuery]);

    const handleStatusChange = (transactionId: string, newStatus: OrderStatus) => {
        const tx = transactions.find(t => t.id === transactionId);
        if (tx) {
            updateTransaction({ ...tx, status: newStatus });
        }
    };

    const handleNotify = (transaction: Transaction) => {
        const link = generateWhatsAppLink(transaction, whatsAppSettings, receiptSettings);
        if (link !== '#') {
            window.open(link, '_blank', 'noopener,noreferrer');
        }
    };

    const handleEdit = (transaction: Transaction) => {
        navigate('/', { state: { transactionToEdit: transaction } });
    };
    
    const formatCurrency = (amount: number) => `Rp ${new Intl.NumberFormat('id-ID').format(amount)}`;

    return (
        <div className="space-y-6 pb-8">
            <Card>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Lacak Pesanan</h1>
                        <p className="text-slate-500">Papan monitoring untuk melacak progres pesanan pelanggan dari tahap ke tahap.</p>
                    </div>
                    
                    <div className="flex items-center bg-slate-100 p-1 rounded-lg self-start md:self-center">
                        <button 
                            onClick={() => setViewType('kanban')}
                            className={`p-2 rounded-md transition-all flex items-center gap-2 text-sm font-medium ${viewType === 'kanban' ? 'bg-white shadow-sm text-primary-600' : 'text-slate-500 hover:text-slate-700'}`}
                            title="Tampilan Kanban"
                        >
                            <Columns size={18} />
                            <span className="hidden sm:inline">Kanban</span>
                        </button>
                        <button 
                            onClick={() => setViewType('table')}
                            className={`p-2 rounded-md transition-all flex items-center gap-2 text-sm font-medium ${viewType === 'table' ? 'bg-white shadow-sm text-primary-600' : 'text-slate-500 hover:text-slate-700'}`}
                            title="Tampilan Tabel"
                        >
                            <List size={18} />
                            <span className="hidden sm:inline">Tabel</span>
                        </button>
                    </div>
                </div>

                <div className="mt-6 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Cari pesanan berdasarkan nama atau nomor..."
                        className="block w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white text-sm"
                    />
                </div>
            </Card>

            {viewType === 'kanban' ? (
                <div className="flex space-x-4 overflow-x-auto pb-4 -mx-4 px-4 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent">
                    {ORDER_STATUSES.map(status => {
                        const filtered = filteredTransactions
                            .filter(t => t.status === status)
                            .sort((a, b) => a.timestamp - b.timestamp); // Oldest first in columns

                        return (
                            <div key={status} className="w-80 md:w-96 flex-shrink-0 bg-slate-100 rounded-xl shadow-sm flex flex-col h-[calc(100vh-280px)] min-h-[500px]">
                                <div className={`p-4 font-bold text-center rounded-t-xl sticky top-0 z-10 ${STATUS_COLORS[status]}`}>
                                    {status.toUpperCase()} ({filtered.length})
                                </div>
                                <div className="p-2 space-y-3 flex-1 overflow-y-auto">
                                    {filtered.length > 0 ? (
                                        filtered.map(transaction => (
                                            <div key={transaction.id} className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-primary-500 hover:shadow-md transition-shadow">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <p className="font-bold text-slate-800 truncate max-w-[150px]">{transaction.customerName}</p>
                                                        <p className="text-xs text-slate-500 font-mono">#{transaction.orderNumber || transaction.id.slice(-4)}</p>
                                                        <p className="text-[10px] text-slate-400 mt-1">{new Date(transaction.timestamp).toLocaleString('id-ID', { day:'2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="font-bold text-primary-700 whitespace-nowrap">{formatCurrency(transaction.grandTotal)}</p>
                                                        {(transaction.remainingBalance || 0) > 0 && <p className="text-[10px] font-semibold text-red-600">Sisa: {formatCurrency(transaction.remainingBalance as number)}</p>}
                                                    </div>
                                                </div>

                                                <div className="text-[11px] text-slate-600 my-3 bg-slate-50 p-2 rounded border border-slate-100 italic">
                                                    {transaction.items.map((item, idx) => (
                                                        <div key={item.id} className="flex justify-between gap-2">
                                                            <span className="truncate">{item.quantity}x {item.serviceName}</span>
                                                            {idx === 0 && transaction.items.length > 1 && <span className="text-primary-500 font-bold">+{transaction.items.length - 1}</span>}
                                                            {idx === 0 && transaction.items.length === 1 && <span className="invisible">x</span>}
                                                        </div>
                                                    )).slice(0, 1)}
                                                </div>
                                                
                                                <div className="space-y-3">
                                                    <select
                                                        value={transaction.status}
                                                        onChange={(e) => handleStatusChange(transaction.id, e.target.value as OrderStatus)}
                                                        className="block w-full text-xs border-slate-200 focus:outline-none focus:ring-primary-500 focus:border-primary-500 rounded-lg py-1.5"
                                                    >
                                                        {ORDER_STATUSES.map(s => (
                                                            <option key={s} value={s}>{s}</option>
                                                        ))}
                                                    </select>
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => handleEdit(transaction)}
                                                            className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 text-[11px] font-medium text-secondary-700 bg-secondary-50 hover:bg-secondary-100 rounded-lg transition-colors border border-secondary-200"
                                                            title="Edit Pesanan"
                                                        >
                                                            <Edit size={12} />
                                                            Edit
                                                        </button>
                                                        <button
                                                            onClick={() => handleNotify(transaction)}
                                                            disabled={!transaction.customerContact}
                                                            className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 text-[11px] font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-lg transition-colors border border-green-200 disabled:bg-slate-50 disabled:text-slate-300 disabled:border-slate-100"
                                                            title="Kirim WhatsApp"
                                                        >
                                                            <MessageSquare size={12} />
                                                            WA
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="flex flex-col items-center justify-center h-32 text-slate-400 text-xs">
                                            <p>Tidak ada pesanan</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-md overflow-hidden border border-slate-200">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-slate-500">
                            <thead className="text-xs text-slate-700 uppercase bg-slate-50 border-b">
                                <tr>
                                    <th className="px-6 py-4">Pesanan</th>
                                    <th className="px-6 py-4">Pelanggan</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4">Total</th>
                                    <th className="px-6 py-4">Waktu</th>
                                    <th className="px-6 py-4 text-right">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredTransactions.map(transaction => (
                                    <tr key={transaction.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-slate-800">#{transaction.orderNumber || transaction.id.slice(-4)}</div>
                                            <div className="text-xs text-slate-500 truncate max-w-[200px]">
                                                {transaction.items.map(i => `${i.quantity}x ${i.serviceName}`).join(', ')}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-slate-700">{transaction.customerName}</div>
                                            <div className="text-xs text-slate-400">{transaction.customerContact || '-'}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <select
                                                value={transaction.status}
                                                onChange={(e) => handleStatusChange(transaction.id, e.target.value as OrderStatus)}
                                                className={`text-xs font-semibold px-2 py-1 rounded-full border-none focus:ring-2 focus:ring-primary-500 ${STATUS_COLORS[transaction.status]}`}
                                            >
                                                {ORDER_STATUSES.map(s => (
                                                    <option key={s} value={s}>{s}</option>
                                                ))}
                                            </select>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-primary-700">{formatCurrency(transaction.grandTotal)}</div>
                                            {(transaction.remainingBalance || 0) > 0 && (
                                                <div className="text-[10px] font-bold text-red-500">Sisa: {formatCurrency(transaction.remainingBalance as number)}</div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-xs text-slate-600">{new Date(transaction.timestamp).toLocaleDateString('id-ID')}</div>
                                            <div className="text-[10px] text-slate-400">{new Date(transaction.timestamp).toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'})}</div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button onClick={() => handleEdit(transaction)} className="p-2 text-secondary-600 hover:bg-secondary-50 rounded-lg transition-colors" title="Edit">
                                                    <Edit size={16} />
                                                </button>
                                                <button 
                                                    onClick={() => handleNotify(transaction)} 
                                                    disabled={!transaction.customerContact}
                                                    className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:text-slate-300" 
                                                    title="WhatsApp"
                                                >
                                                    <MessageSquare size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filteredTransactions.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-medium">
                                            Tidak ada pesanan ditemukan.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}

export default MonitoringPage;