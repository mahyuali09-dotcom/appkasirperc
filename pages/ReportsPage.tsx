import React, { useState, useMemo, useCallback } from 'react';
import useLocalStorage from '../hooks/useLocalStorage';
import { useApp } from '../src/context/AppContext';
import { Transaction, Expense } from '../types';
import Card from '../components/ui/Card';

type ItemSortableKeys = 'orderNumber' | 'date' | 'customerName' | 'customerContact' | 'serviceName' | 'quantity' | 'pricePerUnit' | 'discount' | 'total';
type CustomerSortableKeys = 'customerName' | 'transactionCount' | 'totalDiscount' | 'totalPurchase';
type SortableKeys = ItemSortableKeys | CustomerSortableKeys;

type FilterPeriod = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';

interface SortConfig {
    key: SortableKeys;
    direction: 'ascending' | 'descending';
}

// Helper component for sortable table headers
const SortableHeader: React.FC<{
    columnKey: SortableKeys;
    title: string;
    sortConfig: SortConfig | null;
    requestSort: (key: SortableKeys) => void;
    className?: string;
}> = ({ columnKey, title, sortConfig, requestSort, className = '' }) => {
    const isSorted = sortConfig?.key === columnKey;
    const directionIcon = isSorted ? (sortConfig?.direction === 'ascending' ? '▲' : '▼') : '';

    return (
        <th scope="col" className={`px-6 py-3 ${className}`}>
            <button
                onClick={() => requestSort(columnKey)}
                className="flex items-center gap-2 group w-full"
            >
                {title}
                <span className={`text-xs ${isSorted ? 'opacity-100' : 'opacity-30 group-hover:opacity-100'}`}>
                    {directionIcon || '↕'}
                </span>
            </button>
        </th>
    );
};


