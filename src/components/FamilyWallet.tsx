import { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import {
  collection,
  addDoc,
  query,
  onSnapshot,
  orderBy,
  Timestamp,
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

const CATEGORIES = {
  pengeluaran: [
    'Makan',
    'Listrik',
    'Air',
    'Transport',
    'Belanja',
    'Kesehatan',
    'Pendidikan',
    'Hiburan',
    'Lainnya',
  ],
  pemasukan: ['Gaji', 'Bonus', 'Freelance', 'Investasi', 'Lainnya'],
};

const formatRupiah = (amount: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount);

export default function FamilyWallet() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [type, setType] = useState<'pemasukan' | 'pengeluaran'>('pengeluaran');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = query(
      collection(db, 'family_transactions'),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Transaction[];
      setTransactions(data);
    });
    return () => unsub();
  }, []);

  const handleSubmit = async () => {
    if (!amount || !category) return;
    setLoading(true);
    try {
      await addDoc(collection(db, 'family_transactions'), {
        type,
        amount: Number(amount),
        category,
        note,
        uid: auth.currentUser?.uid,
        email: auth.currentUser?.email,
        createdAt: Timestamp.now(),
      });
      setShowForm(false);
      setAmount('');
      setCategory('');
      setNote('');
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Hapus transaksi ini?')) {
      await deleteDoc(doc(db, 'family_transactions', id));
    }
  };

  const totalPemasukan = transactions
    .filter((t) => t.type === 'pemasukan')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalPengeluaran = transactions
    .filter((t) => t.type === 'pengeluaran')
    .reduce((sum, t) => sum + t.amount, 0);

  const saldo = totalPemasukan - totalPengeluaran;

  return (
    <div className="pb-24">
      {/* Summary */}
      <div className="bg-white rounded-2xl p-4 shadow-sm mb-4">
        <h3 className="font-bold text-gray-700 mb-3">👨‍👩‍👧 Dompet Bersama</h3>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-blue-50 rounded-xl p-3">
            <p className="text-xs text-gray-500">Saldo</p>
            <p
              className={`font-bold text-sm ${
                saldo >= 0 ? 'text-blue-600' : 'text-red-500'
              }`}
            >
              {formatRupiah(saldo)}
            </p>
          </div>
          <div className="bg-green-50 rounded-xl p-3">
            <p className="text-xs text-gray-500">Masuk</p>
            <p className="font-bold text-sm text-green-600">
              {formatRupiah(totalPemasukan)}
            </p>
          </div>
          <div className="bg-red-50 rounded-xl p-3">
            <p className="text-xs text-gray-500">Keluar</p>
            <p className="font-bold text-sm text-red-500">
              {formatRupiah(totalPengeluaran)}
            </p>
          </div>
        </div>
      </div>

      {/* Add Button */}
      <button
        onClick={() => setShowForm(!showForm)}
        className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold mb-4"
      >
        {showForm ? 'Tutup' : '+ Tambah Transaksi Bersama'}
      </button>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-2xl p-4 shadow-sm mb-4">
          <div className="flex rounded-lg overflow-hidden border mb-3">
            <button
              onClick={() => {
                setType('pengeluaran');
                setCategory('');
              }}
              className={`flex-1 py-2 font-semibold text-sm ${
                type === 'pengeluaran'
                  ? 'bg-red-500 text-white'
                  : 'text-gray-600'
              }`}
            >
              Pengeluaran
            </button>
            <button
              onClick={() => {
                setType('pemasukan');
                setCategory('');
              }}
              className={`flex-1 py-2 font-semibold text-sm ${
                type === 'pemasukan'
                  ? 'bg-green-500 text-white'
                  : 'text-gray-600'
              }`}
            >
              Pemasukan
            </button>
          </div>

          <input
            type="number"
            placeholder="Jumlah (Rp)"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full border rounded-lg p-3 mb-3 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />

          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full border rounded-lg p-3 mb-3 focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <option value="">Pilih kategori</option>
            {CATEGORIES[type].map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          <input
            type="text"
            placeholder="Catatan (opsional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full border rounded-lg p-3 mb-3 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />

          <button
            onClick={handleSubmit}
            disabled={loading || !amount || !category}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold disabled:opacity-50"
          >
            {loading ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>
      )}

      {/* Transaction List */}
      <div className="space-y-3">
        {transactions.length === 0 && (
          <p className="text-center text-gray-400 py-8">
            Belum ada transaksi bersama
          </p>
        )}
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
                className={`font-bold text-sm ${
                  trx.type === 'pemasukan' ? 'text-green-600' : 'text-red-500'
                }`}
              >
                {trx.type === 'pemasukan' ? '+' : '-'}
                {formatRupiah(trx.amount)}
              </p>
              <button
                onClick={() => handleDelete(trx.id)}
                className="text-gray-300 hover:text-red-400"
              >
                🗑️
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
