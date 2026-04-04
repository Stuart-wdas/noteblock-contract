import { useWallet } from '@/providers/StarknetProvider';
import Image from 'next/image';
import Auth from './Auth/Auth';

export function Header() {
  const { address, disconnectWallet } = useWallet();
  return (
    <header className='flex items-center justify-between gap-3'>
      <div>
        <p className='text-[11px] uppercase tracking-[0.24em] text-zinc-400'>
          Groovv
        </p>
        <h1 className='text-3xl font-bold tracking-tight md:text-4xl'>
          Library
        </h1>
      </div>
      {address == '' ? (
        <Auth />
      ) : (
        <button
          type='button'
          onClick={() => disconnectWallet()}
          className='group inline-flex items-center gap-2 rounded-fullpx-3 py-2 transition hover:border-orange-400/40 hover:bg-orange-400/10'
        >
          <Image
            alt='Groovv Logo'
            src='/logo.svg'
            width={40}
            height={40}
            className='size-8 rounded-full'
          />
        </button>
      )}
    </header>
  );
}
