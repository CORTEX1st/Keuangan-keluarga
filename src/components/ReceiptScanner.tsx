import { useState } from 'react';
import { db, auth } from '../firebase';
import { collection, addDoc, Timestamp } from 'firebase/firestore';

interface ExtractedData {
  amount: number;
  category: string;
  note: string;
  type: 'pemasukan' | 'pengeluaran';
  items: string[];
  storeName: string;
  date: string;
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


export default function ReceiptScanner() {
  const [receiptText, setReceiptText] = useState('');
  const [extracted, setExtracted] = useState<ExtractedData | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [wallet, setWallet] = useState<'personal' | 'family'>('personal');
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const extractFromReceipt = async () => {
    if (!receiptText.trim()) return;
    setLoading(true);
    setError('');
    setExtracted(null);

    try {
      const response = await fetch(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_GROQ_API_KEY}`,
          },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [
              {
                role: 'system',
                content: `Kamu adalah asisten keuangan. Ekstrak informasi dari teks struk/nota belanja dan kembalikan HANYA dalam format JSON tanpa penjelasan apapun. Format JSON:
{
  "storeName": "nama toko atau merchant",
  "date": "tanggal transaksi (dd/mm/yyyy) atau kosong jika tidak ada",
  "items": ["daftar item yang dibeli"],
  "amount": total_belanja_dalam_angka,
  "category": "salah satu dari: Makan, Listrik, Air, Transport, Belanja, Kesehatan, Pendidikan, Hiburan, Lainnya",
  "note": "ringkasan singkat transaksi",
  "type": "pengeluaran"
}`,
              },
              {
                role: 'user',
                content: `Ekstrak informasi dari struk ini:\n\n${receiptText}`,
              },
            ],
            temperature: 0.1,
            max_tokens: 500,
          }),
        }
      );

      const data = await response.json();
      const content = data.choices[0].message.content;
      const clean = content.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(clean) as ExtractedData;
      setExtracted(parsed);
    } catch (err) {
      setError('Gagal membaca struk. Pastikan teks struk jelas dan coba lagi.');
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!extracted) return;
    setSaving(true);
    try {
      const collectionName =
        wallet === 'personal' ? 'transactions' : 'family_transactions';
      await addDoc(collection(db, collectionName), {
        type: extracted.type,
        amount: extracted.amount,
        category: extracted.category,
        note: `${extracted.storeName} - ${extracted.note}`,
        uid: auth.currentUser?.uid,
        email: auth.currentUser?.email,
        createdAt: Timestamp.now(),
      });
      setSaved(true);
      setReceiptText('');
      setExtracted(null);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError('Gagal menyimpan transaksi.');
    }
    setSaving(false);
  };

  return (
    <div className="pb-24">
      <div className="bg-white rounded-2xl p-4 shadow-sm mb-4">
        <h3 className="font-bold text-gray-700 mb-1">🧾 Scan Struk / Nota</h3>
        <p className="text-xs text-gray-400 mb-4">
          Ketik atau paste teks dari struk belanja, AI akan membaca dan mengisi
          form otomatis
        </p>

        <textarea
          value={receiptText}
          onChange={(e) => setReceiptText(e.target.value)}
          placeholder={`Contoh:\nAlfamart\nIndomie Goreng  3x  Rp 3.500\nTelur 1kg       Rp 28.000\nTotal           Rp 38.500\nTanggal: 17/05/2026`}
          rows={8}
          className="w-full border rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 font-mono"
        />

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg mt-2 text-sm">
            {error}
          </div>
        )}

        <button
          onClick={extractFromReceipt}
          disabled={loading || !receiptText.trim()}
          className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold mt-3 disabled:opacity-50"
        >
          {loading ? '🤖 Membaca struk...' : '🤖 Baca Struk Otomatis'}
        </button>
      </div>

      {/* Hasil Ekstraksi */}
      {extracted && (
        <div className="bg-white rounded-2xl p-4 shadow-sm mb-4">
          <h3 className="font-bold text-gray-700 mb-3">✅ Hasil Pembacaan</h3>

          {/* Store & Date */}
          <div className="flex justify-between mb-3">
            <div>
              <p className="text-xs text-gray-400">Toko / Merchant</p>
              <p className="font-semibold text-gray-800">
                {extracted.storeName || '-'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400">Tanggal</p>
              <p className="font-semibold text-gray-800">
                {extracted.date || 'Hari ini'}
              </p>
            </div>
          </div>

          {/* Items */}
          {extracted.items && extracted.items.length > 0 && (
            <div className="bg-gray-50 rounded-xl p-3 mb-3">
              <p className="text-xs text-gray-400 mb-2">Item Pembelian</p>
              {extracted.items.map((item, i) => (
                <p key={i} className="text-sm text-gray-700">
                  • {item}
                </p>
              ))}
            </div>
          )}

          {/* Amount & Category */}
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <p className="text-xs text-gray-400 mb-1">Total</p>
              <input
                type="number"
                value={extracted.amount}
                onChange={(e) =>
                  setExtracted({ ...extracted, amount: Number(e.target.value) })
                }
                className="w-full border rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Kategori</p>
              <select
                value={extracted.category}
                onChange={(e) =>
                  setExtracted({ ...extracted, category: e.target.value })
                }
                className="w-full border rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Note */}
          <div className="mb-3">
            <p className="text-xs text-gray-400 mb-1">Catatan</p>
            <input
              type="text"
              value={extracted.note}
              onChange={(e) =>
                setExtracted({ ...extracted, note: e.target.value })
              }
              className="w-full border rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          {/* Wallet Selection */}
          <div className="mb-4">
            <p className="text-xs text-gray-400 mb-1">Simpan ke</p>
            <div className="flex rounded-lg overflow-hidden border">
              <button
                onClick={() => setWallet('personal')}
                className={`flex-1 py-2 text-sm font-semibold ${
                  wallet === 'personal'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600'
                }`}
              >
                💼 Pribadi
              </button>
              <button
                onClick={() => setWallet('family')}
                className={`flex-1 py-2 text-sm font-semibold ${
                  wallet === 'family'
                    ? 'bg-purple-600 text-white'
                    : 'text-gray-600'
                }`}
              >
                👨‍👩‍👧 Bersama
              </button>
            </div>
          </div>

          {saved && (
            <div className="bg-green-50 text-green-600 p-3 rounded-lg mb-3 text-sm text-center font-semibold">
              ✅ Transaksi berhasil disimpan!
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-green-600 text-white py-3 rounded-xl font-semibold disabled:opacity-50"
          >
            {saving ? 'Menyimpan...' : '💾 Simpan Transaksi'}
          </button>
        </div>
      )}
    </div>
  );
}
