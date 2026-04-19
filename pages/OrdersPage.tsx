import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactDOM from 'react-dom/client';
import { motion, AnimatePresence } from 'motion/react';
import { LayoutGrid, List, Columns, Search, Printer, Edit, Trash2, MessageSquare, Receipt, ChevronRight } from 'lucide-react';
import useLocalStorage from '../hooks/useLocalStorage';
import { useApp } from '../src/context/AppContext';
import { Transaction, OrderStatus, ReceiptSettings, WhatsAppSettings } from '../types';
import Card from '../components/ui/Card';
import { printReceipt, generateReceiptHTML } from '../utils/receipt';
import { DEFAULT_LOGO_BASE64, DEFAULT_RECEIPT_SETTINGS, ORDER_STATUSES, STATUS_COLORS, DEFAULT_WHATSAPP_SETTINGS } from '../constants';
import ConfirmationModal from '../components/modals/ConfirmationModal';
import { generateWhatsAppLink } from '../utils/whatsapp';
import ShareableReceipt from '../components/ShareableReceipt';

declare const htmlToImage: any;

type ViewType = 'grid' | 'table' | 'kanban';


const fileTypeStyles: { [key: string]: string } = {
    'Ada': 'bg-green-100 text-green-800',
    'Tidak Ada': 'bg-red-100 text-red-800',
    'Edit': 'bg-yellow-100 text-yellow-800',
};

