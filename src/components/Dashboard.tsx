import { useEffect, useRef, useState } from "react";
import { db, auth } from "../firebase";
import { collection, query, onSnapshot, where } from "firebase/firestore";
import { signOut } from "firebase/auth";
import TransactionForm from "./TransactionForm";
import TransactionList from "./TransactionList";
import Budget from "./Budget";
import Reports from "./Reports";
import FamilyWallet from "./FamilyWallet";
import ReportGenerator from "./ReportGenerator";
import ReceiptScanner from "./ReceiptScanner";
import SavingsGoals from "./SavingsGoals";
import BillReminder from "./BillReminder";
import Savings from "./Savings";
import DailyAdvice from "./DailyAdvice";

interface Transaction {
  id: string;
  type: "pemasukan" | "pengeluaran";
  amount: number;
  category: string;
  note: string;
  email: string;
  createdAt: any;
}

const formatRupiah = (amount: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);

type Tab = "beranda" | "dompet" | "laporan" | "anggaran" | "goals" | "tabungan" | "tagihan" | "struk" | "saran";

const tabs: { id: Tab; label: string; title: string }[] = [
  { id: "beranda", label: "🏠", title: "Beranda" },
  { id: "dompet", label: "👨‍👩‍👧", title: "Bersama" },
  { id: "laporan", label: "📊", title: "Laporan" },
  { id: "anggaran", label: "💰", title: "Anggaran" },
  { id: "goals", label: "🎯", title: "Goals" },
  { id: "tabungan", label: "🏦", title: "Tabungan" },
  { id: "tagihan", label: "🔔", title: "Tagihan" },
  { id: "struk", label: "🧾", title: "Struk" },
  { id: "saran", label: "💡", title: "Saran" },
];

export default function Dashboard() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [familyTransactions, setFamilyTransactions] = useState<Transaction[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("beranda");
  const tabRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    const q1 = query(collection(db, "transactions"), where("uid", "==", uid));
    const unsub1 = onSnapshot(q1, (snapshot) => {
      setTransactions(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Transaction[]);
    });

    const q2 = query(collection(db, "family_transactions"));
    const unsub2 = onSnapshot(q2, (snapshot) => {
      setFamilyTransactions(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Transaction[]);
    });

    return () => { unsub1(); unsub2(); };
  }, []);

  // Auto scroll tab aktif ke tengah
  useEffect(() => {
    if (tabRef.current) {
      const activeEl = tabRef.current.querySelector(`[data-tab="${activeTab}"]`) as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
      }
    }
  }, [activeTab]);

  const now = new Date();
  const thisMonthTrx = transactions.filter((t) => {
    const d = t.createdAt?.toDate();
    return d?.getMonth() === now.getMonth() && d?.getFullYear() === now.getFullYear();
  });

  const totalPemasukan = thisMonthTrx.filter((t) => t.type === "pemasukan").reduce((s, t) => s + t.amount, 0);
  const totalPengeluaran = thisMonthTrx.filter((t) => t.type === "pengeluaran").reduce((s, t) => s + t.amount, 0);
  const saldo = totalPemasukan - totalPengeluaran;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-800 text-white p-6 pb-20">
        <div className="flex justify-between items-center mb-5">
          <div>
            <p className="text-blue-200 text-xs">Selamat datang 👋</p>
            <p className="font-semibold text-sm">{auth.currentUser?.email}</p>
          </div>
          <button
            onClick={() => signOut(auth)}
            className="bg-white bg-opacity-20 px-3 py-1.5 rounded-xl text-xs font-semibold"
          >
            Keluar
          </button>
        </div>

        {/* Saldo Card */}
        <div className="bg-white bg-opacity-15 backdrop-blur rounded-2xl p-5 text-center">
          <p className="text-blue-100 text-xs mb-1">Saldo Pribadi Bulan Ini</p>
          <p className="text-4xl font-bold tracking-tight">{formatRupiah(saldo)}</p>
          <div className="flex justify-around mt-4 pt-4 border-t border-white border-opacity-20">
            <div>
              <p className="text-blue-200 text-xs mb-1">Pemasukan</p>
              <p className="font-bold text-green-300 text-sm">{formatRupiah(totalPemasukan)}</p>
            </div>
            <div className="w-px bg-white bg-opacity-20" />
            <div>
              <p className="text-blue-200 text-xs mb-1">Pengeluaran</p>
              <p className="font-bold text-red-300 text-sm">{formatRupiah(totalPengeluaran)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Tab Navigation */}
      <div className="sticky top-0 z-40 bg-white shadow-sm -mt-6 rounded-t-3xl">
        <div
          ref={tabRef}
          className="flex overflow-x-auto scrollbar-hide px-3 pt-4 pb-1 gap-2"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              data-tab={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center gap-1 px-4 py-2 rounded-2xl transition-all duration-200 whitespace-nowrap flex-shrink-0 ${
                activeTab === tab.id
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-200 scale-105"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }`}
            >
              <span className="text-xl">{tab.label}</span>
              <span className="text-xs font-semibold">{tab.title}</span>
            </button>
          ))}
        </div>

        {/* Active tab indicator dots */}
        <div className="flex justify-center gap-1 py-2">
          {tabs.map((tab) => (
            <div
              key={tab.id}
              className={`rounded-full transition-all duration-200 ${
                activeTab === tab.id
                  ? "w-4 h-1.5 bg-blue-600"
                  : "w-1.5 h-1.5 bg-gray-300"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pt-4">
        {activeTab === "beranda" && <TransactionList />}
        {activeTab === "dompet" && <FamilyWallet />}
        {activeTab === "laporan" && (
          <div className="space-y-4">
            <Reports transactions={transactions} />
            <ReportGenerator
              transactions={transactions}
              familyTransactions={familyTransactions}
            />
          </div>
        )}
        {activeTab === "anggaran" && <Budget transactions={thisMonthTrx} />}
        {activeTab === "goals" && <SavingsGoals />}
        {activeTab === "tabungan" && <Savings />}
        {activeTab === "tagihan" && <BillReminder />}
        {activeTab === "struk" && <ReceiptScanner />}
        {activeTab === "saran" && <DailyAdvice />}
      </div>

      {/* FAB */}
      {activeTab === "beranda" && (
        <button
          onClick={() => setShowForm(true)}
          className="fixed bottom-6 right-6 bg-blue-600 text-white w-14 h-14 rounded-full shadow-xl shadow-blue-300 text-3xl flex items-center justify-center active:scale-95 transition-transform"
        >
          +
        </button>
      )}

      {showForm && <TransactionForm onClose={() => setShowForm(false)} />}
    </div>
  );
}