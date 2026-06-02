export default function Loading() {
  return (
    <main className="min-h-screen bg-stone-50 p-6 lg:p-8">
      <div className="mx-auto max-w-6xl">
        <div className="h-8 w-48 animate-pulse rounded-md bg-stone-200" />
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-28 animate-pulse rounded-md border border-stone-200 bg-white" />
          ))}
        </div>
        <div className="mt-6 h-96 animate-pulse rounded-md border border-stone-200 bg-white" />
      </div>
    </main>
  );
}
