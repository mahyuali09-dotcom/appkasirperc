import { ServicePrice, ThemeSettings, ReceiptSettings, DiscountSettings, CashierSettings, OrderStatus, WhatsAppSettings } from './types';

export const INITIAL_PRICES: ServicePrice[] = [
    { id: 'Vinil', name: 'Vinil', price: 25000, unit: 'm²', requiresArea: true },
    { id: 'Stiker A3', name: 'Stiker A3', price: 10000, unit: 'lembar', requiresArea: false },
    { id: 'Stiker Meteran', name: 'Stiker Meteran', price: 50000, unit: 'm²', requiresArea: true },
    { id: 'Mug', name: 'Mug', price: 15000, unit: 'pcs', requiresArea: false },
    { id: 'DTF Meteran', name: 'DTF Meteran', price: 60000, unit: 'm', requiresArea: true },
    { id: 'Sablon Kaos', name: 'Sablon Kaos', price: 45000, unit: 'pcs', requiresArea: false },
    { id: 'Kartu Nama', name: 'Kartu Nama', price: 20000, unit: 'box', requiresArea: false },
];

export const DEFAULT_LOGO_BASE64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAABAAAAAJEAQMAAADoioT7AAAABlBMVEUAAAD///+l2Z/dAAADG0lEQVR42u3bS47bMBBGYS42g1wAxaED9D40hA/QhA/Q4cMBuGBwBbqKxqK12A4kQzJzchC/kKzM7k/2pKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSk/J3h/3ffj49/Gz5u+Pj4d/PnfzP8fPyn98Pf1f6e4ePj/4yfn/4z/Hx8b/+f4b8fHx//Z/hvfz5+/qfw94d/+/j4L8PfDv94/PzX4X+G/3b8/Pyn8PcH/z5+/pfg7w//dfz8X4b/Df/d+Pm/CX4p/L/j578M/1X4v+Pnvwv+cvjfx89/Hfw34d+Pn/8G+L/D/xt+/vfB/xP+B/j5Pw9/L/x/4+f/Fv5b4H+Pn/+n4N8O/2f4+b8IfiP8/8bP/xn8L8N/Gz//R/Bbhv8Rfv7P4d8L/yP8/F+Evx3+D/Dzfx/818N/Ez//t/BPh/8dP/9b4K8P/zV+/g/B3x3+y/DzfxD8p8B/Hz//B8F/Fv6f4ef/DPw3wP8dP/+HwH8H/F/4+X8M/Bvhf4Wf/yPw3w7/O37+h8B/Hv7f8PN/APxHwP8MP/9HwD8b/u/w8/8V/Fvh/wk//0fgPwb+Z/j5Pw38S8C/Dz//Z2C/5N/x8/8M7If8P8PP/xHYL/k/ws//Idgv+U/Dz/+BsF/yv4af/xOw/+T/DD//R2C/5P8KP/9HYL/kvw8//wdiv+Sfhp//A7Ff8t+Hn/8jsV/yb8PP/yGxX/KPh5//A7Ff8r+Hn/8DsV/yP4Wf/wOxX/I/hp//I7Ff8h+Hn/8DsV/yH4ef/wOxX/Jfh5//Q7Bf8i+En/8jsV/y/wk//wdiv+Q/CT//B2K/5D8PP/8HYr/kPw8//wdiv+S/Dz//x2C/5P8MP/9HYL/kfwg//8div+T/CD//x2K/5D8PP/9PYr/kPwg//8div+Q/CT//T2C/5P8LP/xPYL/kPws//09iv+Q/C//8T2C/5D8HP/xPYr/g/w8//kVgv+D/D//8RWK/4P8LP/5FYL/g/ws//kVgv+D/Cz/+RWK/5L8PP/5FYL/kvws//kVgv+S/C//+RWK/5L8LP/5FYr/kvws//kdiv+S/C//+R2C/5H8LP/5HYr/kPws//kdiv+Q/C//+R2C/5D8LP/5HYr/kPws//kdiv+R/Cz/+R2K/1H8PP/5FYr/kfw8//kdiv+R/C//+R2K/5D8PP/5HYr/kPws//kdiv+Q/Cz/+R2K/5H8LP/5HYr/kPws//kdiv+R/C//+R2K/5H8LP/5HYr/kfw8//kdiv+R/D//8R2C/5P8LP/5HYL/k/ws//kdgv+T/C//+R2C/5H8LP/5HYL/kPws//kdiv+Q/Cz/+R2K/x/wKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSnpD/gC91Qz+wz/2YkAAAAASUVORK5CYII=';

