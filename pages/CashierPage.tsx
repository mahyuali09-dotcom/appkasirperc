import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import ReactDOM from 'react-dom/client';
import useLocalStorage from '../hooks/useLocalStorage';
import { useApp } from '../src/context/AppContext';
import { INITIAL_PRICES, DEFAULT_LOGO_BASE64, DEFAULT_RECEIPT_SETTINGS, DEFAULT_DISCOUNT_SETTINGS, DEFAULT_CASHIER_SETTINGS } from '../constants';
import { Transaction, TransactionItem, ServicePrice, ReceiptSettings, CustomerType, FileType, DiscountSettings, CashierSettings, OrderStatus } from '../types';
import Card from '../components/ui/Card';
import { generateReceiptHTML, printReceipt } from '../utils/receipt';
import ShareableReceipt from '../components/ShareableReceipt';

declare const htmlToImage: any;


const CashierPage: React.FC = () => {
    const { 
        prices, 
        transactions, 
        addTransaction, 
        updateTransaction, 
        receiptLogo: logo, 
        receiptSettings, 
        discountSettings, 
        cashierSettings,
        isLoading
    } = useApp();

    const location = useLocation();
    const navigate = useNavigate();

    const [editModeTxId, setEditModeTxId] = useState<string | null>(null);

    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [customerName, setCustomerName] = useState('CASH');
    const [customerContact, setCustomerContact] = useState('');
    const [customerType, setCustomerType] = useState<CustomerType>(cashierSettings.customerTypes[0] || 'Pelanggan Baru');
    const [fileType, setFileType] = useState<FileType>(cashierSettings.fileTypes[0] || 'Ada');
    const [orderNumber, setOrderNumber] = useState('');
    const [selectedService, setSelectedService] = useState<string>(prices[0]?.id || '');
    const [quantity, setQuantity] = useState(1);
    const [area, setArea] = useState<number | string>(1);
    const [length, setLength] = useState<number | string>(1);
    const [width, setWidth] = useState<number | string>(1);
    const [currentItems, setCurrentItems] = useState<TransactionItem[]>([]);
    const [downPayment, setDownPayment] = useState(0);
    const [paymentAmount, setPaymentAmount] = useState(0);
    const [paymentMethod, setPaymentMethod] = useState<'Tunai' | 'Transfer'>('Tunai');
    const [paymentNotes, setPaymentNotes] = useState('');

    const calculateDiscount = useCallback((
        serviceName: string,
        quantity: number,
        area: number | undefined,
        pricePerUnit: number,
        currentCustomerType: CustomerType,
        currentFileType: FileType
    ): { discountAmount: number, finalTotal: number } => {
        const preDiscountTotal = pricePerUnit * quantity * (area || 1);
        let discountPercentage = 0;
        
        const service = prices.find(p => p.name === serviceName);
        if (!service) {
            return { discountAmount: 0, finalTotal: preDiscountTotal };
        }

        // Langkah 1: Prioritaskan "Diskon Layanan Spesifik" (Aturan Kondisional).
        // Aturan ini didasarkan pada kombinasi layanan, jenis pelanggan, dan jenis file.
        // Opsi 'Semua' pada aturan akan cocok dengan jenis pelanggan/file apa pun.
        const applicableConditionalRules = (discountSettings.conditionalRules || [])
            .filter(rule => {
                const serviceMatch = rule.serviceId === service.id;
                const customerTypeMatch = rule.customerType === 'Semua' || rule.customerType === currentCustomerType;
                const fileTypeMatch = rule.fileType === 'Semua' || rule.fileType === currentFileType;
                return serviceMatch && customerTypeMatch && fileTypeMatch;
            });
        
        if (applicableConditionalRules.length > 0) {
            // Jika ada beberapa aturan yang cocok, pilih yang paling spesifik.
            // Aturan yang menargetkan jenis pelanggan/file spesifik akan mendapat skor lebih tinggi
            // daripada aturan yang menggunakan 'Semua', sehingga lebih diutamakan.
            const getScore = (rule: typeof applicableConditionalRules[0]) => {
                let score = 0;
                if (rule.customerType !== 'Semua') score += 2;
                if (rule.fileType !== 'Semua') score += 1;
                return score;
            };

            const mostSpecificRule = applicableConditionalRules.reduce((best, current) => {
                return getScore(current) > getScore(best) ? current : best;
            });
            discountPercentage = mostSpecificRule.discountPercentage;
        } 
        // Langkah 2: Jika tidak ada aturan kondisional yang cocok, periksa "Diskon Berdasarkan Jumlah".
        else {
            const applicableQuantityRules = (discountSettings.quantityRules || [])
                .filter(rule => rule.serviceId === service.id && quantity >= rule.minQuantity)
                .sort((a, b) => b.minQuantity - a.minQuantity); 

            if (applicableQuantityRules.length > 0) {
                discountPercentage = applicableQuantityRules[0].discountPercentage;
            }
        }

        const discountAmount = preDiscountTotal * (discountPercentage / 100);
        const finalTotal = preDiscountTotal - discountAmount;
        
        return { discountAmount, finalTotal };
    }, [prices, discountSettings]);


    useEffect(() => {
        const txToEdit = location.state?.transactionToEdit as Transaction | undefined;
        if (txToEdit) {
            setEditModeTxId(txToEdit.id);
            setDate(txToEdit.date);
            setOrderNumber(txToEdit.orderNumber || '');
            setCustomerName(txToEdit.customerName);
            setCustomerContact(txToEdit.customerContact || '');
            setCustomerType(txToEdit.customerType || cashierSettings.customerTypes[0]);
            setFileType(txToEdit.fileType || cashierSettings.fileTypes[0]);
            setPaymentNotes(txToEdit.paymentNotes || '');
            setCurrentItems(txToEdit.items);
            setDownPayment(txToEdit.downPayment || 0);
            setPaymentAmount(txToEdit.paymentAmount);
            setPaymentMethod(txToEdit.paymentMethod);
            
            window.history.replaceState({}, document.title);
        }
    }, [location.state, cashierSettings]);
    
    useEffect(() => {
      if (prices.length > 0 && !prices.find(p => p.id === selectedService)) {
        setSelectedService(prices[0].id);
      } else if (prices.length === 0) {
        setSelectedService('');
      }
    }, [prices, selectedService]);
    
    useEffect(() => {
        if (editModeTxId) return;

        const generateNewOrderNumber = () => {
            const transactionsOnDate = transactions.filter(t => t.date === date);
            const nextId = transactionsOnDate.length + 1;
            const paddedId = String(nextId).padStart(3, '0');
            const formattedDate = date.replace(/-/g, '');
            return `INV/${formattedDate}/${paddedId}`;
        };
        setOrderNumber(generateNewOrderNumber());
    }, [date, transactions, editModeTxId]);


    const serviceDetails = useMemo(() => prices.find(p => p.id === selectedService), [prices, selectedService]);
    const isAreaRequired = useMemo(() => serviceDetails?.requiresArea || false, [serviceDetails]);
    const isAreaService = useMemo(() => {
        if (!serviceDetails) return false;
        const unit = serviceDetails.unit.toLowerCase();
        return serviceDetails.requiresArea && (unit.includes('m') || unit.includes('meter'));
    }, [serviceDetails]);
    
    useEffect(() => {
        setQuantity(1);
        setArea(1);
        setLength(1);
        setWidth(1);
    }, [selectedService]);

    useEffect(() => {
        if (isAreaService) {
            const l = parseFloat(String(length)) || 0;
            const w = parseFloat(String(width)) || 0;
            const calculatedArea = l * w;
            setArea(Math.round(calculatedArea * 1000) / 1000); // Round to 3 decimal places
        }
    }, [length, width, isAreaService]);

     // Reset selected customer/file type if it's no longer in the settings
    useEffect(() => {
        if (cashierSettings.customerTypes.length > 0 && !cashierSettings.customerTypes.includes(customerType)) {
            setCustomerType(cashierSettings.customerTypes[0]);
        }
    }, [cashierSettings.customerTypes, customerType]);

    useEffect(() => {
        if (cashierSettings.fileTypes.length > 0 && !cashierSettings.fileTypes.includes(fileType)) {
            setFileType(cashierSettings.fileTypes[0]);
        }
    }, [cashierSettings.fileTypes, fileType]);


    // Recalculate discounts for all items when customer type or file type changes
    useEffect(() => {
        if (currentItems.length === 0) return;

        const recalculateItemDiscount = (item: TransactionItem): TransactionItem => {
            const { discountAmount, finalTotal } = calculateDiscount(
                item.serviceName,
                item.quantity,
                item.area,
                item.pricePerUnit,
                customerType,
                fileType
            );
            return { ...item, total: finalTotal, discount: discountAmount };
        };

        const newItems = currentItems.map(recalculateItemDiscount);
        
        if (JSON.stringify(newItems) !== JSON.stringify(currentItems)) {
            setCurrentItems(newItems);
        }

    }, [customerType, fileType, discountSettings, currentItems, calculateDiscount]);


    const numericArea = useMemo(() => {
        const val = parseFloat(String(area));
        return isNaN(val) ? 0 : val;
    }, [area]);

    const formatCurrency = (amount: number) => `Rp ${new Intl.NumberFormat('id-ID').format(amount)}`;
    const formatNumber = (amount: number) => new Intl.NumberFormat('id-ID').format(amount);
    
    const handleCurrencyInputChange = (setter: React.Dispatch<React.SetStateAction<number>>) => (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        const numericValue = parseInt(value.replace(/[^0-9]/g, ''), 10) || 0;
        setter(numericValue);
    };

    const handleAddItem = () => {
        if (!serviceDetails) {
            alert('Harap pilih layanan yang valid.');
            return;
        }
        // Pastikan jumlah adalah bilangan bulat positif.
        if (!Number.isInteger(quantity) || quantity <= 0) {
            alert('Jumlah pesanan harus berupa bilangan bulat positif.');
            return;
        }
        if (isAreaRequired && numericArea <= 0) {
            alert('Luas/Panjang harus lebih dari 0 untuk layanan ini.');
            return;
        }

        const { discountAmount, finalTotal } = calculateDiscount(
            serviceDetails.name,
            quantity,
            isAreaRequired ? numericArea : undefined,
            serviceDetails.price,
            customerType,
            fileType
        );


        const newItem: TransactionItem = {
            id: new Date().getTime().toString(),
            serviceName: serviceDetails.name,
            quantity,
            pricePerUnit: serviceDetails.price,
            total: finalTotal,
            discount: discountAmount,
            unit: serviceDetails.unit,
        };

        if (isAreaRequired) {
            newItem.area = numericArea;
        }

        setCurrentItems(prev => [...prev, newItem]);
        // Reset form
        setSelectedService(prices[0]?.id || '');
        setQuantity(1);
        setArea(1);
        setLength(1);
        setWidth(1);
    };

    const calculations = useMemo(() => {
        const subtotalAfterDiscount = currentItems.reduce((acc, item) => acc + item.total, 0);
        const totalDiscount = currentItems.reduce((acc, item) => acc + (item.discount || 0), 0);
        const subtotal = subtotalAfterDiscount + totalDiscount;
        const tax = receiptSettings.isTaxEnabled ? subtotalAfterDiscount * (receiptSettings.taxRate / 100) : 0;
        const grandTotal = subtotalAfterDiscount + tax;
        const remainingBalance = grandTotal - downPayment;
        const paymentTarget = downPayment > 0 ? downPayment : grandTotal;
        const change = paymentMethod === 'Tunai' ? paymentAmount - paymentTarget : 0;
        return { subtotal, totalDiscount, tax, grandTotal, remainingBalance, change };
    }, [currentItems, paymentAmount, receiptSettings, paymentMethod, downPayment]);


    useEffect(() => {
        if (paymentMethod === 'Transfer') {
            const paymentTarget = downPayment > 0 ? downPayment : calculations.grandTotal;
            setPaymentAmount(paymentTarget);
        }
    }, [paymentMethod, calculations.grandTotal, downPayment]);


    const handleSaveOrUpdateTransaction = () => {
        if (currentItems.length === 0) {
            alert('Tidak ada item dalam transaksi.');
            return;
        }
        if (!customerName.trim()) {
            alert('Nama pelanggan tidak boleh kosong.');
            return;
        }

        const { subtotal, tax, grandTotal, change, remainingBalance, totalDiscount } = calculations;

        const transactionData: Omit<Transaction, 'id' | 'status'> = {
            date,
            timestamp: Date.now(),
            customerName,
            customerContact: customerContact.trim() || undefined,
            customerType,
            fileType,
            orderNumber: orderNumber,
            items: currentItems,
            subtotal,
            discount: totalDiscount,
            tax,
            grandTotal,
            downPayment: downPayment > 0 ? downPayment : undefined,
            remainingBalance: downPayment > 0 ? (remainingBalance < 0 ? 0 : remainingBalance) : undefined,
            paymentAmount,
            change: change > 0 ? change : 0,
            paymentMethod,
            paymentNotes: paymentNotes.trim() || undefined,
        };

        if (editModeTxId) {
            const existingTx = transactions.find(tx => tx.id === editModeTxId);
            let finalStatus: OrderStatus = existingTx?.status || 'Terima pesanan';

            if (remainingBalance <= 0 && finalStatus === 'Selesai') {
                finalStatus = 'Diambil';
            }
            
            const updatedTransaction: Transaction = {
                ...transactionData,
                id: editModeTxId,
                status: finalStatus, 
            };
            
            const processSave = async () => {
                const success = await updateTransaction(updatedTransaction);
                if (success) {
                    alert('Transaksi berhasil diperbarui!');
                    navigate('/pesanan');
                } else {
                    alert('Gagal memperbarui transaksi. Periksa koneksi atau kredensial Supabase Anda.');
                }
            };
            processSave();
        } else {
             let finalStatus: OrderStatus = 'Terima pesanan';
             if (remainingBalance <= 0 && finalStatus === 'Selesai') {
                 finalStatus = 'Diambil';
             }

             const newTransaction: Transaction = {
                ...transactionData,
                id: new Date().getTime().toString(),
                status: finalStatus,
            };
            
            const processSave = async () => {
                const success = await addTransaction(newTransaction);
                if (success) {
                    alert('Transaksi berhasil disimpan!');
                    // Reset all
                    setCurrentItems([]);
                    setCustomerName('CASH');
                    setCustomerContact('');
                    setCustomerType(cashierSettings.customerTypes[0] || '');
                    setFileType(cashierSettings.fileTypes[0] || '');
                    setPaymentAmount(0);
                    setDownPayment(0);
                    setPaymentMethod('Tunai');
                    setPaymentNotes('');
                } else {
                    alert('Gagal menyimpan transaksi ke database. Pastikan tabel Supabase sudah dibuat dan kunci API sudah benar.');
                }
            };
            processSave();
        }
    };

    const buildTemporaryTransaction = (): Transaction => {
        const { subtotal, tax, grandTotal, change, remainingBalance, totalDiscount } = calculations;
        const existingTx = transactions.find(tx => tx.id === editModeTxId);

        return {
            id: editModeTxId || 'temp-id',
            date,
            timestamp: Date.now(),
            customerName,
            customerContact,
            customerType,
            fileType,
            orderNumber: orderNumber,
            items: currentItems,
            subtotal,
            discount: totalDiscount,
            tax,
            grandTotal,
            downPayment: downPayment > 0 ? downPayment : undefined,
            remainingBalance: downPayment > 0 ? (remainingBalance < 0 ? 0 : remainingBalance) : undefined,
            paymentAmount,
            change: change > 0 ? change : 0,
            status: existingTx?.status || 'Terima pesanan',
            paymentMethod,
            paymentNotes: paymentNotes.trim() || undefined,
        };
    };

    const handlePrint = () => {
        if (currentItems.length === 0) {
            alert("Tambahkan item terlebih dahulu.");
            return;
        }
        const tempTransaction = buildTemporaryTransaction();
        const receiptHTML = generateReceiptHTML(tempTransaction, receiptSettings, logo);
        printReceipt(receiptHTML);
    };

    const handleShareImage = async () => {
        if (currentItems.length === 0) {
            alert("Tambahkan item terlebih dahulu.");
            return;
        }
        const tempTransaction = buildTemporaryTransaction();
    
        const receiptContainer = document.createElement('div');
        receiptContainer.style.position = 'absolute';
        receiptContainer.style.left = '-9999px';
        document.body.appendChild(receiptContainer);
    
        const root = ReactDOM.createRoot(receiptContainer);
    
        root.render(
            <ShareableReceipt 
                transaction={tempTransaction} 
                receiptSettings={receiptSettings}
                logo={logo}
            />
        );
    
        // Wait for rendering to settle
        await new Promise(resolve => setTimeout(resolve, 500));
    
        try {
            const blob = await htmlToImage.toBlob(receiptContainer.firstChild as HTMLElement, {
                quality: 0.95,
                cacheBust: true,
            });
    
            if (!blob) {
                throw new Error('Gagal membuat gambar struk.');
            }
    
            const file = new File([blob], `struk-${tempTransaction.orderNumber || 'transaksi'}.png`, { type: 'image/png' });
    
            if (navigator.share && navigator.canShare({ files: [file] })) {
                 await navigator.share({
                    title: `Struk Pesanan ${tempTransaction.orderNumber}`,
                    files: [file],
                });
            } else {
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = `struk-${tempTransaction.orderNumber || 'transaksi'}.png`;
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
                    link.download = `struk-${tempTransaction.orderNumber || 'transaksi'}.png`;
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

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pb-8">
            <div className="lg:col-span-1">
                <Card title={editModeTxId ? "Edit Pesanan" : "Input Pesanan"}>
                    <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="date" className="block text-sm font-medium text-slate-600">Tanggal</label>
                                <input type="date" id="date" value={date} onChange={e => setDate(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm" />
                            </div>
                            <div>
                                <label htmlFor="orderNumber" className="block text-sm font-medium text-slate-600">Nomor Pesanan</label>
                                <input 
                                    type="text" 
                                    id="orderNumber" 
                                    value={orderNumber} 
                                    readOnly 
                                    className="mt-1 block w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded-md shadow-sm focus:outline-none sm:text-sm text-slate-500"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="customerName" className="block text-sm font-medium text-slate-600">Nama Pelanggan</label>
                                <input type="text" id="customerName" placeholder="CASH" value={customerName} onChange={e => setCustomerName(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm" />
                            </div>
                             <div>
                                <label htmlFor="customerContact" className="block text-sm font-medium text-slate-600">Kontak (Opsional)</label>
                                <input type="text" id="customerContact" placeholder="Nomor Telepon/WA" value={customerContact} onChange={e => setCustomerContact(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm" />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="customerType" className="block text-sm font-medium text-slate-600">Jenis Pelanggan</label>
                                <select id="customerType" value={customerType} onChange={e => setCustomerType(e.target.value as CustomerType)} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-slate-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md">
                                    {cashierSettings.customerTypes.map(type => (
                                        <option key={type} value={type}>{type}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="fileType" className="block text-sm font-medium text-slate-600">Jenis File</label>
                                <select id="fileType" value={fileType} onChange={e => setFileType(e.target.value as FileType)} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-slate-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md">
                                    {cashierSettings.fileTypes.map(type => (
                                        <option key={type} value={type}>{type}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                         <div>
                            <label htmlFor="paymentNotes" className="block text-sm font-medium text-slate-600">Keterangan Pembayaran (Opsional)</label>
                            <textarea 
                                id="paymentNotes" 
                                rows={2}
                                value={paymentNotes} 
                                onChange={e => setPaymentNotes(e.target.value)} 
                                className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                                placeholder="Contoh: DP 50% untuk pesanan kaos"
                            />
                        </div>
                         <div>
                            <label htmlFor="service" className="block text-sm font-medium text-slate-600">Jenis Pesanan</label>
                            <select id="service" value={selectedService} onChange={e => setSelectedService(e.target.value)} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-slate-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md">
                                {prices.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                           <div>
                                <label htmlFor="quantity" className="block text-sm font-medium text-slate-600">Jumlah Pesanan</label>
                                <input type="number" id="quantity" value={quantity} onChange={e => setQuantity(parseInt(e.target.value, 10) || 0)} min="1" className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm" />
                            </div>
                            {isAreaRequired && !isAreaService && (
                                <div>
                                    <label htmlFor="area" className="block text-sm font-medium text-slate-600">Luas/Panjang ({serviceDetails?.unit})</label>
                                    <input type="number" id="area" value={area} onChange={e => setArea(e.target.value)} min="0.1" step="0.1" className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm" />
                                </div>
                            )}
                        </div>
                        {isAreaService && (
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
                                <div>
                                    <label htmlFor="length" className="block text-sm font-medium text-slate-600">Panjang (m)</label>
                                    <input type="number" id="length" value={length} onChange={e => setLength(e.target.value)} min="0.1" step="0.1" className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm" />
                                </div>
                                <div>
                                    <label htmlFor="width" className="block text-sm font-medium text-slate-600">Tinggi/Lebar (m)</label>
                                    <input type="number" id="width" value={width} onChange={e => setWidth(e.target.value)} min="0.1" step="0.1" className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm" />
                                </div>
                                <div>
                                    <label htmlFor="calculatedArea" className="block text-sm font-medium text-slate-600">Luas Total (m²)</label>
                                    <input type="text" id="calculatedArea" value={area} readOnly className="mt-1 block w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded-md shadow-sm focus:outline-none sm:text-sm text-slate-500" />
                                </div>
                            </div>
                        )}

                        <div>
                            <p className="text-sm text-slate-500">Harga: {formatCurrency(serviceDetails?.price || 0)} / {serviceDetails?.unit}</p>
                        </div>
                        <button type="button" onClick={handleAddItem} className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-secondary-500 hover:bg-secondary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-secondary-500 transition-transform transform hover:scale-105">
                            Tambah ke Transaksi
                        </button>
                    </form>
                </Card>
            </div>

            <div className="lg:col-span-1 space-y-8">
                <Card title="Transaksi Saat Ini">
                    <div className="min-h-[200px] overflow-x-auto">
                        <table className="w-full text-sm text-left text-slate-500">
                           <thead className="text-xs text-slate-700 uppercase bg-slate-50">
                                <tr>
                                    <th scope="col" className="px-6 py-3">Item</th>
                                    <th scope="col" className="px-6 py-3">Detail</th>
                                    <th scope="col" className="px-6 py-3 text-right">Subtotal</th>
                                </tr>
                            </thead>
                            <tbody>
                                {currentItems.length === 0 ? (
                                    <tr><td colSpan={3} className="text-center py-10 text-slate-400">Belum ada item ditambahkan.</td></tr>
                                ) : (
                                    currentItems.map((item) => (
                                        <tr key={item.id} className="bg-white border-b">
                                            <td className="px-6 py-4 font-medium text-slate-900">{item.serviceName}</td>
                                            <td className="px-6 py-4">
                                                {item.quantity} x {formatCurrency(item.pricePerUnit)} {item.area ? `x ${item.area}${item.unit}` : ''}
                                                {item.discount && item.discount > 0 && <span className="block text-xs text-green-600">Diskon -{formatCurrency(item.discount)}</span>}
                                            </td>
                                            <td className="px-6 py-4 text-right font-semibold">{formatCurrency(item.total)}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                    <div className="mt-6 p-4 bg-primary-50 rounded-lg space-y-2">
                        <div className="flex justify-between items-center text-sm">
                            <span className="font-medium text-slate-600">Subtotal</span>
                            <span className="font-semibold text-slate-800">{formatCurrency(calculations.subtotal)}</span>
                        </div>
                         {calculations.totalDiscount > 0 && (
                            <div className="flex justify-between items-center text-sm">
                                <span className="font-medium text-slate-600">Diskon</span>
                                <span className="font-semibold text-green-600">-{formatCurrency(calculations.totalDiscount)}</span>
                            </div>
                        )}
                        {receiptSettings.isTaxEnabled && (
                         <div className="flex justify-between items-center text-sm">
                            <span className="font-medium text-slate-600">Pajak ({receiptSettings.taxRate}%)</span>
                            <span className="font-semibold text-slate-800">{formatCurrency(calculations.tax)}</span>
                        </div>
                        )}
                        <hr className="my-1 border-slate-200" />
                        <div className="flex justify-between items-center">
                            <span className="text-lg font-bold text-primary-800">Total</span>
                            <span className="text-2xl font-extrabold text-primary-700">{formatCurrency(calculations.grandTotal)}</span>
                        </div>
                        
                        <div className="flex justify-between items-center pt-2">
                             <label htmlFor="downPayment" className="text-base font-bold text-slate-700">DP Dibayar</label>
                             <input
                                type="text"
                                id="downPayment"
                                value={formatNumber(downPayment)}
                                onChange={handleCurrencyInputChange(setDownPayment)}
                                className="w-1/2 px-3 py-1 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-base text-right font-bold"
                                placeholder="0"
                            />
                        </div>

                         {downPayment > 0 && (
                            <div className="flex justify-between items-center">
                                <span className="text-base font-bold text-slate-700">Sisa Bayar</span>
                                <span className="text-xl font-extrabold text-red-600">{formatCurrency(calculations.remainingBalance < 0 ? 0 : calculations.remainingBalance)}</span>
                            </div>
                        )}
                        
                        <div className="pt-2">
                            <span className="text-sm font-medium text-slate-600">Metode Pembayaran</span>
                            <div className="mt-2 flex items-center gap-6">
                                <div className="flex items-center">
                                    <input type="radio" id="tunai" value="Tunai" name="paymentMethod" checked={paymentMethod === 'Tunai'} onChange={() => setPaymentMethod('Tunai')} className="h-4 w-4 border-gray-300 text-primary-600 focus:ring-primary-500" />
                                    <label htmlFor="tunai" className="ml-2 block text-sm font-medium text-slate-700">Tunai</label>
                                </div>
                                <div className="flex items-center">
                                    <input type="radio" id="transfer" value="Transfer" name="paymentMethod" checked={paymentMethod === 'Transfer'} onChange={() => setPaymentMethod('Transfer')} className="h-4 w-4 border-gray-300 text-primary-600 focus:ring-primary-500" />
                                    <label htmlFor="transfer" className="ml-2 block text-sm font-medium text-slate-700">Transfer</label>
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex justify-between items-center pt-2">
                            <label htmlFor="payment" className="text-base font-bold text-slate-700">Uang Diterima</label>
                            <input
                                type="text"
                                id="payment"
                                value={formatNumber(paymentAmount)}
                                onChange={handleCurrencyInputChange(setPaymentAmount)}
                                className="w-1/2 px-3 py-1 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-base text-right font-bold"
                                placeholder="0"
                                disabled={paymentMethod === 'Transfer'}
                            />
                        </div>

                        {paymentMethod === 'Tunai' && (
                            <div className="flex justify-between items-center">
                                <span className="text-base font-bold text-slate-700">Kembalian</span>
                                <span className="text-xl font-extrabold text-green-600">{formatCurrency(calculations.change < 0 ? 0 : calculations.change)}</span>
                            </div>
                        )}
                    </div>
                    <div className="mt-6 space-y-4">
                        <button onClick={handleSaveOrUpdateTransaction} className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-base font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-transform transform hover:scale-105">
                             {editModeTxId ? 'Update Transaksi' : 'Simpan Transaksi'}
                        </button>
                        <div className="grid grid-cols-2 gap-4">
                            <button onClick={handlePrint} className="w-full flex justify-center py-3 px-4 border border-primary-600 rounded-lg shadow-sm text-base font-medium text-primary-700 bg-white hover:bg-primary-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-transform transform hover:scale-105">
                                Cetak Struk
                            </button>
                            <button
                                onClick={handleShareImage}
                                disabled={currentItems.length === 0}
                                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-base font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-transform transform hover:scale-105 disabled:bg-slate-400 disabled:cursor-not-allowed"
                            >
                                Kirim Struk
                            </button>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default CashierPage;