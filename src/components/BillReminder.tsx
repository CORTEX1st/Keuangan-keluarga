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

interface Bill {
  id: string;
  name: string;
  amount: number;
  dueDate: number;
  icon: string;
  uid: string;
  isPaid: boolean;
  paidMonth: string;
  createdAt: any;
}

const formatRupiah = (amount: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);

const BILL_ICONS = ["⚡", "💧", "📱", "🌐", "📺", "🏠", "🚗", "🎓", "💳", "🔥"];

const getCurrentMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${now.getMonth()}`;
};

const getDaysUntilDue = (dueDate: number) => {
  const now = new Date();
  const due = new Date(now.getFullYear(), now.getMonth(), dueDate);
  if (due < now) {
    due.setMonth(due.getMonth() + 1);
  }
  const diff = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return diff;
};

export default function BillReminder() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("1");
  const [selectedIcon, setSelectedIcon] = useState("⚡");
  const [notifPermission, setNotifPermission] = useState<string>("default");

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    // Cek permission notifikasi
    if ("Notification" in window) {
      setNotifPermission(Notification.permission);
    }

    const q = query(
      collection(db, "bills"),
      where("uid", "==", uid)
    );
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Bill[];
      setBills(data.sort((a, b) => a.dueDate - b.dueDate));

      // Schedule notifikasi
      data.forEach((bill) => {
        const days = getDaysUntilDue(bill.dueDate);
        if (!bill.isPaid || bill.paidMonth !== getCurrentMonth()) {
          if (days <= 3 && days >= 0) {
            scheduleNotification(bill, days);
          }
        }
      });
    });
    return () => unsub();
  }, []);

  const requestNotificationPermission = async () => {
    if ("Notification" in window) {
      const permission = await Notification.requestPermission();
      setNotifPermission(permission);
      if (permission === "granted") {
        new Notification("🔔 Notifikasi Aktif!", {
          body: "Anda akan mendapat pengingat tagihan rutin",
          icon: "/icon-192.png",
        });
      }
    }
  };

  const scheduleNotification = (bill: Bill, daysLeft: number) => {
    if (Notification.permission !== "granted") return;
    if (daysLeft === 0) {
      new Notification(`⚠️ Tagihan Jatuh Tempo Hari Ini!`, {
        body: `${bill.icon} ${bill.name} - ${formatRupiah(bill.amount)}`,
        icon: "/icon-192.png",
      });
    } else if (daysLeft <= 3) {
      new Notification(`🔔 Pengingat Tagihan`, {
        body: `${bill.icon} ${bill.name} jatuh tempo ${daysLeft} hari lagi - ${formatRupiah(bill.amount)}`,
        icon: "/icon-192.png",
      });
    }
  };

  const handleAddBill = async () => {
    if (!name || !amount || !dueDate) return;
    setLoading(true);
    try {
      await addDoc(collection(db, "bills"), {
        name,
        amount: Number(amount),
        dueDate: Number(dueDate),
        icon: selectedIcon,
        uid: auth.currentUser?.uid,
        isPaid: false,
        paidMonth: "",
        createdAt: Timestamp.now(),
      });
      setShowForm(false);
      setName("");
      setAmount("");
      setDueDate("1");
      setSelectedIcon("⚡");
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handleTogglePaid = async (bill: Bill) => {
    const currentMonth = getCurrentMonth();
    const isPaidThisMonth = bill.isPaid && bill.paidMonth === currentMonth;
    await updateDoc(doc(db, "bills", bill.id), {
      isPaid: !isPaidThisMonth,
      paidMonth: !isPaidThisMonth ? currentMonth : "",
    });
  };

  const handleDelete = async (id: string) => {
    if (confirm("Hapus tagihan ini?")) {
      await deleteDoc(doc(db, "bills", id));
    }
  };

  const totalTagihan = bills.reduce((s, b) => s + b.amount, 0);
  const totalBelumBayar = bills
    .filter((b) => !b.isPaid || b.paidMonth !== getCurrentMonth())
    .reduce((s, b) => s + b.amount, 0);

  return (
    <div className="pb-24">
      {/* Notifikasi Permission */}
      {notifPermission !== "granted" && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 mb-4">
          <p className="text-sm text-yellow-700 font-semibold mb-2">
            🔔 Aktifkan Notifikasi
          </p>
          <p className="text-xs text-yellow-600 mb-3">
            Izinkan notifikasi agar mendapat pengingat tagihan otomatis
          </p>
          <button
            onClick={requestNotificationPermission}
            className="w-full bg-yellow-400 text-yellow-900 py-2 rounded-lg font-semibold text-sm"
          >
            Aktifkan Notifikasi
          </button>
        </div>
      )}

      {/* Summary */}
      <div className="bg-white rounded-2xl p-4 shadow-sm mb-4">
        <h3 className="font-bold text-gray-700 mb-3">🔔 Tagihan Rutin</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-blue-50 rounded-xl p-3 text-center">
            <p className="text-xs text-gray-500">Total Tagihan</p>
            <p className="font-bold text-blue-600 text-sm">
              {formatRupiah(totalTagihan)}
            </p>
          </div>
          <div className="bg-red-50 rounded-xl p-3 text-center">
            <p className="text-xs text-gray-500">Belum Bayar</p>
            <p className="font-bold text-red-500 text-sm">
              {formatRupiah(totalBelumBayar)}
            </p>
          </div>
        </div>
      </div>

      {/* Add Button */}
      <button
        onClick={() => setShowForm(!showForm)}
        className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold mb-4"
      >
        {showForm ? "Tutup" : "+ Tambah Tagihan Rutin"}
      </button>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-2xl p-4 shadow-sm mb-4">
          <h4 className="font-bold text-gray-700 mb-3">Tagihan Baru</h4>

          {/* Icon Picker */}
          <p className="text-xs text-gray-400 mb-2">Pilih Icon</p>
          <div className="flex flex-wrap gap-2 mb-3">
            {BILL_ICONS.map((icon) => (
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
            placeholder="Nama tagihan (contoh: Listrik PLN)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border rounded-lg p-3 mb-3 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />

          <input
            type="number"
            placeholder="Estimasi jumlah (Rp)"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full border rounded-lg p-3 mb-3 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />

          <div className="mb-4">
            <p className="text-xs text-gray-400 mb-1">Tanggal jatuh tempo tiap bulan</p>
            <select
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                <option key={d} value={d}>Tanggal {d}</option>
              ))}
            </select>
          </div>

          <button
            onClick={handleAddBill}
            disabled={loading || !name || !amount}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold disabled:opacity-50"
          >
            {loading ? "Menyimpan..." : "Simpan Tagihan"}
          </button>
        </div>
      )}

      {/* Bills List */}
      <div className="space-y-3">
        {bills.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <p className="text-4xl mb-2">🔔</p>
            <p>Belum ada tagihan rutin</p>
            <p className="text-sm">Tambah tagihan pertama Anda!</p>
          </div>
        )}

        {bills.map((bill) => {
          const daysLeft = getDaysUntilDue(bill.dueDate);
          const isPaidThisMonth = bill.isPaid && bill.paidMonth === getCurrentMonth();
          const isUrgent = daysLeft <= 3 && !isPaidThisMonth;

          return (
            <div
              key={bill.id}
              className={`bg-white rounded-2xl p-4 shadow-sm border-l-4 ${
                isPaidThisMonth
                  ? "border-green-400"
                  : isUrgent
                  ? "border-red-400"
                  : "border-blue-400"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl ${
                    isPaidThisMonth ? "bg-green-50" : isUrgent ? "bg-red-50" : "bg-blue-50"
                  }`}>
                    {bill.icon}
                  </div>
                  <div>
                    <p className="font-bold text-gray-800">{bill.name}</p>
                    <p className="text-sm text-gray-500">{formatRupiah(bill.amount)}</p>
                    <p className={`text-xs font-semibold ${
                      isPaidThisMonth
                        ? "text-green-500"
                        : isUrgent
                        ? "text-red-500"
                        : "text-blue-500"
                    }`}>
                      {isPaidThisMonth
                        ? "✅ Sudah dibayar bulan ini"
                        : daysLeft === 0
                        ? "⚠️ Jatuh tempo hari ini!"
                        : `📅 Jatuh tempo tgl ${bill.dueDate} (${daysLeft} hari lagi)`}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col gap-2 items-end">
                  <button
                    onClick={() => handleDelete(bill.id)}
                    className="text-gray-300 hover:text-red-400"
                  >
                    🗑️
                  </button>
                  <button
                    onClick={() => handleTogglePaid(bill)}
                    className={`text-xs px-3 py-1 rounded-full font-semibold ${
                      isPaidThisMonth
                        ? "bg-gray-100 text-gray-500"
                        : "bg-green-500 text-white"
                    }`}
                  >
                    {isPaidThisMonth ? "Batal" : "Bayar"}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}