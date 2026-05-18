import { useState, useEffect } from "react";
import { db, auth } from "../firebase";
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  where,
  doc,
  updateDoc,
  deleteDoc,
  Timestamp,
} from "firebase/firestore";

interface SavingsAccount {
  id: string;
  name: string;
  type: "emergency" | "regular";
  balance: number;
  targetAmount: number;
  icon: string;
  uid: string;
  createdAt: any;
}

interface SavingsTransaction {
  id: string;
  accountId: string;
  type: "setor" | "tarik";
  amount: number;
  note: string;
  createdAt: any;
}

const formatRupiah = (amount: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);

const ICONS = ["🏦", "🛡️", "💎", "🏠", "✈️", "📱", "🎓", "💊", "🚗", "💍"];

export default function Savings() {
  const [accounts, setAccounts] = useState<SavingsAccount[]>([]);
  const [transactions, setTransactions] = useState<SavingsTransaction[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showTrxForm, setShowTrxForm] = useState<string | null>(null);
  const [trxType, setTrxType] = useState<"setor" | "tarik">("setor");
  const [trxAmount, setTrxAmount] = useState("");
  const [trxNote, setTrxNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<"emergency" | "regular">("regular");
  const [targetAmount, setTargetAmount] = useState("");
  const [selectedIcon, setSelectedIcon] = useState("🏦");
  const [expandedAccount, setExpandedAccount] = useState<string | null>(null);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    const q1 = query(collection(db, "savings_accounts"), where("uid", "==", uid));
    const unsub1 = onSnapshot(q1, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as SavingsAccount[];
      setAccounts(data.sort((a, b) => b.createdAt?.toDate() - a.createdAt?.toDate()));
    });

    const q2 = query(collection(db, "savings_transactions"), where("uid", "==", uid));
    const unsub2 = onSnapshot(q2, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as SavingsTransaction[];
      setTransactions(data.sort((a, b) => b.createdAt?.toDate() - a.createdAt?.toDate()));
    });

    return () => { unsub1(); unsub2(); };
  }, []);

  const handleAddAccount = async () => {
    if (!name || !targetAmount) return;
    setLoading(true);
    try {
      await addDoc(collection(db, "savings_accounts"), {
        name,
        type,
        balance: 0,
        targetAmount: Number(targetAmount),
        icon: selectedIcon,
        uid: auth.currentUser?.uid,
        createdAt: Timestamp.now(),
      });
      setShowForm(false);
      setName("");
      setTargetAmount("");
      setSelectedIcon("🏦");
      setType("regular");
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handleTransaction = async (account: SavingsAccount) => {
    if (!trxAmount) return;
    const amount = Number(trxAmount);
    if (trxType === "tarik" && amount > account.balance) {
      alert("Saldo tidak mencukupi!");
      return;
    }
    try {
      const newBalance = trxType === "setor"
        ? account.balance + amount
        : account.balance - amount;

      await updateDoc(doc(db, "savings_accounts", account.id), {
        balance: newBalance,
      });

      await addDoc(collection(db, "savings_transactions"), {
        accountId: account.id,
        accountName: account.name,
        type: trxType,
        amount,
        note: trxNote,
        uid: auth.currentUser?.uid,
        createdAt: Timestamp.now(),
      });

      setShowTrxForm(null);
      setTrxAmount("");
      setTrxNote("");
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Hapus rekening tabungan ini?")) {
      await deleteDoc(doc(db, "savings_accounts", id));
    }
  };

  const getAccountTrx = (accountId: string) =>
    transactions.filter((t) => t.accountId === accountId).slice(0, 5);

  const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);
  const emergencyFund = accounts.filter((a) => a.type === "emergency").reduce((s, a) => s + a.balance, 0);

  return (
    <div className="pb-24">
      {/* Summary */}
      <div className="bg-white rounded-2xl p-4 shadow-sm mb-4">
        <h3 className="font-bold text-gray-700 mb-3">🏦 Rekening Tabungan</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-blue-50 rounded-xl p-3 text-center">
            <p className="text-xs text-gray-500">Total Tabungan</p>
            <p className="font-bold text-blue-600 text-sm">{formatRupiah(totalBalance)}</p>
          </div>
          <div className="bg-orange-50 rounded-xl p-3 text-center">
            <p className="text-xs text-gray-500">Dana Darurat</p>
            <p className="font-bold text-orange-500 text-sm">{formatRupiah(emergencyFund)}</p>
          </div>
        </div>
      </div>

      {/* Add Button */}
      <button
        onClick={() => setShowForm(!showForm)}
        className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold mb-4"
      >
        {showForm ? "Tutup" : "+ Tambah Rekening Tabungan"}
      </button>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-2xl p-4 shadow-sm mb-4">
          <h4 className="font-bold text-gray-700 mb-3">Rekening Baru</h4>

          {/* Type */}
          <div className="flex rounded-lg overflow-hidden border mb-3">
            <button
              onClick={() => setType("regular")}
              className={`flex-1 py-2 text-sm font-semibold ${type === "regular" ? "bg-blue-600 text-white" : "text-gray-600"}`}
            >
              💎 Tabungan Biasa
            </button>
            <button
              onClick={() => setType("emergency")}
              className={`flex-1 py-2 text-sm font-semibold ${type === "emergency" ? "bg-orange-500 text-white" : "text-gray-600"}`}
            >
              🛡️ Dana Darurat
            </button>
          </div>

          {/* Icon */}
          <p className="text-xs text-gray-400 mb-2">Pilih Icon</p>
          <div className="flex flex-wrap gap-2 mb-3">
            {ICONS.map((icon) => (
              <button
                key={icon}
                onClick={() => setSelectedIcon(icon)}
                className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center ${
                  selectedIcon === icon ? "bg-blue-100 border-2 border-blue-500" : "bg-gray-100"
                }`}
              >
                {icon}
              </button>
            ))}
          </div>

          <input
            type="text"
            placeholder="Nama tabungan (contoh: Dana Darurat)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border rounded-lg p-3 mb-3 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />

          <input
            type="number"
            placeholder="Target jumlah (Rp)"
            value={targetAmount}
            onChange={(e) => setTargetAmount(e.target.value)}
            className="w-full border rounded-lg p-3 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />

          <button
            onClick={handleAddAccount}
            disabled={loading || !name || !targetAmount}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold disabled:opacity-50"
          >
            {loading ? "Menyimpan..." : "Simpan"}
          </button>
        </div>
      )}

      {/* Accounts List */}
      <div className="space-y-4">
        {accounts.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <p className="text-4xl mb-2">🏦</p>
            <p>Belum ada rekening tabungan</p>
            <p className="text-sm">Tambah rekening pertama Anda!</p>
          </div>
        )}

        {accounts.map((account) => {
          const percent = Math.min((account.balance / account.targetAmount) * 100, 100);
          const isCompleted = account.balance >= account.targetAmount;
          const accountTrx = getAccountTrx(account.id);

          return (
            <div key={account.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="p-4">
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl ${
                      account.type === "emergency" ? "bg-orange-50" : "bg-blue-50"
                    }`}>
                      {account.icon}
                    </div>
                    <div>
                      <p className="font-bold text-gray-800">{account.name}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        account.type === "emergency"
                          ? "bg-orange-100 text-orange-600"
                          : "bg-blue-100 text-blue-600"
                      }`}>
                        {account.type === "emergency" ? "🛡️ Dana Darurat" : "💎 Tabungan"}
                      </span>
                    </div>
                  </div>
                  <button onClick={() => handleDelete(account.id)} className="text-gray-300 hover:text-red-400">🗑️</button>
                </div>

                {/* Balance */}
                <div className="mb-2">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-bold text-gray-800 text-lg">{formatRupiah(account.balance)}</span>
                    <span className="text-gray-400 text-sm">/ {formatRupiah(account.targetAmount)}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full transition-all ${
                        isCompleted ? "bg-green-500" : account.type === "emergency" ? "bg-orange-400" : "bg-blue-500"
                      }`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{percent.toFixed(0)}% dari target</p>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => { setShowTrxForm(account.id); setTrxType("setor"); }}
                    className="flex-1 bg-green-500 text-white py-2 rounded-lg text-sm font-semibold"
                  >
                    + Setor
                  </button>
                  <button
                    onClick={() => { setShowTrxForm(account.id); setTrxType("tarik"); }}
                    className="flex-1 bg-red-500 text-white py-2 rounded-lg text-sm font-semibold"
                  >
                    - Tarik
                  </button>
                  <button
                    onClick={() => setExpandedAccount(expandedAccount === account.id ? null : account.id)}
                    className="px-3 bg-gray-100 text-gray-600 rounded-lg text-sm"
                  >
                    {expandedAccount === account.id ? "▲" : "▼"}
                  </button>
                </div>

                {/* Transaction Form */}
                {showTrxForm === account.id && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-xl">
                    <p className="text-sm font-semibold mb-2">
                      {trxType === "setor" ? "💚 Setor Dana" : "❤️ Tarik Dana"}
                    </p>
                    <input
                      type="number"
                      placeholder="Jumlah (Rp)"
                      value={trxAmount}
                      onChange={(e) => setTrxAmount(e.target.value)}
                      className="w-full border rounded-lg p-2 mb-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                    <input
                      type="text"
                      placeholder="Catatan (opsional)"
                      value={trxNote}
                      onChange={(e) => setTrxNote(e.target.value)}
                      className="w-full border rounded-lg p-2 mb-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleTransaction(account)}
                        className={`flex-1 text-white py-2 rounded-lg text-sm font-semibold ${
                          trxType === "setor" ? "bg-green-500" : "bg-red-500"
                        }`}
                      >
                        Konfirmasi
                      </button>
                      <button
                        onClick={() => { setShowTrxForm(null); setTrxAmount(""); setTrxNote(""); }}
                        className="px-4 bg-gray-200 text-gray-600 rounded-lg text-sm"
                      >
                        Batal
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Riwayat Transaksi */}
              {expandedAccount === account.id && (
                <div className="border-t px-4 py-3">
                  <p className="text-xs font-semibold text-gray-500 mb-2">Riwayat Transaksi</p>
                  {accountTrx.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-2">Belum ada transaksi</p>
                  ) : (
                    <div className="space-y-2">
                      {accountTrx.map((trx) => (
                        <div key={trx.id} className="flex justify-between items-center">
                          <div>
                            <p className="text-xs font-semibold text-gray-700">
                              {trx.type === "setor" ? "💚 Setor" : "❤️ Tarik"}
                              {trx.note && ` - ${trx.note}`}
                            </p>
                            <p className="text-xs text-gray-400">
                              {trx.createdAt?.toDate().toLocaleDateString("id-ID")}
                            </p>
                          </div>
                          <p className={`text-sm font-bold ${trx.type === "setor" ? "text-green-600" : "text-red-500"}`}>
                            {trx.type === "setor" ? "+" : "-"}{formatRupiah(trx.amount)}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}