import { useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Transaction {
  id: string;
  type: 'pemasukan' | 'pengeluaran';
  amount: number;
  category: string;
  note: string;
  email: string;
  createdAt: any;
}


interface Props {
  transactions: Transaction[];
  familyTransactions: Transaction[];
}


const formatRupiah = (amount: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount);

const MONTHS = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

export default function ReportGenerator({
  transactions,
  familyTransactions,
}: Props) {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [generating, setGenerating] = useState(false);

  const filterByMonth = (trx: Transaction[]) =>
    trx.filter((t) => {
      const d = t.createdAt?.toDate();
      return (
        d?.getMonth() === selectedMonth && d?.getFullYear() === selectedYear
      );
    });

  const generatePDF = async () => {
    setGenerating(true);
    const doc = new jsPDF();
    const personalTrx = filterByMonth(transactions);
    const familyTrx = filterByMonth(familyTransactions);

    // Header
    doc.setFontSize(18);
    doc.setTextColor(37, 99, 235);
    doc.text('Laporan Keuangan Keluarga', 105, 20, { align: 'center' });

    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    doc.text(`${MONTHS[selectedMonth]} ${selectedYear}`, 105, 28, {
      align: 'center',
    });

    doc.setDrawColor(37, 99, 235);
    doc.line(14, 32, 196, 32);

    // Summary Pribadi
    const personalPemasukan = personalTrx
      .filter((t) => t.type === 'pemasukan')
      .reduce((s, t) => s + t.amount, 0);
    const personalPengeluaran = personalTrx
      .filter((t) => t.type === 'pengeluaran')
      .reduce((s, t) => s + t.amount, 0);

    // Summary Bersama
    const familyPemasukan = familyTrx
      .filter((t) => t.type === 'pemasukan')
      .reduce((s, t) => s + t.amount, 0);
    const familyPengeluaran = familyTrx
      .filter((t) => t.type === 'pengeluaran')
      .reduce((s, t) => s + t.amount, 0);

    // Ringkasan
    doc.setFontSize(13);
    doc.setTextColor(0, 0, 0);
    doc.text('Ringkasan', 14, 42);

    autoTable(doc, {
      startY: 46,
      head: [['Keterangan', 'Pribadi', 'Bersama', 'Total']],
      body: [
        [
          'Pemasukan',
          formatRupiah(personalPemasukan),
          formatRupiah(familyPemasukan),
          formatRupiah(personalPemasukan + familyPemasukan),
        ],
        [
          'Pengeluaran',
          formatRupiah(personalPengeluaran),
          formatRupiah(familyPengeluaran),
          formatRupiah(personalPengeluaran + familyPengeluaran),
        ],
        [
          'Saldo',
          formatRupiah(personalPemasukan - personalPengeluaran),
          formatRupiah(familyPemasukan - familyPengeluaran),
          formatRupiah(
            personalPemasukan -
              personalPengeluaran +
              familyPemasukan -
              familyPengeluaran
          ),
        ],
      ],
      headStyles: { fillColor: [37, 99, 235] },
      alternateRowStyles: { fillColor: [239, 246, 255] },
    });

    // Transaksi Pribadi
    if (personalTrx.length > 0) {
      const finalY1 = (doc as any).lastAutoTable.finalY + 10;
      doc.setFontSize(13);
      doc.text('Transaksi Pribadi', 14, finalY1);

      autoTable(doc, {
        startY: finalY1 + 4,
        head: [['Tanggal', 'Kategori', 'Catatan', 'Jenis', 'Jumlah']],
        body: personalTrx.map((t) => [
          t.createdAt?.toDate().toLocaleDateString('id-ID'),
          t.category,
          t.note || '-',
          t.type === 'pemasukan' ? 'Masuk' : 'Keluar',
          formatRupiah(t.amount),
        ]),
        headStyles: { fillColor: [16, 185, 129] },
        alternateRowStyles: { fillColor: [240, 253, 244] },
      });
    }

    // Transaksi Bersama
    if (familyTrx.length > 0) {
      const finalY2 = (doc as any).lastAutoTable.finalY + 10;
      doc.setFontSize(13);
      doc.text('Transaksi Dompet Bersama', 14, finalY2);

      autoTable(doc, {
        startY: finalY2 + 4,
        head: [['Tanggal', 'Kategori', 'Catatan', 'Oleh', 'Jenis', 'Jumlah']],
        body: familyTrx.map((t) => [
          t.createdAt?.toDate().toLocaleDateString('id-ID'),
          t.category,
          t.note || '-',
          t.email,
          t.type === 'pemasukan' ? 'Masuk' : 'Keluar',
          formatRupiah(t.amount),
        ]),
        headStyles: { fillColor: [139, 92, 246] },
        alternateRowStyles: { fillColor: [245, 243, 255] },
      });
    }

    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(9);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `Laporan dibuat otomatis • ${new Date().toLocaleDateString(
          'id-ID'
        )} • Halaman ${i} dari ${pageCount}`,
        105,
        doc.internal.pageSize.height - 10,
        { align: 'center' }
      );
    }

    doc.save(`Laporan-Keuangan-${MONTHS[selectedMonth]}-${selectedYear}.pdf`);
    setGenerating(false);
  };

  const personalTrx = filterByMonth(transactions);
  const familyTrx = filterByMonth(familyTransactions);
  const totalTrx = personalTrx.length + familyTrx.length;

  return (
    <div className="pb-24">
      <div className="bg-white rounded-2xl p-4 shadow-sm mb-4">
        <h3 className="font-bold text-gray-700 mb-4">
          📄 Generate Laporan PDF
        </h3>

        {/* Pilih Bulan & Tahun */}
        <div className="flex gap-3 mb-4">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="flex-1 border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            {MONTHS.map((m, i) => (
              <option key={m} value={i}>
                {m}
              </option>
            ))}
          </select>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="w-28 border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            {[2024, 2025, 2026, 2027].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>

        {/* Preview */}
        <div className="bg-blue-50 rounded-xl p-3 mb-4">
          <p className="text-sm text-blue-700 font-semibold mb-1">
            Preview — {MONTHS[selectedMonth]} {selectedYear}
          </p>
          <p className="text-xs text-blue-600">
            {totalTrx} transaksi ditemukan ({personalTrx.length} pribadi,{' '}
            {familyTrx.length} bersama)
          </p>
        </div>

        <button
          onClick={generatePDF}
          disabled={generating || totalTrx === 0}
          className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold disabled:opacity-50"
        >
          {generating ? 'Membuat PDF...' : '⬇️ Download Laporan PDF'}
        </button>

        {totalTrx === 0 && (
          <p className="text-center text-gray-400 text-sm mt-2">
            Tidak ada transaksi di bulan ini
          </p>
        )}
      </div>
    </div>
  );
}
