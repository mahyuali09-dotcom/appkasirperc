import React, { useState, useRef, useMemo } from 'react';
import useLocalStorage from '../hooks/useLocalStorage';
import { useApp } from '../src/context/AppContext';
import { ThemeSettings, ReceiptSettings, DiscountSettings, QuantityDiscountRule, ServicePrice, ConditionalDiscountRule, CustomerType, FileType, CashierSettings, WhatsAppSettings, OrderStatus } from '../types';
import { DEFAULT_THEME_SETTINGS, THEMES, FONTS, FONT_SIZES, DEFAULT_RECEIPT_SETTINGS, DEFAULT_LOGO_BASE64, DEFAULT_DISCOUNT_SETTINGS, INITIAL_PRICES, DEFAULT_CASHIER_SETTINGS, DEFAULT_WHATSAPP_SETTINGS, ORDER_STATUSES } from '../constants';
import Card from '../components/ui/Card';
import ConfirmationModal from '../components/modals/ConfirmationModal';

const colorMap: { [key in ThemeSettings['primaryColor']]: string } = {
    blue: 'bg-blue-500',
    teal: 'bg-teal-500',
    purple: 'bg-purple-500',
};

const BLANK_QUANTITY_RULE_FORM: Omit<QuantityDiscountRule, 'id'> & { id?: string } = {
    serviceId: '',
    minQuantity: 1,
    discountPercentage: 0,
};

const BLANK_CONDITIONAL_RULE_FORM: Omit<ConditionalDiscountRule, 'id'> & { id?: string } = {
    name: '',
    serviceId: '',
    customerType: 'Semua',
    fileType: 'Semua',
    discountPercentage: 0,
};

