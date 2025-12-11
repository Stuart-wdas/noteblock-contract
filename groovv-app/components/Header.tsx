import {useWallet} from '@/providers/StarknetProvider';
import Image from 'next/image';
import Auth from './Auth/Auth';

export function Header() {
  const {address, disconnectWallet} = useWallet();
  return (
    <header className=" flex justify-between items-center ">
      <h1 className="text-3xl font-bold">Library</h1>
      {address == '' ? (
        <Auth />
      ) : (
        <Image
          alt="Groovv Logo"
          src="/logo.svg"
          width={200}
          height={200}
          className="size-10 rounded-full"
          onClick={() => disconnectWallet()}
        />
      )}
    </header>
  );
}
