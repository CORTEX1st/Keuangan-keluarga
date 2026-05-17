import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

interface Transaction {
  id: string;
  type: 'pemasukan' | 'pengeluaran';
  amount: number;
  category: string;
  createdAt: any;
}

interface Props {
  transactions: Transaction[];
}

const COLORS = [
  '#3b82f6',
  '#ef4444',
  '#10b981',
  '#f59e0b',
  '#8b5cf6',
  '#ec4899',
  '#14b8a6',
  '#f97316',
];

const formatRupiah = (amount: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount);

export default function Reports({ transactions }: Props) {
  // Data per bulan (6 bulan terakhir)
  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (5 - i));
    const month = d.getMonth();
    const year = d.getFullYear();
    const label = d.toLocaleDateString('id-ID', {
      month: 'short',
      year: '2-digit',
    });

    const trx = transactions.filter((t) => {
      const td = t.createdAt?.toDate();
      return td?.getMonth() === month && td?.getFullYear() === year;
    });

    return {
      name: label,
      Pemasukan: trx
        .filter((t) => t.type === 'pemasukan')
        .reduce((s, t) => s + t.amount, 0),
      Pengeluaran: trx
        .filter((t) => t.type === 'pengeluaran')
        .reduce((s, t) => s + t.amount, 0),
    };
  });

  // Data per kategori pengeluaran bulan ini
  const now = new Date();
  const thisMonth = transactions.filter((t) => {
    const d = t.createdAt?.toDate();
    return (
      t.type === 'pengeluaran' &&
      d?.getMonth() === now.getMonth() &&
      d?.getFullYear() === now.getFullYear()
    );
  });

  const categoryMap: Record<string, number> = {};
  thisMonth.forEach((t) => {
    categoryMap[t.category] = (categoryMap[t.category] || 0) + t.amount;
  });

  const pieData = Object.entries(categoryMap).map(([name, value]) => ({
    name,
    value,
  }));

  return (
    <div className="space-y-6 pb-24">
      {/* Bar Chart */}
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <h3 className="font-bold text-gray-700 mb-4">📊 6 Bulan Terakhir</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={monthlyData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis
              tick={{ fontSize: 10 }}
              tickFormatter={(v) => `${(v / 1000000).toFixed(1)}jt`}
            />
            <Tooltip
              formatter={(value: unknown) => formatRupiah(value as number)}
            />
            <Legend />
            <Bar dataKey="Pemasukan" fill="#10b981" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Pengeluaran" fill="#ef4444" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Pie Chart */}
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <h3 className="font-bold text-gray-700 mb-4">
          🍩 Pengeluaran Bulan Ini per Kategori
        </h3>
        {pieData.length === 0 ? (
          <p className="text-center text-gray-400 py-8">
            Belum ada pengeluaran bulan ini
          </p>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  label={false}
                  labelLine={false}
                >
                  {pieData.map((_, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: unknown) => formatRupiah(value as number)}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Legend */}
            <div className="mt-3 space-y-2">
              {pieData.map((item, index) => (
                <div
                  key={item.name}
                  className="flex justify-between items-center"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="text-sm text-gray-600">{item.name}</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-700">
                    {formatRupiah(item.value)}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
