import React from 'react';
import {Button} from '../ui/button';
import {useWallet} from '../../providers/StarknetProvider';

export default function ConnectWallet({disabled}: {disabled?: boolean}) {
  const {connectWallet, address} = useWallet();

  return (
    <Button
      onClick={connectWallet}
      disabled={disabled}
      className="relative z-10 px-6 py-3 font-bold text-white rounded-xl bg-linear-to-r from-pink-500 via-purple-500 to-indigo-500 
               shadow-xl transition-all duration-300 ease-in-out 
               hover:scale-105 hover:rotate-1 hover:shadow-2xl w-full 
                text-xs">
      {address ? `Connected: ${address.slice(0, 6)}...` : 'Connect Wallet'}
    </Button>
  );
}
