import { useEffect, useState } from 'react';
import { db, auth } from '../firebase';
import { collection, query, onSnapshot , where } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import TransactionForm from './TransactionForm';
import TransactionList from './TransactionList';
import Budget from './Budget';
import Reports from './Reports';
import FamilyWallet from './FamilyWallet';
import ReportGenerator from './ReportGenerator';
import ReceiptScanner from './ReceiptScanner';
import SavingsGoals from "./SavingsGoals";

interface Transaction {
  id: string;
  type: 'pemasukan' | 'pengeluaran';
  amount: number;
  category: string;
  note: string;
  email: string;
  createdAt: any;
}

const formatRupiah = (amount: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount);

type Tab = 'beranda' | 'dompet' | 'laporan' | 'anggaran' | 'struk' | 'goals';

export default function Dashboard() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [familyTransactions, setFamilyTransactions] = useState<Transaction[]>(
    []
  );
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('beranda');

  useEffect(() => {
    const q1 = query(collection(db, 'transactions'), 
    where("uid", "==", auth.currentUser?.uid));
    const unsub1 = onSnapshot(q1, (snapshot) => {
      setTransactions(
        snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Transaction[]
      );
    });

    const q2 = query(collection(db, 'family_transactions'));
    const unsub2 = onSnapshot(q2, (snapshot) => {
      setFamilyTransactions(
        snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Transaction[]
      );
    });

    return () => {
      unsub1();
      unsub2();
    };
  }, []);

  const now = new Date();
  const thisMonthTrx = transactions.filter((t) => {
    const d = t.createdAt?.toDate();
    return (
      d?.getMonth() === now.getMonth() && d?.getFullYear() === now.getFullYear()
    );
  });

  const totalPemasukan = thisMonthTrx
    .filter((t) => t.type === 'pemasukan')
    .reduce((s, t) => s + t.amount, 0);
  const totalPengeluaran = thisMonthTrx
    .filter((t) => t.type === 'pengeluaran')
    .reduce((s, t) => s + t.amount, 0);
  const saldo = totalPemasukan - totalPengeluaran;

  const tabs = [
    { id: 'beranda', label: '🏠', title: 'Beranda' },
    { id: 'dompet', label: '👨‍👩‍👧', title: 'Bersama' },
    { id: 'laporan', label: '📊', title: 'Laporan' },
    { id: 'anggaran', label: '💰', title: 'Anggaran' },
    { id: 'goals' , label: '🎯', title: 'Goals'},
    { id: 'struk', label: '🧾', title: 'Struk' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-blue-600 text-white p-6 pb-16">
        <div className="flex justify-between items-center mb-4">
          <div>
            <p className="text-blue-200 text-sm">Selamat datang,</p>
            <p className="font-semibold text-sm">{auth.currentUser?.email}</p>
          </div>
          <button
            onClick={() => signOut(auth)}
            className="bg-blue-700 px-3 py-1 rounded-lg text-sm"
          >
            Keluar
          </button>
        </div>

        {/* Saldo Card */}
        <div className="bg-white bg-opacity-20 rounded-2xl p-4 text-center">
          <p className="text-blue-100 text-sm mb-1">Saldo Pribadi Bulan Ini</p>
          <p className="text-3xl font-bold">{formatRupiah(saldo)}</p>
          <div className="flex justify-around mt-3">
            <div>
              <p className="text-blue-100 text-xs">Pemasukan</p>
              <p className="font-semibold text-green-300">
                {formatRupiah(totalPemasukan)}
              </p>
            </div>
            <div>
              <p className="text-blue-100 text-xs">Pengeluaran</p>
              <p className="font-semibold text-red-300">
                {formatRupiah(totalPengeluaran)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 -mt-8">
        {/* Tab */}
        <div className="bg-white rounded-2xl shadow-sm flex mb-4 overflow-hidden">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as Tab)}
              className={`flex-1 py-2 text-xs font-semibold flex flex-col items-center gap-0.5 ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-500'
              }`}
            >
              <span className="text-base">{tab.label}</span>
              <span>{tab.title}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'beranda' && <TransactionList />}
        {activeTab === 'dompet' && <FamilyWallet />}
        {activeTab === 'laporan' && (
          <div className="space-y-4">
            <Reports transactions={transactions} />
            <ReportGenerator
              transactions={transactions}
              familyTransactions={familyTransactions}
            />
          </div>
        )}
        {activeTab === 'anggaran' && <Budget transactions={thisMonthTrx} />}
        {activeTab === 'goals' && <SavingsGoals />}
        {activeTab === 'struk' && <ReceiptScanner />}
      </div>

      {/* FAB - hanya di beranda & dompet */}
      {activeTab === 'beranda' && (
        <button
          onClick={() => setShowForm(true)}
          className="fixed bottom-6 right-6 bg-blue-600 text-white w-14 h-14 rounded-full shadow-lg text-3xl flex items-center justify-center"
        >
          +
        </button>
      )}

      {showForm && <TransactionForm onClose={() => setShowForm(false)} />}
    </div>
  );
}
