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

interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string;
  icon: string;
  uid: string;
  createdAt: any;
}

const formatRupiah = (amount: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);

const ICONS = ["🏠", "🚗", "✈️", "📱", "💍", "🎓", "🏥", "🛋️", "💻", "🎯"];

export default function SavingsGoals() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showTopUp, setShowTopUp] = useState<string | null>(null);
  const [topUpAmount, setTopUpAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [deadline, setDeadline] = useState("");
  const [selectedIcon, setSelectedIcon] = useState("🎯");

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    const q = query(
      collection(db, "savings_goals"),
      where("uid", "==", uid)
    );
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Goal[];
      setGoals(data.sort((a, b) => b.createdAt?.toDate() - a.createdAt?.toDate()));
    });
    return () => unsub();
  }, []);

  const handleAddGoal = async () => {
    if (!name || !targetAmount) return;
    setLoading(true);
    try {
      await addDoc(collection(db, "savings_goals"), {
        name,
        targetAmount: Number(targetAmount),
        currentAmount: 0,
        deadline,
        icon: selectedIcon,
        uid: auth.currentUser?.uid,
        createdAt: Timestamp.now(),
      });
      setShowForm(false);
      setName("");
      setTargetAmount("");
      setDeadline("");
      setSelectedIcon("🎯");
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handleTopUp = async (goal: Goal) => {
    if (!topUpAmount) return;
    const newAmount = goal.currentAmount + Number(topUpAmount);
    await updateDoc(doc(db, "savings_goals", goal.id), {
      currentAmount: newAmount,
    });
    setShowTopUp(null);
    setTopUpAmount("");
  };

  const handleDelete = async (id: string) => {
    if (confirm("Hapus goals ini?")) {
      await deleteDoc(doc(db, "savings_goals", id));
    }
  };

  const getMonthsLeft = (deadline: string) => {
    if (!deadline) return null;
    const now = new Date();
    const end = new Date(deadline);
    const months =
      (end.getFullYear() - now.getFullYear()) * 12 +
      (end.getMonth() - now.getMonth());
    return months;
  };

  const getMonthlySaving = (goal: Goal) => {
    const months = getMonthsLeft(goal.deadline);
    if (!months || months <= 0) return null;
    const remaining = goal.targetAmount - goal.currentAmount;
    return remaining / months;
  };

  return (
    <div className="pb-24">
      {/* Header Stats */}
      <div className="bg-white rounded-2xl p-4 shadow-sm mb-4">
        <h3 className="font-bold text-gray-700 mb-3">🎯 Tabungan Goals</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-blue-50 rounded-xl p-3 text-center">
            <p className="text-xs text-gray-500">Total Goals</p>
            <p className="font-bold text-blue-600 text-lg">{goals.length}</p>
          </div>
          <div className="bg-green-50 rounded-xl p-3 text-center">
            <p className="text-xs text-gray-500">Total Terkumpul</p>
            <p className="font-bold text-green-600 text-sm">
              {formatRupiah(goals.reduce((s, g) => s + g.currentAmount, 0))}
            </p>
          </div>
        </div>
      </div>

      {/* Add Button */}
      <button
        onClick={() => setShowForm(!showForm)}
        className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold mb-4"
      >
        {showForm ? "Tutup" : "+ Tambah Goals Baru"}
      </button>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-2xl p-4 shadow-sm mb-4">
          <h4 className="font-bold text-gray-700 mb-3">Goals Baru</h4>

          {/* Icon Picker */}
          <p className="text-xs text-gray-400 mb-2">Pilih Icon</p>
          <div className="flex flex-wrap gap-2 mb-3">
            {ICONS.map((icon) => (
              <button
                key={icon}
                onClick={() => setSelectedIcon(icon)}
                className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center ${
                  selectedIcon === icon
                    ? "bg-blue-100 border-2 border-blue-500"
                    : "bg-gray-100"
                }`}
              >
                {icon}
              </button>
            ))}
          </div>

          <input
            type="text"
            placeholder="Nama goals (contoh: Beli TV)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border rounded-lg p-3 mb-3 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />

          <input
            type="number"
            placeholder="Target jumlah (Rp)"
            value={targetAmount}
            onChange={(e) => setTargetAmount(e.target.value)}
            className="w-full border rounded-lg p-3 mb-3 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />

          <div className="mb-4">
            <p className="text-xs text-gray-400 mb-1">Target tanggal (opsional)</p>
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          <button
            onClick={handleAddGoal}
            disabled={loading || !name || !targetAmount}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold disabled:opacity-50"
          >
            {loading ? "Menyimpan..." : "Simpan Goals"}
          </button>
        </div>
      )}

      {/* Goals List */}
      <div className="space-y-4">
        {goals.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <p className="text-4xl mb-2">🎯</p>
            <p>Belum ada goals tabungan</p>
            <p className="text-sm">Tambah goals pertama Anda!</p>
          </div>
        )}

        {goals.map((goal) => {
          const percent = Math.min(
            (goal.currentAmount / goal.targetAmount) * 100,
            100
          );
          const isCompleted = goal.currentAmount >= goal.targetAmount;
          const monthsLeft = getMonthsLeft(goal.deadline);
          const monthlySaving = getMonthlySaving(goal);

          return (
            <div key={goal.id} className="bg-white rounded-2xl p-4 shadow-sm">
              {/* Goal Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-2xl">
                    {goal.icon}
                  </div>
                  <div>
                    <p className="font-bold text-gray-800">{goal.name}</p>
                    {isCompleted && (
                      <span className="text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded-full font-semibold">
                        ✅ Tercapai!
                      </span>
                    )}
                    {!isCompleted && monthsLeft !== null && (
                      <p className="text-xs text-gray-400">
                        {monthsLeft > 0 ? `${monthsLeft} bulan lagi` : "Sudah lewat deadline"}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(goal.id)}
                  className="text-gray-300 hover:text-red-400 text-lg"
                >
                  🗑️
                </button>
              </div>

              {/* Progress */}
              <div className="mb-2">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-500">
                    {formatRupiah(goal.currentAmount)}
                  </span>
                  <span className="font-semibold text-gray-700">
                    {formatRupiah(goal.targetAmount)}
                  </span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full transition-all ${
                      isCompleted ? "bg-green-500" : "bg-blue-500"
                    }`}
                    style={{ width: `${percent}%` }}
                  />
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-xs text-gray-400">
                    {percent.toFixed(0)}% terkumpul
                  </span>
                  <span className="text-xs text-gray-400">
                    Sisa {formatRupiah(Math.max(goal.targetAmount - goal.currentAmount, 0))}
                  </span>
                </div>
              </div>

              {/* Monthly suggestion */}
              {monthlySaving && !isCompleted && monthsLeft && monthsLeft > 0 && (
                <div className="bg-blue-50 rounded-xl p-3 mb-3">
                  <p className="text-xs text-blue-600">
                    💡 Nabung <span className="font-bold">{formatRupiah(monthlySaving)}</span>/bulan
                    untuk capai target tepat waktu
                  </p>
                </div>
              )}

              {/* Top Up */}
              {!isCompleted && (
                <>
                  {showTopUp === goal.id ? (
                    <div className="flex gap-2">
                      <input
                        type="number"
                        placeholder="Jumlah setor (Rp)"
                        value={topUpAmount}
                        onChange={(e) => setTopUpAmount(e.target.value)}
                        className="flex-1 border rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                      />
                      <button
                        onClick={() => handleTopUp(goal)}
                        className="bg-blue-600 text-white px-3 rounded-lg text-sm font-semibold"
                      >
                        Setor
                      </button>
                      <button
                        onClick={() => setShowTopUp(null)}
                        className="text-gray-400 px-2 text-sm"
                      >
                        Batal
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowTopUp(goal.id)}
                      className="w-full border-2 border-blue-600 text-blue-600 py-2 rounded-xl font-semibold text-sm"
                    >
                      + Setor Tabungan
                    </button>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}