const Highlight: React.FC<{ text: string; highlight: string }> = ({ text, highlight }) => {
    const query = highlight.trim();
    if (!query) {
        return <>{text}</>;
    }
    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedQuery})`, 'gi');
    const parts = text.split(regex);

    return (
        <>
            {parts.map((part, i) =>
                regex.test(part) ? (
                    <span key={i} className="bg-yellow-200 rounded-sm px-0.5">
                        {part}
                    </span>
                ) : (
                    part
                )
            )}
        </>
    );
};


const OrdersPage: React.FC = () => {
    const { 
        transactions, 
        updateTransaction, 
        deleteTransaction, 
        receiptLogo: logo, 
        receiptSettings, 
        whatsappSettings: whatsAppSettings 
    } = useApp();
    const [filterStatus, setFilterStatus] = useState<'Semua' | OrderStatus>('Semua');
    const setSearchQueryWrapper = (query: string) => setSearchQuery(query);
    const [searchQuery, setSearchQuery] = useState('');
    const [viewType, setViewType] = useState<ViewType>('grid');
    const navigate = useNavigate();
    const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);

    const formatCurrency = (amount: number) => `Rp ${new Intl.NumberFormat('id-ID').format(amount)}`;
    
    const handleStatusChange = (transactionId: string, newStatus: OrderStatus) => {
        const tx = transactions.find(t => t.id === transactionId);
        if (tx) {
            let finalStatus = newStatus;
            if ((tx.remainingBalance ?? 0) <= 0 && newStatus === 'Selesai') {
                finalStatus = 'Diambil';
            }
            updateTransaction({ ...tx, status: finalStatus });
        }
    };

    const handleEdit = (transaction: Transaction) => {
        navigate('/kasir', { state: { transactionToEdit: transaction } });
    };

    const handlePrint = (transaction: Transaction) => {
        const receiptHTML = generateReceiptHTML(transaction, receiptSettings, logo);
        printReceipt(receiptHTML);
    };

    const handleNotify = (transaction: Transaction) => {
        const link = generateWhatsAppLink(transaction, whatsAppSettings, receiptSettings);
        if (link !== '#') {
            window.open(link, '_blank', 'noopener,noreferrer');
        }
    };

    const handleDeleteClick = (transaction: Transaction) => {
        setTransactionToDelete(transaction);
    };

    const handleConfirmDelete = async () => {
        if (transactionToDelete) {
            await deleteTransaction(transactionToDelete.id);
            setTransactionToDelete(null);
        }
    };

    const handleShareImage = async (transaction: Transaction) => {
        const receiptContainer = document.createElement('div');
        receiptContainer.style.position = 'absolute';
        receiptContainer.style.left = '-9999px';
        document.body.appendChild(receiptContainer);
    
        const root = ReactDOM.createRoot(receiptContainer);
    
        root.render(
            <ShareableReceipt 
                transaction={transaction} 
                receiptSettings={receiptSettings}
                logo={logo}
            />
        );
    
        await new Promise(resolve => setTimeout(resolve, 500));
    
        try {
            const blob = await htmlToImage.toBlob(receiptContainer.firstChild as HTMLElement, {
                quality: 0.95,
                cacheBust: true,
            });
    
            if (!blob) {
                throw new Error('Gagal membuat gambar struk.');
            }
            
            const file = new File([blob], `struk-${transaction.orderNumber || 'transaksi'}.png`, { type: 'image/png' });
    
            if (navigator.share && navigator.canShare({ files: [file] })) {
                 await navigator.share({
                    title: `Struk Pesanan ${transaction.orderNumber}`,
                    files: [file],
                });
            } else {
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = `struk-${transaction.orderNumber || 'transaksi'}.png`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(link.href);
            }
        } catch (error) {
            console.error('Error sharing image:', error);
            alert('Gagal membagikan gambar. Gambar akan diunduh sebagai gantinya.');
            try {
                const blob = await htmlToImage.toBlob(receiptContainer.firstChild as HTMLElement, { quality: 0.95, cacheBust: true });
                if (blob) {
                    const link = document.createElement('a');
                    link.href = URL.createObjectURL(blob);
                    link.download = `struk-${transaction.orderNumber || 'transaksi'}.png`;
                    link.click();
                    URL.revokeObjectURL(link.href);
                }
            } catch (downloadError) {
                console.error('Fallback download failed:', downloadError);
                alert('Gagal membuat gambar struk.');
            }
        } finally {
            root.unmount();
            if (document.body.contains(receiptContainer)) {
                document.body.removeChild(receiptContainer);
            }
        }
    };

    const filteredTransactions = useMemo(() => {
        const lowercasedQuery = searchQuery.trim().toLowerCase();

        const results = transactions.filter(t => {
            const matchesStatus = filterStatus === 'Semua' || t.status === filterStatus;
            if (!matchesStatus) return false;

            const matchesSearch = lowercasedQuery === '' ||
                t.customerName.toLowerCase().includes(lowercasedQuery) ||
                (t.orderNumber && t.orderNumber.toLowerCase().includes(lowercasedQuery)) ||
                (t.customerContact && t.customerContact.toLowerCase().includes(lowercasedQuery));
            
            return matchesSearch;
        });

        // Sort by newest first
        return results.sort((a, b) => b.timestamp - a.timestamp);
    }, [transactions, filterStatus, searchQuery]);

    return (
        <div className="space-y-6 pb-8">
            <Card>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Daftar Pesanan</h1>
                        <p className="text-slate-500">Kelola dan lacak status semua pesanan pelanggan.</p>
                    </div>
                    
                    <div className="flex items-center bg-slate-100 p-1 rounded-lg self-start md:self-center">
                        <button 
                            onClick={() => setViewType('grid')}
                            className={`p-2 rounded-md transition-all ${viewType === 'grid' ? 'bg-white shadow-sm text-primary-600' : 'text-slate-500 hover:text-slate-700'}`}
                            title="Tampilan Kartu"
                        >
                            <LayoutGrid size={20} />
                        </button>
                        <button 
                            onClick={() => setViewType('table')}
                            className={`p-2 rounded-md transition-all ${viewType === 'table' ? 'bg-white shadow-sm text-primary-600' : 'text-slate-500 hover:text-slate-700'}`}
                            title="Tampilan Tabel"
                        >
                            <List size={20} />
                        </button>
                        <button 
                            onClick={() => setViewType('kanban')}
                            className={`p-2 rounded-md transition-all ${viewType === 'kanban' ? 'bg-white shadow-sm text-primary-600' : 'text-slate-500 hover:text-slate-700'}`}
                            title="Tampilan Kanban"
                        >
                            <Columns size={20} />
                        </button>
                    </div>
                </div>
                
                <div className="space-y-4">
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-5 w-5 text-slate-400" />
                        </div>
                        <input
                            id="search-order"
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Cari berdasarkan nama, kontak, atau nomor pesanan..."
                            className="block w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white text-sm"
                        />
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={() => setFilterStatus('Semua')}
                            className={`px-4 py-2 text-sm font-medium rounded-full transition-all border ${filterStatus === 'Semua' ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-slate-600 border-slate-200 hover:border-primary-400 hover:text-primary-600'}`}
                        >
                            Semua
                        </button>
                        {ORDER_STATUSES.map(status => (
                            <button
                                key={status}
                                onClick={() => setFilterStatus(status)}
                                className={`px-4 py-2 text-sm font-medium rounded-full transition-all border ${filterStatus === status ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-slate-600 border-slate-200 hover:border-primary-400 hover:text-primary-600'}`}
                            >
                                {status}
                            </button>
                        ))}
                    </div>
                </div>
            </Card>

            <AnimatePresence mode="wait">
                {filteredTransactions.length > 0 ? (
                    <motion.div
                        key={viewType}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                    >
                        {viewType === 'grid' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {filteredTransactions.map(t => (
                                    <OrderCard 
                                        key={t.id} 
                                        t={t} 
                                        searchQuery={searchQuery} 
                                        onStatusChange={handleStatusChange}
                                        onEdit={handleEdit}
                                        onPrint={handlePrint}
                                        onDelete={handleDeleteClick}
                                        onNotify={handleNotify}
                                        onShare={handleShareImage}
                                        formatCurrency={formatCurrency}
                                    />
                                ))}
                            </div>
                        )}

                        {viewType === 'table' && (
                            <OrderTable 
                                transactions={filteredTransactions}
                                searchQuery={searchQuery}
                                onStatusChange={handleStatusChange}
                                onEdit={handleEdit}
                                onPrint={handlePrint}
                                onDelete={handleDeleteClick}
                                onNotify={handleNotify}
                                onShare={handleShareImage}
                                formatCurrency={formatCurrency}
                            />
                        )}

                        {viewType === 'kanban' && (
                            <OrderKanban 
                                transactions={transactions} 
                                searchQuery={searchQuery}
                                onStatusChange={handleStatusChange}
                                onEdit={handleEdit}
                                onPrint={handlePrint}
                                onDelete={handleDeleteClick}
                                onNotify={handleNotify}
                                onShare={handleShareImage}
                                formatCurrency={formatCurrency}
                            />
                        )}
                    </motion.div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                    >
                        <Card>
                            <div className="text-center py-16">
                                <div className="bg-slate-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Search className="text-slate-400" size={32} />
                                </div>
                                <h3 className="text-lg font-semibold text-slate-800">Pesanan Tidak Ditemukan</h3>
                                <p className="text-slate-500">Tidak ada pesanan yang cocok dengan filter atau pencarian Anda.</p>
                                <button 
                                    onClick={() => {setSearchQuery(''); setFilterStatus('Semua');}}
                                    className="mt-4 text-primary-600 font-medium hover:underline"
                                >
                                    Reset semua filter
                                </button>
                            </div>
                        </Card>
                    </motion.div>
                )}
            </AnimatePresence>

            <ConfirmationModal
                isOpen={!!transactionToDelete}
                onClose={() => setTransactionToDelete(null)}
                onConfirm={handleConfirmDelete}
                title="Konfirmasi Hapus Pesanan"
                message={`Apakah Anda yakin ingin menghapus pesanan untuk "${transactionToDelete?.customerName}"? Tindakan ini tidak dapat dibatalkan.`}
            />
        </div>
    );
};

