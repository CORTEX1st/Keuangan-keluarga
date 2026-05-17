import { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import {
  collection,
  onSnapshot,
  doc,
  setDoc,
  query,
  where,
} from 'firebase/firestore';

interface Transaction {
  id: string;
  type: 'pemasukan' | 'pengeluaran';
  amount: number;
  category: string;
  createdAt: any;
}

interface Budget {
  category: string;
  limit: number;
}

interface Props {
  transactions: Transaction[];
}

const CATEGORIES = [
  'Makan',
  'Listrik',
  'Air',
  'Transport',
  'Belanja',
  'Kesehatan',
  'Pendidikan',
  'Hiburan',
  'Lainnya',
];

const formatRupiah = (amount: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount);

export default function Budget({ transactions }: Props) {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [editCategory, setEditCategory] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    const q = query(collection(db, 'budgets'), where('uid', '==', uid));
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => doc.data() as Budget);
      setBudgets(data);
    });
    return () => unsub();
  }, []);

  const handleSaveBudget = async (category: string) => {
    const uid = auth.currentUser?.uid;
    if (!uid || !inputValue) return;
    await setDoc(doc(db, 'budgets', `${uid}_${category}`), {
      uid,
      category,
      limit: Number(inputValue),
    });
    setEditCategory(null);
    setInputValue('');
  };

  const getBudget = (category: string) =>
    budgets.find((b) => b.category === category)?.limit || 0;

  const getSpent = (category: string) =>
    transactions
      .filter((t) => t.type === 'pengeluaran' && t.category === category)
      .reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="space-y-3 pb-24">
      <p className="text-sm text-gray-500 mb-2">
        Set anggaran per kategori untuk bulan ini
      </p>

      {CATEGORIES.map((cat) => {
        const budget = getBudget(cat);
        const spent = getSpent(cat);
        const percent = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
        const isOver = spent > budget && budget > 0;

        return (
          <div key={cat} className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex justify-between items-center mb-2">
              <p className="font-semibold text-gray-700">{cat}</p>
              <button
                onClick={() => {
                  setEditCategory(cat);
                  setInputValue(budget ? String(budget) : '');
                }}
                className="text-blue-500 text-sm"
              >
                {budget ? 'Edit' : 'Set Anggaran'}
              </button>
            </div>

            {editCategory === cat && (
              <div className="flex gap-2 mb-2">
                <input
                  type="number"
                  placeholder="Anggaran (Rp)"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  className="flex-1 border rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
                <button
                  onClick={() => handleSaveBudget(cat)}
                  className="bg-blue-600 text-white px-3 rounded-lg text-sm"
                >
                  Simpan
                </button>
                <button
                  onClick={() => setEditCategory(null)}
                  className="text-gray-400 px-2 text-sm"
                >
                  Batal
                </button>
              </div>
            )}

            {budget > 0 && (
              <>
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>{formatRupiah(spent)} terpakai</span>
                  <span>{formatRupiah(budget)} anggaran</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      isOver
                        ? 'bg-red-500'
                        : percent > 75
                        ? 'bg-yellow-400'
                        : 'bg-green-500'
                    }`}
                    style={{ width: `${percent}%` }}
                  />
                </div>
                {isOver && (
                  <p className="text-red-500 text-xs mt-1">
                    ⚠️ Melebihi anggaran {formatRupiah(spent - budget)}
                  </p>
                )}
              </>
            )}

            {budget === 0 && spent > 0 && (
              <p className="text-xs text-gray-400">
                Terpakai: {formatRupiah(spent)} (belum ada anggaran)
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
