import { useEffect, useMemo, useState } from 'react';
import type { ChangeEvent } from 'react';
import { useDiaryStore } from '../store/diaryStore';
import { onEntriesChanged } from '../storage';
import { toExportJSON, parseImport, mergeEntries } from '../lib/transfer';
import { computeStats } from '../lib/stats';
import { CATEGORIES } from '../lib/types';
import type { Entry } from '../lib/types';

export default function App() {
  const entries = useDiaryStore((s) => s.entries);
  const hydrate = useDiaryStore((s) => s.hydrate);
  const setAll = useDiaryStore((s) => s.setAll);

  const [importError, setImportError] = useState<string | null>(null);
  const [pendingImport, setPendingImport] = useState<Entry[] | null>(null);

  useEffect(() => {
    void hydrate();
    return onEntriesChanged(() => void hydrate());
  }, [hydrate]);

  const stats = useMemo(() => computeStats(entries), [entries]);

  const handleExport = () => {
    const json = toExportJSON(entries);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    a.href = url;
    a.download = `reading-diary-export-${timestamp}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const result = parseImport(text);
    if (!result.ok) {
      setImportError(result.error);
      setPendingImport(null);
      return;
    }
    setImportError(null);
    setPendingImport(result.entries);
  };

  const applyMerge = async () => {
    if (!pendingImport) return;
    await setAll(mergeEntries(entries, pendingImport));
    setPendingImport(null);
  };

  const applyReplace = async () => {
    if (!pendingImport) return;
    await setAll(pendingImport);
    setPendingImport(null);
  };

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="text-xl font-semibold">Reading Diary — Cài đặt</h1>

      <section className="mt-6">
        <h2 className="font-medium">Thống kê</h2>
        <p data-testid="stat-total">Tổng số: {stats.total}</p>
        <p data-testid="stat-week">Tuần này: {stats.thisWeek}</p>
        <p data-testid="stat-streak">Chuỗi ngày liên tục: {stats.streak}</p>

        <h3 className="mt-3 text-sm font-medium">Phân loại nhiều nhất</h3>
        <div data-testid="top-categories">
          {stats.topCategories.map((c) => (
            <div key={c.category} className="flex items-center gap-2">
              <span className="w-24 text-sm">
                {CATEGORIES.find((x) => x.value === c.category)?.label}
              </span>
              <div className="h-2 bg-blue-500" style={{ width: `${c.count * 12}px` }} />
              <span className="text-xs">{c.count}</span>
            </div>
          ))}
        </div>

        <h3 className="mt-3 text-sm font-medium">Thẻ nhiều nhất</h3>
        <div data-testid="top-tags">
          {stats.topTags.map((t) => (
            <div key={t.tag} className="flex items-center gap-2">
              <span className="w-24 text-sm">{t.tag}</span>
              <div className="h-2 bg-emerald-500" style={{ width: `${t.count * 12}px` }} />
              <span className="text-xs">{t.count}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-6">
        <h2 className="font-medium">Xuất dữ liệu</h2>
        <button
          type="button"
          onClick={handleExport}
          className="rounded bg-blue-600 px-3 py-1 text-white"
        >
          Xuất ra JSON
        </button>
      </section>

      <section className="mt-6">
        <h2 className="font-medium">Nhập dữ liệu</h2>
        <input
          aria-label="Chọn file nhập"
          type="file"
          accept=".json"
          onChange={handleFileChange}
        />
        {importError && (
          <p role="alert" className="mt-2 text-sm text-red-600">
            {importError}
          </p>
        )}
        {pendingImport && (
          <div className="mt-2">
            <p className="text-sm">Tìm thấy {pendingImport.length} entry trong file.</p>
            <div className="mt-1 flex gap-2">
              <button
                type="button"
                onClick={applyMerge}
                className="rounded bg-slate-200 px-3 py-1 text-sm"
              >
                Gộp (giữ dữ liệu cũ)
              </button>
              <button
                type="button"
                onClick={applyReplace}
                className="rounded bg-red-100 px-3 py-1 text-sm"
              >
                Thay thế toàn bộ
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