// --- Sub-components (Tampilan Berbeda) ---

const OrderCard = ({ t, searchQuery, onStatusChange, onEdit, onPrint, onDelete, onNotify, onShare, formatCurrency }: any) => {
    return (
        <Card className="flex flex-col justify-between hover:shadow-md transition-shadow">
            <div>
                <div className="flex justify-between items-start mb-2">
                    <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-slate-800 truncate">
                            <Highlight text={t.customerName} highlight={searchQuery} />
                        </h3>
                        {t.customerContact && (
                            <p className="text-sm text-slate-500 truncate">
                                <Highlight text={t.customerContact} highlight={searchQuery} />
                            </p>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-primary-700 bg-primary-100 px-2 py-0.5 rounded">
                                {t.customerType || 'Pelanggan Baru'}
                            </span>
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${fileTypeStyles[t.fileType || 'Ada'] || 'bg-gray-100 text-gray-800'}`}>
                                {t.fileType || 'Ada'}
                            </span>
                        </div>
                        {t.orderNumber && (
                            <p className="text-sm font-bold text-primary-600 mt-2">
                                #<Highlight text={t.orderNumber} highlight={searchQuery} />
                            </p>
                        )}
                        <p className="text-xs text-slate-400">
                            {new Date(t.timestamp).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                    </div>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full whitespace-nowrap ${STATUS_COLORS[t.status as OrderStatus]}`}>
                        {t.status}
                    </span>
                </div>

                <div className="my-4 space-y-1">
                    {t.items.map((item: any) => (
                        <div key={item.id} className="flex justify-between text-xs text-slate-600">
                            <span className="truncate mr-2 font-medium">{item.quantity}x {item.serviceName}</span>
                            <span className="font-bold text-slate-700">{formatCurrency(item.total)}</span>
                        </div>
                    ))}
                </div>

                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-1 mb-4">
                    <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Total Belanja</span>
                        <span className="font-bold text-slate-800">{formatCurrency(t.grandTotal)}</span>
                    </div>
                    {(t.remainingBalance !== undefined && t.remainingBalance > 0) ? (
                        <div className="flex justify-between text-xs">
                            <span className="text-red-500 font-medium">Belum Lunas</span>
                            <span className="font-bold text-red-600">{formatCurrency(t.remainingBalance)}</span>
                        </div>
                    ) : (
                        <div className="flex justify-between text-xs font-medium text-green-600">
                            <span>Lunas</span>
                            <div className="bg-green-100 p-0.5 rounded">
                                <ChevronRight size={10} />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="space-y-3">
                <select
                    value={t.status}
                    onChange={(e) => onStatusChange(t.id, e.target.value as OrderStatus)}
                    className="block w-full px-3 py-1.5 text-xs border border-slate-200 focus:outline-none focus:ring-1 focus:ring-primary-500 rounded-lg bg-white font-medium"
                >
                    {ORDER_STATUSES.map(status => (
                        <option key={status} value={status}>{status}</option>
                    ))}
                </select>
                
                <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => onEdit(t)} className="flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-bold text-secondary-700 bg-secondary-100 hover:bg-secondary-200 rounded-lg transition-colors">
                        <Edit size={14} /> Edit
                    </button>
                    <button onClick={() => onPrint(t)} className="flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-bold text-primary-700 bg-primary-100 hover:bg-primary-200 rounded-lg transition-colors">
                        <Printer size={14} /> Cetak
                    </button>
                    <button onClick={() => onNotify(t)} disabled={!t.customerContact} className="flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-bold text-green-700 bg-green-100 hover:bg-green-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                        <MessageSquare size={14} /> WA
                    </button>
                    <button onClick={() => onShare(t)} className="flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-bold text-purple-700 bg-purple-100 hover:bg-purple-200 rounded-lg transition-colors">
                        <Receipt size={14} /> Struk
                    </button>
                    <button onClick={() => onDelete(t)} className="col-span-2 flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-bold text-red-700 bg-red-100 hover:bg-red-200 rounded-lg transition-colors">
                        <Trash2 size={14} /> Hapus Pesanan
                    </button>
                </div>
            </div>
        </Card>
    );
};

const OrderTable = ({ transactions, searchQuery, onStatusChange, onEdit, onPrint, onDelete, onNotify, onShare, formatCurrency }: any) => {
    return (
        <Card className="overflow-hidden p-0 rounded-xl">
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Pelanggan & Pesanan</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Items</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Keuangan</th>
                            <th className="px-6 py-4 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-100">
                        {transactions.map((t: Transaction) => (
                            <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex flex-col">
                                        <span className="font-bold text-slate-800"><Highlight text={t.customerName} highlight={searchQuery} /></span>
                                        <span className="text-xs text-slate-500 text-primary-600 font-medium">#{t.orderNumber}</span>
                                        <span className="text-[10px] text-slate-400 mt-0.5">{new Date(t.timestamp).toLocaleDateString('id-ID')}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <select
                                        value={t.status}
                                        onChange={(e) => onStatusChange(t.id, e.target.value as OrderStatus)}
                                        className={`text-xs font-bold px-3 py-1 rounded-full focus:outline-none focus:ring-1 focus:ring-primary-400 appearance-none text-center cursor-pointer ${STATUS_COLORS[t.status as OrderStatus]}`}
                                    >
                                        {ORDER_STATUSES.map(status => (
                                            <option key={status} value={status} className="bg-white text-slate-800 font-medium">{status}</option>
                                        ))}
                                    </select>
                                </td>
                                <td className="px-6 py-4">
                                   <div className="max-w-[200px] truncate text-xs text-slate-600">
                                       {t.items.map(it => it.serviceName).join(', ')}
                                   </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex flex-col">
                                        <span className="text-xs font-bold text-slate-800">{formatCurrency(t.grandTotal)}</span>
                                        {(t.remainingBalance ?? 0) > 0 ? (
                                            <span className="text-[10px] text-red-500 font-bold italic">Sisa: {formatCurrency(t.remainingBalance || 0)}</span>
                                        ) : (
                                            <span className="text-[10px] text-green-600 font-bold uppercase">Lunas</span>
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-center text-slate-400">
                                    <div className="flex items-center justify-center gap-1">
                                        <button onClick={() => onEdit(t)} className="p-1.5 hover:text-secondary-600 hover:bg-secondary-50 rounded" title="Edit"><Edit size={16} /></button>
                                        <button onClick={() => onPrint(t)} className="p-1.5 hover:text-primary-600 hover:bg-primary-50 rounded" title="Cetak"><Printer size={16} /></button>
                                        <button onClick={() => onNotify(t)} className={`p-1.5 ${t.customerContact ? 'hover:text-green-600 hover:bg-green-50' : 'text-slate-200'} rounded`} title="WA"><MessageSquare size={16} /></button>
                                        <button onClick={() => onDelete(t)} className="p-1.5 hover:text-red-600 hover:bg-red-50 rounded" title="Hapus"><Trash2 size={16} /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </Card>
    );
};

const OrderKanban = ({ transactions, searchQuery, onStatusChange, onEdit, onPrint, onDelete, onNotify, onShare, formatCurrency }: any) => {
    const kanbanData = useMemo(() => {
        const groups: Record<OrderStatus, Transaction[]> = {} as any;
        ORDER_STATUSES.forEach(status => {
            groups[status] = transactions.filter((t: Transaction) => 
                t.status === status && 
                (searchQuery === '' || 
                 t.customerName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                 t.orderNumber?.toLowerCase().includes(searchQuery.toLowerCase()))
            );
        });
        return groups;
    }, [transactions, searchQuery]);

    return (
        <div className="flex flex-row overflow-x-auto gap-4 pb-4 px-1 -mx-4 sm:mx-0 min-h-[500px]">
            {ORDER_STATUSES.map(status => (
                <div key={status} className="flex-shrink-0 w-80 flex flex-col gap-3">
                    <div className={`p-3 rounded-lg flex items-center justify-between font-bold text-sm ${STATUS_COLORS[status]}`}>
                        <span>{status}</span>
                        <span className="bg-white/40 px-2 py-0.5 rounded text-xs">{kanbanData[status]?.length || 0}</span>
                    </div>
                    
                    <div className="bg-slate-100/50 p-2 rounded-xl flex-1 space-y-3 min-h-[100px] border-2 border-dashed border-slate-200">
                        {kanbanData[status]?.map((t: Transaction) => (
                            <motion.div 
                                layout
                                key={t.id}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="bg-white p-3 rounded-lg shadow-sm border border-slate-200 hover:shadow-md transition-shadow cursor-default group"
                            >
                                <div className="flex justify-between items-start">
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-slate-800 text-sm truncate">{t.customerName}</p>
                                        <p className="text-primary-600 font-bold text-xs">#{t.orderNumber}</p>
                                    </div>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                         <button onClick={() => onEdit(t)} className="p-1 text-slate-400 hover:text-primary-600"><Edit size={14} /></button>
                                         <button onClick={() => onPrint(t)} className="p-1 text-slate-400 hover:text-secondary-600"><Printer size={14} /></button>
                                    </div>
                                </div>
                                <div className="mt-2 text-xs text-slate-500">
                                    <div className="flex justify-between">
                                        <span>Items:</span>
                                        <span className="font-medium text-slate-700">{t.items.length}</span>
                                    </div>
                                    <div className="flex justify-between font-bold text-slate-800 mt-1">
                                        <span>Total:</span>
                                        <span>{formatCurrency(t.grandTotal)}</span>
                                    </div>
                                    {(t.remainingBalance ?? 0) > 0 && (
                                        <div className="flex justify-between text-red-500 font-bold mt-0.5">
                                            <span>Sisa:</span>
                                            <span>{formatCurrency(t.remainingBalance || 0)}</span>
                                        </div>
                                    )}
                                </div>
                                
                                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                                     <select
                                        value={t.status}
                                        onChange={(e) => onStatusChange(t.id, e.target.value as OrderStatus)}
                                        className="text-[10px] font-bold border-none bg-slate-50 rounded p-1 focus:ring-0 cursor-pointer"
                                    >
                                        {ORDER_STATUSES.map(s => (
                                            <option key={s} value={s}>{s}</option>
                                        ))}
                                    </select>
                                    <div className="flex gap-1">
                                        <button onClick={() => onNotify(t)} className={`p-1.5 rounded-full ${t.customerContact ? 'bg-green-50 text-green-600' : 'bg-slate-50 text-slate-300'}`}><MessageSquare size={12} /></button>
                                        <button onClick={() => onShare(t)} className="p-1.5 rounded-full bg-purple-50 text-purple-600"><Receipt size={12} /></button>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default OrdersPage;