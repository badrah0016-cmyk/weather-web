export default function Loading() {
  return (
    <div
      className="flex min-h-[50vh] flex-col items-center justify-center gap-4 bg-slate-950 px-4 text-center text-white"
      role="status"
      aria-live="polite"
    >
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-600 border-t-sky-400" />

      <h2 className="text-xl font-semibold">
        Цаг агаарын мэдээлэл
      </h2>

      <p className="text-sm text-slate-300">
        Мэдээлэл ачаалж байна. Түр хүлээнэ үү...
      </p>
    </div>
  );
}
