import Link from 'next/link';

export default function OfflinePage() {
  return (
    <main className='mx-auto flex min-h-screen w-full max-w-2xl flex-col items-center justify-center gap-4 px-6 text-center text-white'>
      <h1 className='text-3xl font-semibold'>You are offline</h1>
      <p className='text-sm text-zinc-300'>
        Groovv could not reach the network. Reconnect and try again.
      </p>
      <Link
        href='/'
        className='rounded-md bg-gradient-to-br from-pink-500 via-red-500 to-orange-500 px-4 py-2 text-sm font-medium text-white'
      >
        Back to Home
      </Link>
    </main>
  );
}
