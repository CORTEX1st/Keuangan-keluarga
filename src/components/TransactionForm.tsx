import { useState } from 'react';
import { db, auth } from '../firebase';
import { collection, addDoc, Timestamp } from 'firebase/firestore';

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

export default function TransactionForm({ onClose }: { onClose: () => void }) {
  const [type, setType] = useState<'pemasukan' | 'pengeluaran'>('pengeluaran');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!amount || !category) return;
    setLoading(true);
    try {
      await addDoc(collection(db, 'transactions'), {
        type,
        amount: Number(amount),
        category,
        note,
        uid: auth.currentUser?.uid,
        email: auth.currentUser?.email,
        createdAt: Timestamp.now(),
      });
      onClose();
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Tambah Transaksi</h2>

        {/* Type Toggle */}
        <div className="flex rounded-lg overflow-hidden border mb-4">
          <button
            onClick={() => {
              setType('pengeluaran');
              setCategory('');
            }}
            className={`flex-1 py-2 font-semibold ${
              type === 'pengeluaran'
                ? 'bg-red-500 text-white'
                : 'bg-white text-gray-600'
            }`}
          >
            Pengeluaran
          </button>
          <button
            onClick={() => {
              setType('pemasukan');
              setCategory('');
            }}
            className={`flex-1 py-2 font-semibold ${
              type === 'pemasukan'
                ? 'bg-green-500 text-white'
                : 'bg-white text-gray-600'
            }`}
          >
            Pemasukan
          </button>
        </div>

        {/* Amount */}
        <div className="mb-3">
          <label className="text-sm text-gray-500 mb-1 block">
            Jumlah (Rp)
          </label>
          <input
            type="number"
            placeholder="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>

        {/* Category */}
        <div className="mb-3">
          <label className="text-sm text-gray-500 mb-1 block">Kategori</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <option value="">Pilih kategori</option>
            {CATEGORIES[type].map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {/* Note */}
        <div className="mb-4">
          <label className="text-sm text-gray-500 mb-1 block">
            Catatan (opsional)
          </label>
          <input
            type="text"
            placeholder="Tambah catatan..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 border py-3 rounded-lg font-semibold text-gray-600"
          >
            Batal
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !amount || !category}
            className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold disabled:opacity-50"
          >
            {loading ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>
      </div>
    </div>
  );
}