export const THEMES = {
    blue: {
        '50': '239 249 255', '100': '223 241 255', '200': '188 230 255', '300': '137 215 255',
        '400': '82 187 255', '500': '41 157 255', '600': '15 126 247', '700': '8 99 217',
        '800': '11 82 178', '900': '15 68 142', '950': '11 41 84',
    },
    teal: {
        '50': '240 253 250', '100': '204 251 241', '200': '153 246 228', '300': '94 234 212',
        '400': '45 212 191', '500': '20 184 166', '600': '13 148 136', '700': '15 118 110',
        '800': '17 94 89', '900': '19 78 74', '950': '4 47 46',
    },
    purple: {
        '50': '250 245 255', '100': '243 232 255', '200': '233 213 255', '300': '216 180 254',
        '400': '192 132 252', '500': '168 85 247', '600': '147 51 234', '700': '126 34 206',
        '800': '107 33 168', '900': '88 28 135', '950': '59 7 100',
    },
};

export const FONTS: ThemeSettings['fontFamily'][] = ['Inter', 'Poppins', 'Roboto'];

export const FONT_SIZES: ThemeSettings['fontSize'][] = ['sm', 'base', 'lg'];

export const DEFAULT_THEME_SETTINGS: ThemeSettings = {
    primaryColor: 'blue',
    fontFamily: 'Inter',
    fontSize: 'base',
};

export const DEFAULT_RECEIPT_SETTINGS: ReceiptSettings = {
    companyName: 'CV. AMY PERCETAKAN',
    companyAddress: 'Jl. Contoh Alamat No. 123',
    companyPhone: '081234567890',
    cashierName: 'Admin',
    taxRate: 11,
    isTaxEnabled: true,
    footerMessage: '** Terima Kasih **'
};

export const DEFAULT_CASHIER_SETTINGS: CashierSettings = {
    customerTypes: ['Pelanggan Baru', 'Pelanggan Lama', 'Pelanggan Mitra'],
    fileTypes: ['Ada', 'Tidak Ada', 'Edit'],
};

export const DEFAULT_DISCOUNT_SETTINGS: DiscountSettings = {
    conditionalRules: [
        { id: 'vinyl-file', name: 'Diskon Vinil (File Ada)', serviceId: 'Vinil', customerType: 'Semua', fileType: 'Ada', discountPercentage: 20 },
        { id: 'vinyl-partner-file', name: 'Diskon Vinil (Mitra + File Ada)', serviceId: 'Vinil', customerType: 'Pelanggan Mitra', fileType: 'Ada', discountPercentage: 28 },
    ],
    quantityRules: [
        { id: '1', serviceId: 'Mug', minQuantity: 12, discountPercentage: 15 },
    ],
};

export const DEFAULT_WHATSAPP_SETTINGS: WhatsAppSettings = {
    notificationTemplates: {
        'Terima pesanan': 'Halo {nama_pelanggan}, pesanan Anda #{nomor_pesanan} di {nama_usaha} sudah kami terima. Total belanja Anda adalah {total_belanja}. Terima kasih!',
        'Pengerjaan desain': 'Halo {nama_pelanggan}, desainer kami sedang mengerjakan pesanan Anda #{nomor_pesanan}. Kami akan segera menghubungi Anda jika ada update.',
        'Acc Desain': 'Halo {nama_pelanggan}, mohon periksa dan berikan persetujuan untuk desain pesanan Anda #{nomor_pesanan} agar dapat kami lanjutkan ke proses cetak.',
        'Proses cetak': 'Halo {nama_pelanggan}, pesanan Anda #{nomor_pesanan} telah disetujui dan sedang dalam proses cetak.',
        'Selesai': 'Halo {nama_pelanggan}, pesanan Anda #{nomor_pesanan} telah selesai dan siap diambil. Sisa pembayaran Anda adalah {sisa_bayar}.',
        'Diambil': 'Halo {nama_pelanggan}, pesanan Anda #{nomor_pesanan} telah diambil. Terima kasih atas kepercayaan Anda kepada {nama_usaha}.',
        'Pengingat Bayar': 'Halo {nama_pelanggan}, kami ingin mengingatkan mengenai sisa pembayaran untuk pesanan #{nomor_pesanan} sebesar {sisa_bayar}. Mohon untuk segera dilunasi. Terima kasih. - {nama_usaha}',
    }
};

export const ORDER_STATUSES: OrderStatus[] = [
    'Terima pesanan',
    'Pengerjaan desain',
    'Acc Desain',
    'Proses cetak',
    'Selesai',
    'Diambil'
];

export const STATUS_COLORS: { [key in OrderStatus]: string } = {
    'Terima pesanan': 'bg-blue-100 text-blue-800',
    'Pengerjaan desain': 'bg-yellow-100 text-yellow-800',
    'Acc Desain': 'bg-purple-100 text-purple-800',
    'Proses cetak': 'bg-orange-100 text-orange-800',
    'Selesai': 'bg-green-100 text-green-800',
    'Diambil': 'bg-slate-100 text-slate-800',
};