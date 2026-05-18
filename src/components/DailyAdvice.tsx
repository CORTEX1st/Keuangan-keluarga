import { useState, useEffect } from "react";
import { db, auth } from "../firebase";
import { collection, query, onSnapshot, where } from "firebase/firestore";

interface Transaction {
  id: string;
  type: "pemasukan" | "pengeluaran";
  amount: number;
  category: string;
  createdAt: any;
}

const formatRupiah = (amount: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);

export default function DailyAdvice() {
  const [advice, setAdvice] = useState("");
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [lastFetched, setLastFetched] = useState<string>("");

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    const q = query(collection(db, "transactions"), where("uid", "==", uid));
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Transaction[];
      setTransactions(data);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (transactions.length > 0) {
      const today = new Date().toDateString();
      const cached = localStorage.getItem("daily_advice");
      const cachedDate = localStorage.getItem("daily_advice_date");
      if (cached && cachedDate === today) {
        setAdvice(cached);
        setLastFetched(today);
      } else {
        fetchAdvice();
      }
    }
  }, [transactions]);

  const fetchAdvice = async () => {
    setLoading(true);
    try {
      const now = new Date();
      const thisMonth = transactions.filter((t) => {
        const d = t.createdAt?.toDate();
        return d?.getMonth() === now.getMonth() && d?.getFullYear() === now.getFullYear();
      });

      const totalPemasukan = thisMonth
        .filter((t) => t.type === "pemasukan")
        .reduce((s, t) => s + t.amount, 0);
      const totalPengeluaran = thisMonth
        .filter((t) => t.type === "pengeluaran")
        .reduce((s, t) => s + t.amount, 0);
      const saldo = totalPemasukan - totalPengeluaran;

      const categoryMap: Record<string, number> = {};
      thisMonth.filter((t) => t.type === "pengeluaran").forEach((t) => {
        categoryMap[t.category] = (categoryMap[t.category] || 0) + t.amount;
      });
      const topCategory = Object.entries(categoryMap).sort((a, b) => b[1] - a[1])[0];

      const prompt = `Kamu adalah konsultan keuangan keluarga Indonesia yang berpengalaman. 
Berikan saran keuangan harian yang personal, praktis, dan relevan dalam Bahasa Indonesia.

Data keuangan bulan ini:
- Total Pemasukan: ${formatRupiah(totalPemasukan)}
- Total Pengeluaran: ${formatRupiah(totalPengeluaran)}
- Saldo: ${formatRupiah(saldo)}
- Kategori pengeluaran terbesar: ${topCategory ? `${topCategory[0]} (${formatRupiah(topCategory[1])})` : "belum ada"}
- Tanggal hari ini: ${now.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}

Berikan:
1. Analisis singkat kondisi keuangan (1-2 kalimat)
2. 2-3 saran spesifik yang bisa dilakukan hari ini (investasi, menabung, mengurangi pengeluaran, dll)
3. Tips investasi yang relevan untuk kondisi keuangan saat ini (reksa dana, emas, deposito, dll)

Format response dengan emoji yang menarik dan mudah dibaca. Maksimal 200 kata.`;

      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${import.meta.env.VITE_GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            {
              role: "system",
              content: "Kamu adalah konsultan keuangan keluarga Indonesia yang memberikan saran praktis dan mudah dipahami.",
            },
            { role: "user", content: prompt },
          ],
          temperature: 0.7,
          max_tokens: 500,
        }),
      });

      const data = await response.json();
      const result = data.choices[0].message.content;

      localStorage.setItem("daily_advice", result);
      localStorage.setItem("daily_advice_date", new Date().toDateString());
      setAdvice(result);
      setLastFetched(new Date().toDateString());
    } catch (err) {
      setAdvice("Gagal memuat saran. Pastikan koneksi internet Anda stabil.");
    }
    setLoading(false);
  };

  return (
    <div className="pb-24">
      <div className="bg-white rounded-2xl p-4 shadow-sm mb-4">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-bold text-gray-700">💡 Saran Keuangan Harian</h3>
          <button
            onClick={fetchAdvice}
            disabled={loading}
            className="text-blue-500 text-xs font-semibold disabled:opacity-50"
          >
            {loading ? "Memuat..." : "🔄 Refresh"}
          </button>
        </div>

        <p className="text-xs text-gray-400 mb-3">
          {lastFetched ? `Diperbarui: ${lastFetched}` : "Belum ada saran"}
        </p>

        {loading ? (
          <div className="flex flex-col items-center py-8 gap-3">
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-400">AI sedang menganalisa keuangan Anda...</p>
          </div>
        ) : advice ? (
          <div className="bg-blue-50 rounded-xl p-4">
            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
              {advice}
            </p>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-400">
            <p className="text-4xl mb-2">💡</p>
            <p className="text-sm">Tambahkan transaksi dulu untuk mendapat saran personal</p>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="bg-yellow-50 rounded-2xl p-4">
        <p className="text-xs text-yellow-700 font-semibold mb-1">ℹ️ Tentang Saran Harian</p>
        <p className="text-xs text-yellow-600">
          Saran dihasilkan oleh AI berdasarkan data keuangan Anda bulan ini. 
          Saran diperbarui setiap hari dan bersifat edukatif, bukan merupakan 
          rekomendasi investasi resmi. Selalu konsultasikan keputusan investasi 
          besar dengan ahli keuangan profesional.
        </p>
      </div>
    </div>
  );
}