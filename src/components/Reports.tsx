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
} from "recharts";

interface Transaction {
  id: string;
  type: "pemasukan" | "pengeluaran";
  amount: number;
  category: string;
  createdAt: any;
}

interface Props {
  transactions: Transaction[];
}

const COLORS = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316"];

const formatRupiah = (amount: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);

export default function Reports({ transactions }: Props) {
  const now = new Date();

  // Data per bulan (6 bulan terakhir)
  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (5 - i));
    const month = d.getMonth();
    const year = d.getFullYear();
    const label = d.toLocaleDateString("id-ID", { month: "short", year: "2-digit" });
    const trx = transactions.filter((t) => {
      const td = t.createdAt?.toDate();
      return td?.getMonth() === month && td?.getFullYear() === year;
    });
    return {
      name: label,
      Pemasukan: trx.filter((t) => t.type === "pemasukan").reduce((s, t) => s + t.amount, 0),
      Pengeluaran: trx.filter((t) => t.type === "pengeluaran").reduce((s, t) => s + t.amount, 0),
    };
  });

  // Perbandingan bulan ini vs bulan lalu
  const thisMonth = transactions.filter((t) => {
    const d = t.createdAt?.toDate();
    return d?.getMonth() === now.getMonth() && d?.getFullYear() === now.getFullYear();
  });
  const lastMonth = transactions.filter((t) => {
    const d = t.createdAt?.toDate();
    const last = new Date(now.getFullYear(), now.getMonth() - 1);
    return d?.getMonth() === last.getMonth() && d?.getFullYear() === last.getFullYear();
  });

  const thisIncome = thisMonth.filter((t) => t.type === "pemasukan").reduce((s, t) => s + t.amount, 0);
  const lastIncome = lastMonth.filter((t) => t.type === "pemasukan").reduce((s, t) => s + t.amount, 0);
  const thisExpense = thisMonth.filter((t) => t.type === "pengeluaran").reduce((s, t) => s + t.amount, 0);
  const lastExpense = lastMonth.filter((t) => t.type === "pengeluaran").reduce((s, t) => s + t.amount, 0);

  const incomeChange = lastIncome > 0 ? ((thisIncome - lastIncome) / lastIncome) * 100 : 0;
  const expenseChange = lastExpense > 0 ? ((thisExpense - lastExpense) / lastExpense) * 100 : 0;

  // Pie chart data
  const categoryMap: Record<string, number> = {};
  thisMonth.filter((t) => t.type === "pengeluaran").forEach((t) => {
    categoryMap[t.category] = (categoryMap[t.category] || 0) + t.amount;
  });
  const pieData = Object.entries(categoryMap).map(([name, value]) => ({ name, value }));

  return (
    <div className="space-y-4 pb-6">
      {/* Perbandingan Bulan */}
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <h3 className="font-bold text-gray-700 mb-3">📊 Bulan Ini vs Bulan Lalu</h3>
        <div className="grid grid-cols-2 gap-3">
          {/* Pemasukan */}
          <div className="bg-green-50 rounded-xl p-3">
            <p className="text-xs text-gray-500 mb-1">Pemasukan</p>
            <p className="font-bold text-green-600 text-sm">{formatRupiah(thisIncome)}</p>
            <p className="text-xs text-gray-400">vs {formatRupiah(lastIncome)}</p>
            <div className={`flex items-center gap-1 mt-1 ${incomeChange >= 0 ? "text-green-500" : "text-red-500"}`}>
              <span className="text-xs font-semibold">
                {incomeChange >= 0 ? "▲" : "▼"} {Math.abs(incomeChange).toFixed(1)}%
              </span>
            </div>
          </div>
          {/* Pengeluaran */}
          <div className="bg-red-50 rounded-xl p-3">
            <p className="text-xs text-gray-500 mb-1">Pengeluaran</p>
            <p className="font-bold text-red-500 text-sm">{formatRupiah(thisExpense)}</p>
            <p className="text-xs text-gray-400">vs {formatRupiah(lastExpense)}</p>
            <div className={`flex items-center gap-1 mt-1 ${expenseChange <= 0 ? "text-green-500" : "text-red-500"}`}>
              <span className="text-xs font-semibold">
                {expenseChange >= 0 ? "▲" : "▼"} {Math.abs(expenseChange).toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        {/* Insight */}
        <div className="bg-blue-50 rounded-xl p-3 mt-3">
          <p className="text-xs text-blue-700">
            {expenseChange > 10
              ? `⚠️ Pengeluaran naik ${expenseChange.toFixed(1)}% dari bulan lalu. Perlu dikontrol!`
              : expenseChange < 0
              ? `✅ Pengeluaran turun ${Math.abs(expenseChange).toFixed(1)}% dari bulan lalu. Bagus!`
              : `📊 Pengeluaran relatif stabil dibanding bulan lalu.`}
          </p>
        </div>
      </div>

      {/* Bar Chart 6 Bulan */}
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <h3 className="font-bold text-gray-700 mb-4">📈 6 Bulan Terakhir</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={monthlyData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1000000).toFixed(1)}jt`} />
            <Tooltip formatter={(value: unknown) => formatRupiah(value as number)} />
            <Legend />
            <Bar dataKey="Pemasukan" fill="#10b981" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Pengeluaran" fill="#ef4444" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Pie Chart */}
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <h3 className="font-bold text-gray-700 mb-4">🍩 Pengeluaran Bulan Ini per Kategori</h3>
        {pieData.length === 0 ? (
          <p className="text-center text-gray-400 py-8">Belum ada pengeluaran bulan ini</p>
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
                >
                  {pieData.map((_, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: unknown) => formatRupiah(value as number)} />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-3 space-y-2">
              {pieData.map((item, index) => (
                <div key={item.name} className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                    <span className="text-sm text-gray-600">{item.name}</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-700">{formatRupiah(item.value)}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}