const ReportsPage: React.FC = () => {
    const { transactions, expenses } = useApp();
    const [searchFilter, setSearchFilter] = useState('');
    const [sortConfig, setSortConfig] = useState<SortConfig | null>({ key: 'date', direction: 'descending' });
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [activeTab, setActiveTab] = useState<'items' | 'customers'>('items');
    
    // Date filtering states
    const [filterPeriod, setFilterPeriod] = useState<FilterPeriod>('daily');

    const getWeekString = (date: Date) => {
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
        return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
    };

    const today = new Date().toISOString().split('T')[0];
    const [dailyValue, setDailyValue] = useState(today);
    const [weeklyValue, setWeeklyValue] = useState(getWeekString(new Date()));
    const [monthlyValue, setMonthlyValue] = useState(new Date().toISOString().slice(0, 7));
    const [yearlyValue, setYearlyValue] = useState(new Date().getFullYear().toString());
    const [customStartDate, setCustomStartDate] = useState(today);
    const [customEndDate, setCustomEndDate] = useState(today);

    const formatCurrency = (amount: number) => `Rp ${new Intl.NumberFormat('id-ID').format(amount)}`;

    const getWeekDateRange = useCallback((weekString: string): { start: string; end: string } | null => {
        if (!weekString) return null;
        try {
            const [year, weekNum] = weekString.split('-W').map(Number);
            const d = new Date(Date.UTC(year, 0, 1 + (weekNum - 1) * 7));
            const day = d.getUTCDay(); // 0 = Sunday
            d.setUTCDate(d.getUTCDate() - day + (day === 0 ? -6 : 1)); // Set to Monday
            const weekStart = new Date(d);
            const weekEnd = new Date(weekStart);
            weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);
            
            const toISOString = (date: Date) => date.toISOString().split('T')[0];
            return { start: toISOString(weekStart), end: toISOString(weekEnd) };
        } catch (e) {
            console.error("Error parsing week string", e);
            return null;
        }
    }, []);

    const filterByPeriod = useCallback(<T extends { date: string }>(data: T[]): T[] => {
        switch (filterPeriod) {
            case 'daily':
                return dailyValue ? data.filter(row => row.date === dailyValue) : data;
            case 'weekly':
                const weeklyRange = getWeekDateRange(weeklyValue);
                return weeklyRange ? data.filter(row => row.date >= weeklyRange.start && row.date <= weeklyRange.end) : data;
            case 'monthly':
                return monthlyValue ? data.filter(row => row.date.startsWith(monthlyValue)) : data;
            case 'yearly':
                return yearlyValue ? data.filter(row => row.date.startsWith(yearlyValue)) : data;
            case 'custom':
                 return (customStartDate && customEndDate) ? data.filter(row => row.date >= customStartDate && row.date <= customEndDate) : data;
            default:
                return data;
        }
    }, [filterPeriod, dailyValue, weeklyValue, monthlyValue, yearlyValue, customStartDate, customEndDate, getWeekDateRange]);

    const handleTabChange = (tab: 'items' | 'customers') => {
        setActiveTab(tab);
        setCurrentPage(1);
        setSortConfig(tab === 'items' ? { key: 'date', direction: 'descending' } : { key: 'totalPurchase', direction: 'descending' });
        setSearchFilter('');
    };

    // --- Data Processing for Item Report ---
    const flattenedItemData = useMemo(() => {
        return transactions.flatMap(t =>
            t.items.map(item => ({
                ...item,
                transactionId: t.id,
                orderNumber: t.orderNumber || '-',
                date: t.date,
                timestamp: t.timestamp,
                customerName: t.customerName,
                customerContact: t.customerContact || '',
                grandTotal: t.grandTotal,
            }))
        );
    }, [transactions]);

    const processedItemData = useMemo(() => {
        let filtered = filterByPeriod(flattenedItemData);
        if (searchFilter) {
            const lowercasedFilter = searchFilter.toLowerCase();
            filtered = filtered.filter(row => 
                row.customerName.toLowerCase().includes(lowercasedFilter) ||
                row.orderNumber.toLowerCase().includes(lowercasedFilter) ||
                row.customerContact.toLowerCase().includes(lowercasedFilter)
            );
        }
        if (sortConfig) {
            filtered.sort((a, b) => {
                const aValue = a[sortConfig.key as ItemSortableKeys];
                const bValue = b[sortConfig.key as ItemSortableKeys];
                if (aValue === undefined || aValue === null) return 1;
                if (bValue === undefined || bValue === null) return -1;
                if (sortConfig.key === 'date') {
                    return sortConfig.direction === 'ascending' ? a.timestamp - b.timestamp : b.timestamp - a.timestamp;
                }
                if (typeof aValue === 'string' && typeof bValue === 'string') {
                    return sortConfig.direction === 'ascending' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
                }
                if ((aValue as any) < (bValue as any)) return sortConfig.direction === 'ascending' ? -1 : 1;
                if ((aValue as any) > (bValue as any)) return sortConfig.direction === 'ascending' ? 1 : -1;
                return 0;
            });
        }
        return filtered;
    }, [flattenedItemData, filterByPeriod, searchFilter, sortConfig]);

    // --- Data Processing for Customer Report ---
    const processedCustomerData = useMemo(() => {
        const filteredTransactions = filterByPeriod(transactions);

        const groupedByCustomer = filteredTransactions.reduce((acc, t) => {
            const key = t.customerName.toLowerCase();
            if (!acc[key]) {
                acc[key] = { customerName: t.customerName, transactionCount: 0, totalDiscount: 0, totalPurchase: 0 };
            }
            acc[key].transactionCount += 1;
            acc[key].totalDiscount += t.discount || 0;
            acc[key].totalPurchase += t.grandTotal;
            return acc;
        }, {} as Record<string, { customerName: string; transactionCount: number; totalDiscount: number; totalPurchase: number }>);
        
        let customerList = Object.values(groupedByCustomer);

        if (searchFilter) {
            const lowercasedFilter = searchFilter.toLowerCase();
            customerList = customerList.filter(c => c.customerName.toLowerCase().includes(lowercasedFilter));
        }

        if (sortConfig) {
             customerList.sort((a, b) => {
                const aValue = a[sortConfig.key as CustomerSortableKeys];
                const bValue = b[sortConfig.key as CustomerSortableKeys];
                if (typeof aValue === 'string' && typeof bValue === 'string') {
                    return sortConfig.direction === 'ascending' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
                }
                if ((aValue as any) < (bValue as any)) return sortConfig.direction === 'ascending' ? -1 : 1;
                if ((aValue as any) > (bValue as any)) return sortConfig.direction === 'ascending' ? 1 : -1;
                return 0;
            });
        }
        return customerList;

    }, [transactions, filterByPeriod, searchFilter, sortConfig]);

    const filteredExpenses = useMemo(() => filterByPeriod(expenses), [expenses, filterByPeriod]);

    const totalPages = useMemo(() => {
        const totalRows = activeTab === 'items' ? processedItemData.length : processedCustomerData.length;
        return Math.ceil(totalRows / rowsPerPage);
    }, [activeTab, processedItemData, processedCustomerData, rowsPerPage]);

    const paginatedData = useMemo(() => {
        const data = activeTab === 'items' ? processedItemData : processedCustomerData;
        const startIndex = (currentPage - 1) * rowsPerPage;
        return data.slice(startIndex, startIndex + rowsPerPage);
    }, [processedItemData, processedCustomerData, currentPage, rowsPerPage, activeTab]);

    const requestSort = (key: SortableKeys) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
        setCurrentPage(1);
    };

    const handlePageChange = (page: number) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
        }
    }
    
    const summary = useMemo(() => {
        const relevantTransactions = filterByPeriod(transactions);
        return {
            totalRevenue: relevantTransactions.reduce((acc, row) => acc + row.grandTotal, 0),
            totalTransactions: relevantTransactions.length,
            totalItemsSold: relevantTransactions.reduce((acc, t) => acc + t.items.reduce((itemAcc, item) => itemAcc + item.quantity, 0), 0),
            totalExpenses: filteredExpenses.reduce((acc, exp) => acc + exp.amount, 0),
        }
    }, [transactions, filteredExpenses, filterByPeriod]);

    const exportToCSV = useCallback(() => {
        let csvContent = "data:text/csv;charset=utf-8,";
        let headers: string[];
        let data: any[];
        let reportType: string;

        if (activeTab === 'items') {
            headers = ["ID Transaksi", "No. Pesanan", "Tanggal", "Nama Pelanggan", "Kontak", "Nama Item", "Jumlah", "Harga Satuan", "Diskon Item", "Total Item"];
            data = processedItemData;
            reportType = 'penjualan_per_item';
        } else {
            headers = ["Nama Pelanggan", "Jumlah Transaksi", "Total Diskon", "Total Pembelian"];
            data = processedCustomerData;
            reportType = 'penjualan_per_pelanggan';
        }
        
        if (data.length === 0) {
            alert('Tidak ada data untuk diekspor.');
            return;
        }

        csvContent += headers.join(',') + "\n";
        
        data.forEach(row => {
            const values = activeTab === 'items'
                ? [ `"${row.transactionId}"`, `"${row.orderNumber}"`, `"${row.date}"`, `"${row.customerName}"`, `"${row.customerContact}"`, `"${row.serviceName}"`, row.quantity, row.pricePerUnit, row.discount || 0, row.total ]
                : [ `"${row.customerName}"`, row.transactionCount, row.totalDiscount, row.totalPurchase ];
            csvContent += values.join(',') + "\n";
        });
        
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        
        let filenamePart = '';
        switch (filterPeriod) {
            case 'daily': filenamePart = `harian_${dailyValue}`; break;
            case 'weekly': filenamePart = `mingguan_${weeklyValue}`; break;
            case 'monthly': filenamePart = `bulanan_${monthlyValue}`; break;
            case 'yearly': filenamePart = `tahunan_${yearlyValue}`; break;
            case 'custom': filenamePart = `rentang_${customStartDate}_sampai_${customEndDate}`; break;
            default: filenamePart = 'semua';
        }

        link.setAttribute("download", `laporan_${reportType}_${filenamePart}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }, [activeTab, processedItemData, processedCustomerData, filterPeriod, dailyValue, weeklyValue, monthlyValue, yearlyValue, customStartDate, customEndDate]);
    
    const commonInputClass = "block w-full md:w-auto px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm";
    const tabClass = (tabName: 'items' | 'customers') => 
        `px-4 py-2 text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 ${
        activeTab === tabName ? 'bg-primary-600 text-white' : 'text-slate-600 hover:bg-slate-200'}`;

    return (
        <div className="space-y-8 pb-8">
            <Card>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-xl font-bold text-slate-800">Laporan Keuangan</h1>
                        <p className="text-slate-500">Analisis data penjualan dan pengeluaran.</p>
                    </div>
                    <button onClick={exportToCSV} className="whitespace-nowrap flex-shrink-0 py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-secondary-600 hover:bg-secondary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-secondary-500">
                        Ekspor Laporan (CSV)
                    </button>
                </div>
            </Card>
            
             <Card>
                 <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <div className="p-4 bg-blue-50 rounded-lg">
                        <p className="text-sm font-medium text-blue-800">Total Penjualan</p>
                        <p className="text-2xl font-extrabold text-blue-700">{formatCurrency(summary.totalRevenue)}</p>
                    </div>
                     <div className="p-4 bg-red-50 rounded-lg">
                        <p className="text-sm font-medium text-red-800">Total Pengeluaran</p>
                        <p className="text-2xl font-extrabold text-red-700">{formatCurrency(summary.totalExpenses)}</p>
                    </div>
                     <div className="p-4 bg-primary-50 rounded-lg">
                        <p className="text-sm font-medium text-primary-800">Jumlah Transaksi</p>
                        <p className="text-2xl font-extrabold text-primary-700">{summary.totalTransactions}</p>
                    </div>
                     <div className="p-4 bg-primary-50 rounded-lg">
                        <p className="text-sm font-medium text-primary-800">Item Terjual</p>
                        <p className="text-2xl font-extrabold text-primary-700">{summary.totalItemsSold}</p>
                    </div>
                </div>

                <div className="mb-4">
                    <p className="text-sm font-medium text-slate-600 mb-2">Pilih Periode Laporan:</p>
                    <div className="flex flex-wrap gap-2">
                        {(['daily', 'weekly', 'monthly', 'yearly', 'custom'] as FilterPeriod[]).map(period => (
                            <button
                                key={period}
                                onClick={() => { setFilterPeriod(period); setCurrentPage(1); }}
                                className={`px-4 py-2 text-sm font-medium rounded-full transition-colors ${filterPeriod === period ? 'bg-primary-600 text-white' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}
                            >
                                {
                                    {daily: 'Harian', weekly: 'Mingguan', monthly: 'Bulanan', yearly: 'Tahunan', custom: 'Rentang Tanggal'}[period]
                                }
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex flex-col md:flex-row md:items-end gap-4 mb-4">
                    <div className="flex-grow">
                        {filterPeriod === 'daily' && (<input type="date" value={dailyValue} onChange={(e) => { setDailyValue(e.target.value); setCurrentPage(1); }} className={commonInputClass} />)}
                        {filterPeriod === 'weekly' && (<input type="week" value={weeklyValue} onChange={(e) => { setWeeklyValue(e.target.value); setCurrentPage(1); }} className={commonInputClass} />)}
                        {filterPeriod === 'monthly' && (<input type="month" value={monthlyValue} onChange={(e) => { setMonthlyValue(e.target.value); setCurrentPage(1); }} className={commonInputClass} />)}
                        {filterPeriod === 'yearly' && (<input type="number" placeholder="YYYY" value={yearlyValue} onChange={(e) => { setYearlyValue(e.target.value); setCurrentPage(1); }} className={commonInputClass} />)}
                        {filterPeriod === 'custom' && (
                             <div className="flex flex-col sm:flex-row gap-4 items-center mt-2">
                                <div className='flex items-center gap-2'>
                                    <label htmlFor="startDate" className="text-sm font-medium text-slate-600">Dari</label>
                                    <input type="date" id="startDate" value={customStartDate} onChange={(e) => { setCustomStartDate(e.target.value); setCurrentPage(1); }} className={commonInputClass} />
                                </div>
                                <div className='flex items-center gap-2'>
                                    <label htmlFor="endDate" className="text-sm font-medium text-slate-600">Sampai</label>
                                    <input type="date" id="endDate" value={customEndDate} onChange={(e) => { setCustomEndDate(e.target.value); setCurrentPage(1); }} className={commonInputClass} />
                                </div>
                            </div>
                        )}
                    </div>
                    <input
                        type="text"
                        value={searchFilter}
                        onChange={(e) => { setSearchFilter(e.target.value); setCurrentPage(1); }}
                        placeholder={activeTab === 'items' ? "Cari nama, kontak, atau no. pesanan..." : "Cari nama pelanggan..."}
                        className="block w-full md:w-2/3 px-4 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    />
                </div>
            </Card>

            <Card>
                <div className="border-b border-slate-200 mb-6">
                    <nav className="flex space-x-2" aria-label="Tabs">
                        <button onClick={() => handleTabChange('items')} className={tabClass('items')}>Laporan per Item</button>
                        <button onClick={() => handleTabChange('customers')} className={tabClass('customers')}>Laporan per Pelanggan</button>
                    </nav>
                </div>

                {activeTab === 'items' && (
                    <>
                        <h3 className="text-lg font-semibold text-slate-700 mb-4">Rincian Penjualan per Item</h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left text-slate-500 responsive-table">
                                <thead className="text-xs text-slate-700 uppercase bg-slate-50">
                                    <tr>
                                        <SortableHeader columnKey="date" title="Tanggal" sortConfig={sortConfig} requestSort={requestSort} className="text-left" />
                                        <SortableHeader columnKey="orderNumber" title="No. Pesanan" sortConfig={sortConfig} requestSort={requestSort} className="text-left" />
                                        <SortableHeader columnKey="customerName" title="Pelanggan" sortConfig={sortConfig} requestSort={requestSort} className="text-left" />
                                        <SortableHeader columnKey="customerContact" title="Kontak" sortConfig={sortConfig} requestSort={requestSort} className="text-left" />
                                        <SortableHeader columnKey="serviceName" title="Layanan" sortConfig={sortConfig} requestSort={requestSort} className="text-left" />
                                        <SortableHeader columnKey="quantity" title="Jml" sortConfig={sortConfig} requestSort={requestSort} className="text-right" />
                                        <SortableHeader columnKey="total" title="Total Item" sortConfig={sortConfig} requestSort={requestSort} className="text-right" />
                                    </tr>
                                </thead>
                                <tbody>
                                    {(paginatedData as typeof processedItemData).length === 0 ? (
                                        <tr><td colSpan={7} className="text-center py-10 text-slate-400">Tidak ada data yang cocok.</td></tr>
                                    ) : (
                                        (paginatedData as typeof processedItemData).map(row => (
                                            <tr key={`${row.transactionId}-${row.id}`} className="bg-white border-b hover:bg-slate-50">
                                                <td data-label="Tanggal" className="px-6 py-4">{new Date(row.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                                                <td data-label="No. Pesanan" className="px-6 py-4 font-mono text-xs">{row.orderNumber}</td>
                                                <td data-label="Pelanggan" className="px-6 py-4 font-medium text-slate-900">{row.customerName}</td>
                                                <td data-label="Kontak" className="px-6 py-4">{row.customerContact}</td>
                                                <td data-label="Layanan" className="px-6 py-4">{row.serviceName}</td>
                                                <td data-label="Jml" className="px-6 py-4 text-right">{row.quantity}</td>
                                                <td data-label="Total Item" className="px-6 py-4 text-right font-semibold">{formatCurrency(row.total)}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}

                {activeTab === 'customers' && (
                    <>
                        <h3 className="text-lg font-semibold text-slate-700 mb-4">Rincian Penjualan per Pelanggan</h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left text-slate-500 responsive-table">
                                <thead className="text-xs text-slate-700 uppercase bg-slate-50">
                                    <tr>
                                        <SortableHeader columnKey="customerName" title="Nama Pelanggan" sortConfig={sortConfig} requestSort={requestSort} className="text-left" />
                                        <SortableHeader columnKey="transactionCount" title="Total Trx" sortConfig={sortConfig} requestSort={requestSort} className="text-right" />
                                        <SortableHeader columnKey="totalDiscount" title="Total Diskon" sortConfig={sortConfig} requestSort={requestSort} className="text-right" />
                                        <SortableHeader columnKey="totalPurchase" title="Total Pembelian" sortConfig={sortConfig} requestSort={requestSort} className="text-right" />
                                    </tr>
                                </thead>
                                <tbody>
                                     {(paginatedData as typeof processedCustomerData).length === 0 ? (
                                        <tr><td colSpan={4} className="text-center py-10 text-slate-400">Tidak ada data yang cocok.</td></tr>
                                    ) : (
                                        (paginatedData as typeof processedCustomerData).map(row => (
                                            <tr key={row.customerName} className="bg-white border-b hover:bg-slate-50">
                                                <td data-label="Nama Pelanggan" className="px-6 py-4 font-medium text-slate-900">{row.customerName}</td>
                                                <td data-label="Total Trx" className="px-6 py-4 text-right">{row.transactionCount}</td>
                                                <td data-label="Total Diskon" className="px-6 py-4 text-right text-green-600">{formatCurrency(row.totalDiscount)}</td>
                                                <td data-label="Total Pembelian" className="px-6 py-4 text-right font-bold">{formatCurrency(row.totalPurchase)}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
                
                 <div className="mt-4 flex flex-col sm:flex-row justify-between items-center gap-4 text-sm">
                    <div className="flex items-center gap-2">
                        <label htmlFor="rowsPerPage">Baris per halaman:</label>
                        <select
                            id="rowsPerPage"
                            value={rowsPerPage}
                            onChange={(e) => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                            className="bg-white border border-slate-300 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary-500"
                        >
                            <option value={10}>10</option>
                            <option value={25}>25</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                        </select>
                    </div>
                     <div className="flex items-center gap-4">
                        <span>Halaman {totalPages > 0 ? currentPage : 0} dari {totalPages}</span>
                         <div className="flex items-center gap-1">
                            <button onClick={() => handlePageChange(1)} disabled={currentPage === 1 || totalPages === 0} className="px-2 py-1 border rounded-md disabled:opacity-50 disabled:cursor-not-allowed">{'<<'}</button>
                            <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1 || totalPages === 0} className="px-2 py-1 border rounded-md disabled:opacity-50 disabled:cursor-not-allowed">{'<'}</button>
                            <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages || totalPages === 0} className="px-2 py-1 border rounded-md disabled:opacity-50 disabled:cursor-not-allowed">{'>'}</button>
                             <button onClick={() => handlePageChange(totalPages)} disabled={currentPage === totalPages || totalPages === 0} className="px-2 py-1 border rounded-md disabled:opacity-50 disabled:cursor-not-allowed">{'>>'}</button>
                        </div>
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default ReportsPage;