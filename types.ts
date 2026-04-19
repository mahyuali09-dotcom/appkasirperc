export type OrderStatus = 'Terima pesanan' | 'Pengerjaan desain' | 'Acc Desain' | 'Proses cetak' | 'Selesai' | 'Diambil';
export type CustomerType = string;
export type FileType = string;

export interface ServicePrice {
    id: string;
    name: string;
    price: number;
    unit: string;
    requiresArea: boolean;
}

export interface TransactionItem {
    id: string; // unique id for the item in the transaction
    serviceName: string;
    quantity: number;
    area?: number; // m^2, etc.
    unit?: string; // Storing the unit for historical accuracy in reports
    pricePerUnit: number;
    discount?: number; // Amount of discount applied to this item
    total: number; // Final total for this item after discount
}

export interface Transaction {
    id: string; // unique id for the transaction
    orderNumber?: string; // Optional order number
    date: string; // YYYY-MM-DD
    timestamp: number; // For precise time
    customerName: string;
    customerContact?: string;
    customerType: CustomerType;
    fileType: FileType;
    items: TransactionItem[];
    subtotal: number; // Pre-discount subtotal
    discount?: number; // Total discount amount
    tax: number;
    grandTotal: number;
    downPayment?: number; // Optional down payment
    remainingBalance?: number; // Optional remaining balance
    paymentAmount: number;
    change: number;
    status: OrderStatus;
    paymentMethod: 'Tunai' | 'Transfer';
    paymentNotes?: string; // Optional payment notes
}

export interface Expense {
    id: string;
    date: string;
    timestamp: number;
    name: string;
    category: string;
    amount: number;
    notes?: string;
}

export interface ThemeSettings {
  primaryColor: 'blue' | 'teal' | 'purple';
  fontFamily: 'Inter' | 'Poppins' | 'Roboto';
  fontSize: 'sm' | 'base' | 'lg';
}

export interface ReceiptSettings {
    companyName: string;
    companyAddress: string;
    companyPhone: string;
    cashierName: string;
    taxRate: number;
    isTaxEnabled: boolean;
    footerMessage: string;
}

export interface CashierSettings {
    customerTypes: string[];
    fileTypes: string[];
}

export interface QuantityDiscountRule {
    id: string;
    serviceId: string;
    minQuantity: number;
    discountPercentage: number;
}

export interface ConditionalDiscountRule {
    id: string;
    name: string;
    serviceId: string;
    customerType: CustomerType | 'Semua';
    fileType: FileType | 'Semua';
    discountPercentage: number;
}

export interface DiscountSettings {
    conditionalRules: ConditionalDiscountRule[];
    quantityRules: QuantityDiscountRule[];
}

export interface WhatsAppSettings {
    notificationTemplates: {
        [key in OrderStatus | 'Pengingat Bayar']?: string;
    };
}