export default function AppLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900 dark:border-zinc-700 dark:border-t-zinc-100" />
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Lade Elternvertretung...
        </p>
      </div>
    </div>
  );
}