const SettingsPage: React.FC = () => {
    const { 
        themeSettings, setThemeSettings,
        receiptSettings, setReceiptSettings,
        cashierSettings, setCashierSettings,
        discountSettings, setDiscountSettings,
        whatsappSettings: whatsAppSettings, setWhatsappSettings: setWhatsAppSettings,
        receiptLogo: logo, setReceiptLogo: setLogo,
        prices
    } = useApp();

    const [isImportConfirmOpen, setIsImportConfirmOpen] = useState(false);
    const [dataToImport, setDataToImport] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    const [newCustomerType, setNewCustomerType] = useState('');
    const [newFileType, setNewFileType] = useState('');

    // States for Quantity Rules
    const [editableQuantityRule, setEditableQuantityRule] = useState(BLANK_QUANTITY_RULE_FORM);
    const [quantityRuleToDelete, setQuantityRuleToDelete] = useState<string | null>(null);
    
    // States for Conditional Rules
    const [editableConditionalRule, setEditableConditionalRule] = useState(BLANK_CONDITIONAL_RULE_FORM);
    const [conditionalRuleToDelete, setConditionalRuleToDelete] = useState<string | null>(null);

    const CUSTOMER_TYPES_WITH_ALL = useMemo(() => ['Semua', ...cashierSettings.customerTypes], [cashierSettings.customerTypes]);
    const FILE_TYPES_WITH_ALL = useMemo(() => ['Semua', ...cashierSettings.fileTypes], [cashierSettings.fileTypes]);


    const serviceNameMap = useMemo(() => {
        return prices.reduce((map, service) => {
            map[service.id] = service.name;
            return map;
        }, {} as Record<string, string>);
    }, [prices]);

    const handleThemeSettingChange = <K extends keyof ThemeSettings>(key: K, value: ThemeSettings[K]) => {
        setThemeSettings({ ...themeSettings, [key]: value });
    };
    
    const handleReceiptSettingChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        if (type === 'checkbox') {
            const { checked } = e.target as HTMLInputElement;
            setReceiptSettings({ ...receiptSettings, [name]: checked });
        } else {
            setReceiptSettings({
                ...receiptSettings,
                [name]: type === 'number' ? parseFloat(value) || 0 : value
            });
        }
    };

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setLogo(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleRemoveLogo = () => {
        setLogo(DEFAULT_LOGO_BASE64);
    };

    const handleWhatsAppTemplateChange = (status: OrderStatus, value: string) => {
        setWhatsAppSettings({
            ...whatsAppSettings,
            notificationTemplates: {
                ...whatsAppSettings.notificationTemplates,
                [status]: value,
            }
        });
    };
    
    // --- Cashier Options Handlers ---
    const handleAddCustomerType = () => {
        const trimmed = newCustomerType.trim();
        if (trimmed && !cashierSettings.customerTypes.includes(trimmed)) {
            setCashierSettings({ ...cashierSettings, customerTypes: [...cashierSettings.customerTypes, trimmed] });
            setNewCustomerType('');
        }
    };
    
    const handleDeleteCustomerType = (typeToDelete: string) => {
        setCashierSettings({ ...cashierSettings, customerTypes: cashierSettings.customerTypes.filter(t => t !== typeToDelete) });
    };

    const handleAddFileType = () => {
        const trimmed = newFileType.trim();
        if (trimmed && !cashierSettings.fileTypes.includes(trimmed)) {
            setCashierSettings({ ...cashierSettings, fileTypes: [...cashierSettings.fileTypes, trimmed] });
            setNewFileType('');
        }
    };

    const handleDeleteFileType = (typeToDelete: string) => {
        setCashierSettings({ ...cashierSettings, fileTypes: cashierSettings.fileTypes.filter(t => t !== typeToDelete) });
    };


    // --- Quantity Rule Handlers ---
    const handleQuantityRuleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setEditableQuantityRule(prev => ({...prev, [name]: name === 'serviceId' ? value : (parseInt(value, 10) || 0)}));
    };

    const handleSaveQuantityRule = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editableQuantityRule.serviceId) {
            alert("Harap pilih layanan.");
            return;
        }
        if (editableQuantityRule.minQuantity <= 0) {
            alert("Jumlah minimum harus lebih dari 0.");
            return;
        }
        if (editableQuantityRule.discountPercentage < 0 || editableQuantityRule.discountPercentage > 100) {
            alert("Persentase diskon harus di antara 0 dan 100.");
            return;
        }

        // Check for duplicate rule for the same service
        const isDuplicate = discountSettings.quantityRules.some(
            rule => rule.serviceId === editableQuantityRule.serviceId && rule.id !== editableQuantityRule.id
        );
        if (isDuplicate) {
            alert("Aturan diskon kuantitas untuk layanan ini sudah ada. Harap edit aturan yang sudah ada.");
            return;
        }

        const existingRules = discountSettings.quantityRules || [];
        if (editableQuantityRule.id) { // Editing existing
            setDiscountSettings({
                ...discountSettings,
                quantityRules: existingRules.map(r => r.id === editableQuantityRule.id ? { ...editableQuantityRule, id: r.id } as QuantityDiscountRule : r)
            });
        } else { // Adding new
            const newRule: QuantityDiscountRule = {
                ...editableQuantityRule,
                id: new Date().getTime().toString(),
            } as QuantityDiscountRule;
            setDiscountSettings({ ...discountSettings, quantityRules: [...existingRules, newRule] });
        }
        setEditableQuantityRule(BLANK_QUANTITY_RULE_FORM); // Reset form
    };
    
    const handleEditQuantityRuleClick = (rule: QuantityDiscountRule) => {
        setEditableQuantityRule(rule);
    };

    const handleDeleteQuantityRuleClick = (ruleId: string) => {
        setQuantityRuleToDelete(ruleId);
    };

    const confirmDeleteQuantityRule = () => {
        if (!quantityRuleToDelete) return;
        setDiscountSettings({
            ...discountSettings,
            quantityRules: discountSettings.quantityRules.filter(r => r.id !== quantityRuleToDelete)
        });
        setQuantityRuleToDelete(null);
    };
    
    // --- Conditional Rule Handlers ---
    const handleConditionalRuleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
         const isNumberField = ['discountPercentage'].includes(name);
        setEditableConditionalRule(prev => ({
            ...prev,
            [name]: isNumberField ? parseInt(value, 10) || 0 : value
        }));
    };

    const handleSaveConditionalRule = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editableConditionalRule.name.trim() || !editableConditionalRule.serviceId) {
            alert("Nama aturan dan layanan tidak boleh kosong.");
            return;
        }

        const discountPercentage = Number(editableConditionalRule.discountPercentage);
        if (isNaN(discountPercentage) || discountPercentage < 0 || discountPercentage > 100) {
            alert("Persentase diskon harus di antara 0 dan 100.");
            return;
        }
        
        // Check for duplicate rule
        const isDuplicate = discountSettings.conditionalRules.some(rule =>
            rule.serviceId === editableConditionalRule.serviceId &&
            rule.customerType === editableConditionalRule.customerType &&
            rule.fileType === editableConditionalRule.fileType &&
            rule.id !== editableConditionalRule.id
        );

        if (isDuplicate) {
            alert("Aturan diskon dengan kombinasi yang sama persis sudah ada.");
            return;
        }

        const existingRules = discountSettings.conditionalRules || [];
        const ruleData = {
            ...editableConditionalRule,
            discountPercentage: discountPercentage,
        };

        if (ruleData.id) { // Editing
            setDiscountSettings({
                ...discountSettings,
                conditionalRules: existingRules.map(r => r.id === ruleData.id ? ruleData as ConditionalDiscountRule : r)
            });
        } else { // Adding
            const newRule: ConditionalDiscountRule = {
                ...ruleData,
                id: new Date().getTime().toString(),
            } as ConditionalDiscountRule;
            setDiscountSettings({ ...discountSettings, conditionalRules: [...existingRules, newRule] });
        }
        setEditableConditionalRule(BLANK_CONDITIONAL_RULE_FORM);
    };

    const handleEditConditionalRuleClick = (rule: ConditionalDiscountRule) => {
        setEditableConditionalRule(rule);
    };

    const handleDeleteConditionalRuleClick = (ruleId: string) => {
        setConditionalRuleToDelete(ruleId);
    };

    const confirmDeleteConditionalRule = () => {
        if (!conditionalRuleToDelete) return;
        setDiscountSettings({
            ...discountSettings,
            conditionalRules: discountSettings.conditionalRules.filter(r => r.id !== conditionalRuleToDelete)
        });
        setConditionalRuleToDelete(null);
    };

    // --- General Settings Handlers ---
    const resetSettings = () => {
        if (window.confirm('Apakah Anda yakin ingin mereset semua pengaturan ke default? Tindakan ini tidak dapat dibatalkan.')) {
            setThemeSettings(DEFAULT_THEME_SETTINGS);
            setReceiptSettings(DEFAULT_RECEIPT_SETTINGS);
            setCashierSettings(DEFAULT_CASHIER_SETTINGS);
            setDiscountSettings(DEFAULT_DISCOUNT_SETTINGS);
            setWhatsAppSettings(DEFAULT_WHATSAPP_SETTINGS);
            setLogo(DEFAULT_LOGO_BASE64);
            alert('Semua pengaturan telah direset ke default!');
        }
    };
    
    const handleExportData = () => {
        try {
            const dataToExport = {
                transactions: JSON.parse(localStorage.getItem('transactions') || '[]'),
                prices: JSON.parse(localStorage.getItem('prices') || '[]'),
                themeSettings: JSON.parse(localStorage.getItem('themeSettings') || '{}'),
                receiptSettings: JSON.parse(localStorage.getItem('receiptSettings') || '{}'),
                cashierSettings: JSON.parse(localStorage.getItem('cashierSettings') || '{}'),
                discountSettings: JSON.parse(localStorage.getItem('discountSettings') || '{}'),
                whatsAppSettings: JSON.parse(localStorage.getItem('whatsAppSettings') || '{}'),
                receiptLogo: localStorage.getItem('receiptLogo') || '',
            };

            const jsonString = JSON.stringify(dataToExport, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const href = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = href;
            const date = new Date().toISOString().split('T')[0];
            link.download = `advcash_backup_${date}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(href);
        } catch (error) {
            console.error("Gagal mengekspor data:", error);
            alert("Terjadi kesalahan saat mengekspor data.");
        }
    };

    const handleImportFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const result = event.target?.result;
            if (typeof result === 'string') {
                setDataToImport(result);
                setIsImportConfirmOpen(true);
            }
        };
        reader.onerror = () => {
             alert('Gagal membaca file.');
        }
        reader.readAsText(file);
        
        if(fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };
    
    const handleConfirmImport = () => {
        if (!dataToImport) return;

        try {
            const importedData = JSON.parse(dataToImport);

            if (
                !importedData.transactions ||
                !importedData.prices ||
                !importedData.themeSettings ||
                !importedData.receiptSettings
            ) {
                throw new Error("Struktur file backup tidak valid.");
            }
            
            localStorage.setItem('transactions', JSON.stringify(importedData.transactions));
            localStorage.setItem('prices', JSON.stringify(importedData.prices));
            localStorage.setItem('themeSettings', JSON.stringify(importedData.themeSettings));
            localStorage.setItem('receiptSettings', JSON.stringify(importedData.receiptSettings));
            localStorage.setItem('cashierSettings', JSON.stringify(importedData.cashierSettings || DEFAULT_CASHIER_SETTINGS));
            localStorage.setItem('discountSettings', JSON.stringify(importedData.discountSettings || DEFAULT_DISCOUNT_SETTINGS));
            localStorage.setItem('whatsAppSettings', JSON.stringify(importedData.whatsAppSettings || DEFAULT_WHATSAPP_SETTINGS));

            if (importedData.receiptLogo) {
                localStorage.setItem('receiptLogo', importedData.receiptLogo);
            } else {
                localStorage.setItem('receiptLogo', DEFAULT_LOGO_BASE64);
            }

            alert('Data berhasil diimpor! Aplikasi akan dimuat ulang.');
            setIsImportConfirmOpen(false);
            setDataToImport(null);
            window.location.reload();

        } catch (error) {
            console.error("Gagal mengimpor data:", error);
            alert(`Terjadi kesalahan saat mengimpor data: ${error instanceof Error ? error.message : 'Unknown error'}`);
            setIsImportConfirmOpen(false);
            setDataToImport(null);
        }
    };
    
    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-8">
             <Card>
                <h1 className="text-xl font-bold text-slate-800">Pengaturan</h1>
                <p className="text-slate-500">Sesuaikan aplikasi dan informasi usaha Anda.</p>
            </Card>

            <Card title="Pengaturan Usaha & Struk">
                 <div className="space-y-6">
                     <form className="space-y-4">
                        <div>
                            <label htmlFor="companyName" className="block text-sm font-medium text-slate-600">Nama Usaha</label>
                            <input type="text" name="companyName" id="companyName" value={receiptSettings.companyName} onChange={handleReceiptSettingChange} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm" />
                        </div>
                        <div>
                            <label htmlFor="companyAddress" className="block text-sm font-medium text-slate-600">Alamat Usaha</label>
                            <textarea name="companyAddress" id="companyAddress" value={receiptSettings.companyAddress} onChange={handleReceiptSettingChange} rows={2} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm" />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="companyPhone" className="block text-sm font-medium text-slate-600">No. Telepon</label>
                                <input type="text" name="companyPhone" id="companyPhone" value={receiptSettings.companyPhone} onChange={handleReceiptSettingChange} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm" />
                            </div>
                             <div>
                                <label htmlFor="cashierName" className="block text-sm font-medium text-slate-600">Nama Kasir</label>
                                <input type="text" name="cashierName" id="cashierName" value={receiptSettings.cashierName} onChange={handleReceiptSettingChange} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm" />
                            </div>
                        </div>
                         <div className="pt-2">
                            <div className="flex items-center">
                                <input
                                    type="checkbox"
                                    name="isTaxEnabled"
                                    id="isTaxEnabled"
                                    checked={receiptSettings.isTaxEnabled}
                                    onChange={handleReceiptSettingChange}
                                    className="h-4 w-4 text-primary-600 border-slate-300 rounded focus:ring-primary-500"
                                />
                                <label htmlFor="isTaxEnabled" className="ml-3 block text-sm font-medium text-slate-700">
                                    Aktifkan Pajak
                                </label>
                            </div>
                        </div>
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                           <div>
                                <label htmlFor="taxRate" className={`block text-sm font-medium ${receiptSettings.isTaxEnabled ? 'text-slate-600' : 'text-slate-400'}`}>Pajak (%)</label>
                                <input
                                    type="number"
                                    name="taxRate"
                                    id="taxRate"
                                    value={receiptSettings.taxRate}
                                    onChange={handleReceiptSettingChange}
                                    className={`mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm ${!receiptSettings.isTaxEnabled && 'bg-slate-100 text-slate-500 cursor-not-allowed'}`}
                                    disabled={!receiptSettings.isTaxEnabled}
                                />
                            </div>
                             <div>
                                <label htmlFor="footerMessage" className="block text-sm font-medium text-slate-600">Pesan Kaki Struk</label>
                                <input type="text" name="footerMessage" id="footerMessage" value={receiptSettings.footerMessage} onChange={handleReceiptSettingChange} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm" />
                            </div>
                        </div>
                     </form>
                     
                     <hr className="border-slate-200" />
                     
                     <div>
                        <h3 className="text-md font-semibold text-slate-700 mb-4">Logo Struk</h3>
                        <div className="flex items-center gap-6">
                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-2">Logo Perusahaan</label>
                                <input
                                    type="file"
                                    accept="image/png, image/jpeg, image/svg+xml"
                                    onChange={handleLogoUpload}
                                    className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                                />
                                 <p className="text-xs text-slate-500 mt-1">Unggah logo untuk ditampilkan di struk.</p>
                            </div>
                            {logo && (
                                <div className="flex-shrink-0">
                                    <p className="text-sm font-medium text-slate-600 mb-2">Pratinjau:</p>
                                    <div className="relative group">
                                        <img src={logo} alt="Logo" className="h-20 w-auto bg-slate-100 p-1 rounded-md border" />
                                         <button
                                            onClick={handleRemoveLogo}
                                            className="absolute top-0 right-0 -mt-2 -mr-2 bg-red-500 text-white rounded-full h-6 w-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                                            aria-label="Hapus logo"
                                        >
                                            &times;
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                     </div>
                 </div>
            </Card>
            
            <Card title="Pengaturan Opsi Kasir">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                        <h3 className="text-md font-semibold text-slate-700">Jenis Pelanggan</h3>
                        <p className="text-sm text-slate-600 mb-4">Kelola opsi yang tersedia untuk jenis pelanggan.</p>
                        <div className="space-y-2 mb-4">
                            {cashierSettings.customerTypes.map(type => (
                                <div key={type} className="flex items-center justify-between bg-slate-50 p-2 rounded-md">
                                    <span className="text-sm text-slate-800">{type}</span>
                                    <button onClick={() => handleDeleteCustomerType(type)} className="text-red-500 hover:text-red-700 text-sm font-medium">Hapus</button>
                                </div>
                            ))}
                        </div>
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                value={newCustomerType}
                                onChange={(e) => setNewCustomerType(e.target.value)}
                                placeholder="Tambah jenis baru..."
                                className="block w-full rounded-md border-slate-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                            />
                            <button onClick={handleAddCustomerType} className="py-2 px-4 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md">Tambah</button>
                        </div>
                    </div>
                     <div>
                        <h3 className="text-md font-semibold text-slate-700">Jenis File</h3>
                        <p className="text-sm text-slate-600 mb-4">Kelola opsi yang tersedia untuk jenis file.</p>
                        <div className="space-y-2 mb-4">
                            {cashierSettings.fileTypes.map(type => (
                                <div key={type} className="flex items-center justify-between bg-slate-50 p-2 rounded-md">
                                    <span className="text-sm text-slate-800">{type}</span>
                                    <button onClick={() => handleDeleteFileType(type)} className="text-red-500 hover:text-red-700 text-sm font-medium">Hapus</button>
                                </div>
                            ))}
                        </div>
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                value={newFileType}
                                onChange={(e) => setNewFileType(e.target.value)}
                                placeholder="Tambah jenis baru..."
                                className="block w-full rounded-md border-slate-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                            />
                            <button onClick={handleAddFileType} className="py-2 px-4 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md">Tambah</button>
                        </div>
                    </div>
                </div>
            </Card>

            <Card title="Pengaturan Diskon">
                <div className="space-y-6">
                    <div>
                        <h3 className="text-md font-semibold text-slate-700">Diskon Layanan Spesifik</h3>
                        <p className="text-sm text-slate-600 mb-4">
                             Atur diskon berdasarkan kombinasi layanan, jenis pelanggan, dan status file. Opsi 'Semua' akan berlaku untuk semua jenis. Aturan yang lebih spesifik (misal: menargetkan 'Pelanggan Mitra' daripada 'Semua') akan diutamakan.
                        </p>
                        <div className="space-y-4">
                             {(discountSettings.conditionalRules?.length || 0) > 0 && (
                                <div className="overflow-x-auto border rounded-lg">
                                    <table className="min-w-full divide-y divide-slate-200 responsive-table">
                                        <thead className="bg-slate-50">
                                            <tr>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Nama Aturan</th>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Layanan</th>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Jenis Pelanggan</th>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Jenis File</th>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Diskon</th>
                                                <th className="px-4 py-2 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Aksi</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-slate-200">
                                            {discountSettings.conditionalRules.map(rule => (
                                                <tr key={rule.id}>
                                                    <td data-label="Nama Aturan" className="px-4 py-2 whitespace-nowrap text-sm font-medium text-slate-900">{rule.name}</td>
                                                    <td data-label="Layanan" className="px-4 py-2 whitespace-nowrap text-sm text-slate-500">{serviceNameMap[rule.serviceId] || rule.serviceId}</td>
                                                    <td data-label="Jenis Pelanggan" className="px-4 py-2 whitespace-nowrap text-sm text-slate-500">{rule.customerType}</td>
                                                    <td data-label="Jenis File" className="px-4 py-2 whitespace-nowrap text-sm text-slate-500">{rule.fileType}</td>
                                                    <td data-label="Diskon" className="px-4 py-2 whitespace-nowrap text-sm text-slate-500">{rule.discountPercentage}%</td>
                                                    <td data-label="Aksi" className="px-4 py-2 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                                        <button onClick={() => handleEditConditionalRuleClick(rule)} className="text-secondary-600 hover:text-secondary-900">Edit</button>
                                                        <button onClick={() => handleDeleteConditionalRuleClick(rule.id)} className="text-red-600 hover:text-red-900">Hapus</button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                            <form onSubmit={handleSaveConditionalRule} className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-4">
                                <h4 className="text-sm font-semibold text-slate-800">{editableConditionalRule.id ? 'Edit Aturan' : 'Tambah Aturan Baru'}</h4>
                                <div>
                                    <label htmlFor="conditionalRuleName" className="block text-sm font-medium text-slate-600">Nama Aturan</label>
                                    <input type="text" name="name" id="conditionalRuleName" value={editableConditionalRule.name} onChange={handleConditionalRuleFormChange} required className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm" placeholder="e.g., Diskon Stiker Mitra" />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label htmlFor="conditionalServiceId" className="block text-sm font-medium text-slate-600">Layanan</label>
                                        <select name="serviceId" id="conditionalServiceId" value={editableConditionalRule.serviceId} onChange={handleConditionalRuleFormChange} required className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm">
                                            <option value="" disabled>Pilih Layanan</option>
                                            {prices.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label htmlFor="conditionalDiscount" className="block text-sm font-medium text-slate-600">Diskon (%)</label>
                                        <input type="number" name="discountPercentage" id="conditionalDiscount" min="0" max="100" value={editableConditionalRule.discountPercentage} onChange={handleConditionalRuleFormChange} required className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm" />
                                    </div>
                                </div>
                                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label htmlFor="customerType" className="block text-sm font-medium text-slate-600">Jenis Pelanggan</label>
                                        <select name="customerType" id="customerType" value={editableConditionalRule.customerType} onChange={handleConditionalRuleFormChange} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm">
                                            {CUSTOMER_TYPES_WITH_ALL.map(ct => <option key={ct} value={ct}>{ct}</option>)}
                                        </select>
                                    </div>
                                     <div>
                                        <label htmlFor="fileType" className="block text-sm font-medium text-slate-600">Jenis File</label>
                                        <select name="fileType" id="fileType" value={editableConditionalRule.fileType} onChange={handleConditionalRuleFormChange} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm">
                                            {FILE_TYPES_WITH_ALL.map(ft => <option key={ft} value={ft}>{ft}</option>)}
                                        </select>
                                    </div>
                                 </div>
                                <div className="flex justify-end gap-2">
                                     {editableConditionalRule.id && <button type="button" onClick={() => setEditableConditionalRule(BLANK_CONDITIONAL_RULE_FORM)} className="py-2 px-4 rounded-md text-sm font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-300">Batal Edit</button>}
                                     <button type="submit" className="py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">{editableConditionalRule.id ? 'Update Aturan' : 'Simpan Aturan'}</button>
                                 </div>
                            </form>
                        </div>
                    </div>

                    <hr className="border-slate-200" />
                    
                    <div>
                        <h3 className="text-md font-semibold text-slate-700">Diskon Berdasarkan Jumlah</h3>
                         <p className="text-sm text-slate-600 mb-4">
                            Buat aturan diskon yang berlaku jika jumlah pesanan suatu layanan mencapai ambang batas tertentu.
                        </p>

                        <div className="space-y-4">
                            {(discountSettings.quantityRules?.length || 0) > 0 && (
                                <div className="overflow-x-auto border rounded-lg">
                                    <table className="min-w-full divide-y divide-slate-200 responsive-table">
                                        <thead className="bg-slate-50">
                                            <tr>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Layanan</th>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Min. Jumlah</th>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Diskon</th>
                                                <th className="px-4 py-2 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Aksi</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-slate-200">
                                            {discountSettings.quantityRules.map(rule => (
                                                <tr key={rule.id}>
                                                    <td data-label="Layanan" className="px-4 py-2 whitespace-nowrap text-sm font-medium text-slate-900">{serviceNameMap[rule.serviceId] || rule.serviceId}</td>
                                                    <td data-label="Min. Jumlah" className="px-4 py-2 whitespace-nowrap text-sm text-slate-500">{rule.minQuantity}</td>
                                                    <td data-label="Diskon" className="px-4 py-2 whitespace-nowrap text-sm text-slate-500">{rule.discountPercentage}%</td>
                                                    <td data-label="Aksi" className="px-4 py-2 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                                        <button onClick={() => handleEditQuantityRuleClick(rule)} className="text-secondary-600 hover:text-secondary-900">Edit</button>
                                                        <button onClick={() => handleDeleteQuantityRuleClick(rule.id)} className="text-red-600 hover:text-red-900">Hapus</button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                             <form onSubmit={handleSaveQuantityRule} className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-4">
                                <h4 className="text-sm font-semibold text-slate-800">{editableQuantityRule.id ? 'Edit Aturan' : 'Tambah Aturan Baru'}</h4>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                                    <div className="md:col-span-2">
                                        <label htmlFor="quantityServiceId" className="block text-sm font-medium text-slate-600">Layanan</label>
                                        <select name="serviceId" id="quantityServiceId" value={editableQuantityRule.serviceId} onChange={handleQuantityRuleFormChange} required className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm">
                                            <option value="" disabled>Pilih Layanan</option>
                                            {prices.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label htmlFor="minQuantity" className="block text-sm font-medium text-slate-600">Min. Jumlah</label>
                                        <input type="number" name="minQuantity" id="minQuantity" min="1" value={editableQuantityRule.minQuantity} onChange={handleQuantityRuleFormChange} required className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm" />
                                    </div>
                                    <div>
                                        <label htmlFor="quantityDiscount" className="block text-sm font-medium text-slate-600">Diskon (%)</label>
                                        <input type="number" name="discountPercentage" id="quantityDiscount" min="0" max="100" value={editableQuantityRule.discountPercentage} onChange={handleQuantityRuleFormChange} required className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm" />
                                    </div>
                                </div>
                                 <div className="flex justify-end gap-2">
                                     {editableQuantityRule.id && <button type="button" onClick={() => setEditableQuantityRule(BLANK_QUANTITY_RULE_FORM)} className="py-2 px-4 rounded-md text-sm font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-300">Batal Edit</button>}
                                     <button type="submit" className="py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">{editableQuantityRule.id ? 'Update Aturan' : 'Simpan Aturan'}</button>
                                 </div>
                             </form>
                        </div>
                    </div>
                </div>
            </Card>

            <Card title="Pengaturan Notifikasi WhatsApp">
                <p className="text-sm text-slate-600 mb-4">
                    Atur format pesan otomatis yang akan dikirim ke pelanggan saat status pesanan diubah. Anda bisa menggunakan variabel berikut:
                </p>
                <ul className="text-sm text-slate-500 list-disc list-inside mb-6 grid grid-cols-2 md:grid-cols-3 gap-2">
                    <li><code className="bg-slate-200 text-slate-800 px-1 rounded-sm">{'{nama_pelanggan}'}</code></li>
                    <li><code className="bg-slate-200 text-slate-800 px-1 rounded-sm">{'{nomor_pesanan}'}</code></li>
                    <li><code className="bg-slate-200 text-slate-800 px-1 rounded-sm">{'{status_pesanan}'}</code></li>
                    <li><code className="bg-slate-200 text-slate-800 px-1 rounded-sm">{'{nama_usaha}'}</code></li>
                    <li><code className="bg-slate-200 text-slate-800 px-1 rounded-sm">{'{total_belanja}'}</code></li>
                    <li><code className="bg-slate-200 text-slate-800 px-1 rounded-sm">{'{sisa_bayar}'}</code></li>
                </ul>

                <div className="space-y-4">
                    {ORDER_STATUSES.map(status => (
                        <div key={status}>
                            <label htmlFor={`template-${status}`} className="block text-sm font-medium text-slate-700 capitalize">
                                {status}
                            </label>
                            <textarea
                                id={`template-${status}`}
                                rows={3}
                                value={whatsAppSettings.notificationTemplates?.[status] || ''}
                                onChange={(e) => handleWhatsAppTemplateChange(status, e.target.value)}
                                className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                            />
                        </div>
                    ))}
                </div>
            </Card>

            <Card title="Warna Tema">
                <div className="flex items-center gap-4">
                    {Object.keys(THEMES).map(color => (
                        <button
                            key={color}
                            onClick={() => handleThemeSettingChange('primaryColor', color as ThemeSettings['primaryColor'])}
                            className={`h-12 w-12 rounded-full transition-transform transform hover:scale-110 ${colorMap[color as ThemeSettings['primaryColor']]} ${themeSettings.primaryColor === color ? 'ring-4 ring-offset-2 ring-primary-500' : ''}`}
                            aria-label={`Pilih warna ${color}`}
                        />
                    ))}
                </div>
            </Card>

            <Card title="Tampilan Teks">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                        <label htmlFor="fontFamily" className="block text-sm font-medium text-slate-600 mb-2">Jenis Tulisan (Font)</label>
                        <select
                            id="fontFamily"
                            value={themeSettings.fontFamily}
                            onChange={(e) => handleThemeSettingChange('fontFamily', e.target.value as ThemeSettings['fontFamily'])}
                             className="block w-full pl-3 pr-10 py-2 text-base border-slate-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
                        >
                            {FONTS.map(font => (
                                <option key={font} value={font} style={{ fontFamily: font }}>{font}</option>
                            ))}
                        </select>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-slate-600 mb-2">Ukuran Tulisan</label>
                        <div className="flex rounded-md shadow-sm">
                             {FONT_SIZES.map(size => (
                                <button
                                    key={size}
                                    onClick={() => handleThemeSettingChange('fontSize', size)}
                                    className={`relative -ml-px inline-flex items-center px-4 py-2 text-sm font-medium first:ml-0 first:rounded-l-md last:rounded-r-md focus:z-10 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 transition-colors
                                    ${themeSettings.fontSize === size
                                        ? 'bg-primary-600 text-white border-primary-600'
                                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                                    }`}
                                >
                                    {size === 'sm' ? 'Kecil' : size === 'base' ? 'Standar' : 'Besar'}
                                </button>
                             ))}
                        </div>
                    </div>
                </div>
            </Card>
            
            <Card title="Cadangkan & Pulihkan Data">
                <p className="text-sm text-slate-600 mb-6">
                    Simpan semua data aplikasi Anda (transaksi, harga, pengaturan) ke dalam sebuah file. Anda dapat menggunakan file ini untuk memulihkan data Anda di perangkat lain atau setelah membersihkan cache browser.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button
                        onClick={handleExportData}
                        className="w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-secondary-600 hover:bg-secondary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-secondary-500"
                    >
                        Ekspor Data
                    </button>
                    <div>
                        <input
                            type="file"
                            id="import-file"
                            accept=".json"
                            onChange={handleImportFileSelect}
                            className="hidden"
                            ref={fileInputRef}
                        />
                        <label
                            htmlFor="import-file"
                            className="cursor-pointer w-full flex justify-center items-center py-2 px-4 border border-secondary-600 rounded-lg shadow-sm text-sm font-medium text-secondary-700 bg-white hover:bg-secondary-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-secondary-500"
                        >
                            Impor Data
                        </label>
                    </div>
                </div>
            </Card>


             <Card>
                <div className="flex justify-between items-center">
                    <div>
                         <h3 className="font-semibold text-slate-700">Reset Semua Pengaturan</h3>
                         <p className="text-sm text-slate-500">Kembalikan semua pengaturan ke default.</p>
                    </div>
                    <button
                        onClick={resetSettings}
                        className="py-2 px-4 border border-red-300 rounded-lg shadow-sm text-sm font-medium text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    >
                        Reset ke Default
                    </button>
                </div>
            </Card>

            <ConfirmationModal
                isOpen={isImportConfirmOpen}
                onClose={() => setIsImportConfirmOpen(false)}
                onConfirm={handleConfirmImport}
                title="Konfirmasi Impor Data"
                message="Ini akan menimpa semua data yang ada saat ini dengan data dari file. Apakah Anda yakin ingin melanjutkan?"
                confirmText="Ya, Impor"
                cancelText="Batal"
                confirmButtonClass="bg-primary-600 hover:bg-primary-700 focus:ring-primary-500"
            />
            <ConfirmationModal
                isOpen={!!quantityRuleToDelete}
                onClose={() => setQuantityRuleToDelete(null)}
                onConfirm={confirmDeleteQuantityRule}
                title="Konfirmasi Hapus Aturan"
                message="Apakah Anda yakin ingin menghapus aturan diskon kuantitas ini?"
            />
             <ConfirmationModal
                isOpen={!!conditionalRuleToDelete}
                onClose={() => setConditionalRuleToDelete(null)}
                onConfirm={confirmDeleteConditionalRule}
                title="Konfirmasi Hapus Aturan"
                message="Apakah Anda yakin ingin menghapus aturan diskon spesifik ini?"
            />
        </div>
    );
};

export default SettingsPage;