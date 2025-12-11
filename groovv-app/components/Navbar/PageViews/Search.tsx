'use client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAudioPlayer } from '@/providers/AudioPlayerProvider';
import { Search } from 'lucide-react';
import { useState } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';

export default function SearchComp() {
  const [searchTerm, setSearchTerm] = useState('');
  const [realm, setRealm] = useState<string | 'library' | 'marketplace'>(
    'library'
  );
  const { libraryView } = useAudioPlayer();

  const filteredPlaylists = libraryView?.partitioned.playlists.filter(
    (playlist) => playlist.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSearchMarket = async () => {
    if (searchTerm == '') return;
    const results = await axios.get(
      `/api/search?q=${searchTerm.trimEnd().trimStart()}`
    );
    console.log(results);
  };

  const handleSearchLibrary = async () => {
    const library = async () =>
      libraryView?.flattened.find((value) => value.toString() == searchTerm);
  };

  https: return (
    <div className='grid grid-cols-1 gap-6 py-6 z-[999]'>
      <div className='w-full flex items-center gap-2'>
        <Input
          className='w-full rounded-full'
          placeholder='Search for your library'
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <Search
          onClick={() =>
            realm == 'library' ? handleSearchLibrary() : handleSearchMarket()
          }
        />
      </div>
      <div className='relative grid grid-cols-1 gap-2'>
        <motion.div
          layout
          initial={false}
          animate={{
            x: realm === 'library' ? 0 : '100%',
          }}
          transition={{
            type: 'spring',
            stiffness: 200,
            damping: 20,
          }}
          className='absolute rounded-md flex items-center justify-center w-1/2'
        >
          <Button
            className=' text-white w-full bg-gradient-to-br from-pink-500 via-red-500 to-orange-500'
            onClick={() =>
              setRealm(realm === 'marketplace' ? 'library' : 'marketplace')
            }
          >
            {realm.slice(0, 1).toLocaleUpperCase() + realm.slice(1)}
          </Button>
        </motion.div>
        <div className='flex w-min '>
          <Button
            className='w-full bg-transparent'
            onClick={() => setRealm('library')}
          >
            Library
          </Button>
          <Button
            className='w-full bg-transparent'
            onClick={() => setRealm('marketplace')}
          >
            Marketplace
          </Button>
        </div>
      </div>
    </div>
  );
}
