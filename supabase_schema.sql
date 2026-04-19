-- Create Table for Transactions
CREATE TABLE IF NOT EXISTS public.transactions (
    id TEXT PRIMARY KEY,
    date DATE NOT NULL,
    timestamp BIGINT NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerContact" TEXT,
    "customerType" TEXT,
    "fileType" TEXT,
    items JSONB NOT NULL,
    subtotal NUMERIC NOT NULL,
    discount NUMERIC,
    tax NUMERIC,
    "grandTotal" NUMERIC NOT NULL,
    "downPayment" NUMERIC,
    "remainingBalance" NUMERIC,
    "paymentAmount" NUMERIC,
    change NUMERIC,
    status TEXT NOT NULL,
    "paymentMethod" TEXT,
    "paymentNotes" TEXT,
    "orderNumber" TEXT
);

-- Create Table for Expenses
CREATE TABLE IF NOT EXISTS public.expenses (
    id TEXT PRIMARY KEY,
    date DATE NOT NULL,
    timestamp BIGINT NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    notes TEXT
);

-- Create Table for Prices (Services)
CREATE TABLE IF NOT EXISTS public.prices (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    price NUMERIC NOT NULL,
    unit TEXT NOT NULL,
    "requiresArea" BOOLEAN DEFAULT FALSE
);

-- Create Table for App Settings
CREATE TABLE IF NOT EXISTS public.app_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL
);

-- Enable RLS (Optional, but recommended)
-- For this simple setup, we use broad rules. In production, harden these!
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Allow anon access for now (Replace with more secure policies if needed)
CREATE POLICY "Allow all for anon" ON public.transactions FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON public.expenses FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON public.prices FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON public.app_settings FOR ALL TO anon USING (true) WITH CHECK (true);
