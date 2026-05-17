import { useEffect, useState } from 'react';
import { db } from '../firebase';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  deleteDoc,
  doc,
} from 'firebase/firestore';

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

export default function TransactionList() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'transactions'),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Transaction[];
      setTransactions(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleDelete = async (id: string) => {
    if (confirm('Hapus transaksi ini?')) {
      await deleteDoc(doc(db, 'transactions', id));
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-400">Memuat...</div>;
  }

  if (transactions.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">Belum ada transaksi</div>
    );
  }

  return (
    <div className="space-y-3">
      {transactions.map((trx) => (
        <div
          key={trx.id}
          className="bg-white rounded-xl p-4 shadow-sm flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center text-xl ${
                trx.type === 'pemasukan' ? 'bg-green-100' : 'bg-red-100'
              }`}
            >
              {trx.type === 'pemasukan' ? '💵' : '💸'}
            </div>
            <div>
              <p className="font-semibold text-gray-800">{trx.category}</p>
              <p className="text-xs text-gray-400">
                {trx.note && `${trx.note} • `}
                {trx.email}
              </p>
              <p className="text-xs text-gray-400">
                {trx.createdAt?.toDate().toLocaleDateString('id-ID', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <p
              className={`font-bold ${
                trx.type === 'pemasukan' ? 'text-green-600' : 'text-red-500'
              }`}
            >
              {trx.type === 'pemasukan' ? '+' : '-'}
              {formatRupiah(trx.amount)}
            </p>
            <button
              onClick={() => handleDelete(trx.id)}
              className="text-gray-300 hover:text-red-400 text-lg ml-1"
            >
              🗑️
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
