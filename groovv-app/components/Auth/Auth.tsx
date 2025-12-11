'use client';

import {useState} from 'react';
import {motion, AnimatePresence} from 'framer-motion';
import {Button} from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import ConnectWallet from '../Buttons/ConnectWallet';
import {Input} from '../ui/input';
import {useWallet} from '@/providers/StarknetProvider';
import Image from 'next/image';
import {createUser} from '@/actions/userActions';

export default function Auth() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [username, setUsername] = useState('');
  const {connectWallet} = useWallet();

  async function createAccount(address: string) {
    console.log(
      'Creating account with username:',
      username,
      'and address:',
      address
    );
    await createUser({contractAddress: address, displayName: username});
  }

  return (
    <Dialog modal={false}>
      <DialogTrigger asChild>
        <Button
          className="relative z-10 px-6 py-3 font-bold text-white rounded-xl bg-linear-to-r from-pink-500 via-purple-500 to-indigo-500 
               shadow-xl transition-all duration-300 ease-in-out 
               hover:scale-105 hover:rotate-1 hover:shadow-2xl 
                text-xs">
          {mode === 'signin' ? 'Sign In' : 'Sign Up'}
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[425px] overflow-hidden  px-0 bg-accent ">
        <DialogHeader>
          <DialogTitle>{mode === 'signin' ? 'Sign In' : 'Sign Up'}</DialogTitle>
          <div className="flex place-content-center items-center flex-col">
            <Image
              src="./logo.svg"
              alt="Groovv Logo"
              width={200}
              height={200}
              className="size-20"
            />
            <DialogDescription>
              <span>play - listen - trade</span>
            </DialogDescription>
          </div>
          <div>
            {mode === 'signin'
              ? 'Sign in to continue to Groovv'
              : 'To create an account, pick a username and connect your wallet!'}
          </div>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {mode === 'signin' ? (
            <motion.div
              key="signin"
              initial={{opacity: 0, x: -100}}
              animate={{opacity: 1, x: 0}}
              exit={{opacity: 0, x: 100}}
              transition={{duration: 0.4, ease: 'easeInOut'}}
              className="space-y-4">
              {/* Replace with your actual Sign In form */}
              <div className="px-6">
                <ConnectWallet />
              </div>
              <DialogFooter className="border-t-2 pt-6 px-6">
                <Button
                  variant="outline"
                  className="text-white bg-linear-to-br from-pink-500 via-red-500 to-orange-500 shadow-xl hover:text-white "
                  onClick={() => setMode('signup')}>
                  Need an account? Sign Up
                </Button>
              </DialogFooter>
            </motion.div>
          ) : (
            <motion.div
              key="signup"
              initial={{opacity: 0, x: 100}}
              animate={{opacity: 1, x: 0}}
              exit={{opacity: 0, x: -100}}
              transition={{duration: 0.4, ease: 'easeInOut'}}
              className="space-y-4">
              <div className="px-6 flex flex-col gap-4">
                {/* Replace with your actual Sign Up form */}
                {
                  <form>
                    <div className="flex flex-col">
                      <Input
                        placeholder="Username"
                        onChange={(e) => setUsername(e.target.value)}
                        value={username}
                      />
                    </div>
                  </form>
                }
                <Button
                  variant="outline"
                  className="text-white bg-linear-to-br from-pink-500 via-red-500 to-orange-500 shadow-xl hover:text-white rounded-xl"
                  onClick={async () => {
                    try {
                      const address = await connectWallet();
                      // if connectWallet resolves successfully, invoke createAccount
                      // If your connectWallet returns a value indicating success, you can
                      // check it here (e.g. result?.success). Otherwise assume resolution = success.
                      await createAccount(address!);
                    } catch (err) {
                      console.error('Wallet connection failed', err);
                    }
                  }}>
                  Create Account
                </Button>
              </div>

              <DialogFooter className="border-t-2 pt-6 px-6">
                <Button
                  variant="outline"
                  className="text-white hover:text-white bg-linear-to-br from-indigo-500 via-purple-500 to-pink-500 shadow-lg hover:scale-[1.03] hover:shadow-xl active:scale-[0.98]"
                  onClick={() => setMode('signin')}>
                  Already have an account? Sign In
                </Button>
              </DialogFooter>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
