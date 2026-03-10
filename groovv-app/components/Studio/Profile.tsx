'use client';

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import { updateUser } from '@/actions/userActions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useWallet } from '@/providers/StarknetProvider';
import { useQueryClient } from '@tanstack/react-query';
import { FileImage, Save, UserRound } from 'lucide-react';

const MAX_AVATAR_SIZE_BYTES = 10 * 1024 * 1024;
const MAX_BIO_LENGTH = 220;
const FALLBACK_AVATAR = '/logo.svg';

type LibraryUser = {
  contractAddress: string;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
};

export default function Profile() {
  const { address, library, isLibraryLoading } = useWallet();
  const queryClient = useQueryClient();

  const user = useMemo(() => {
    if (!library || library === false || typeof library !== 'object')
      return null;
    return (library as { user?: LibraryUser }).user ?? null;
  }, [library]);

  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarPreview, setAvatarPreview] = useState(FALLBACK_AVATAR);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [status, setStatus] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const resetToLibraryValues = (sourceUser: LibraryUser | null) => {
    setDisplayName(sourceUser?.displayName ?? '');
    setBio(sourceUser?.bio ?? '');
    setAvatarFile(null);
    setAvatarPreview(sourceUser?.avatarUrl || FALLBACK_AVATAR);
  };

  useEffect(() => {
    resetToLibraryValues(user);
  }, [user?.avatarUrl, user?.bio, user?.contractAddress, user?.displayName]);

  useEffect(() => {
    return () => {
      if (avatarPreview.startsWith('blob:')) {
        URL.revokeObjectURL(avatarPreview);
      }
    };
  }, [avatarPreview]);

  const initialDisplayName = user?.displayName ?? '';
  const initialBio = user?.bio ?? '';

  const hasUnsavedChanges =
    displayName.trim() !== initialDisplayName.trim() ||
    bio !== initialBio ||
    Boolean(avatarFile);

  const uploadAvatar = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/studio/upload/cover', {
      method: 'POST',
      body: formData,
    });

    const payload = (await response.json()) as { url?: string; error?: string };

    if (!response.ok || !payload.url) {
      throw new Error(payload.error || 'Avatar upload failed');
    }

    return payload.url;
  };

  const onAvatarChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    if (!file) {
      setAvatarFile(null);
      setAvatarPreview(user?.avatarUrl || FALLBACK_AVATAR);
      return;
    }

    if (!file.type.startsWith('image/')) {
      setStatus('Avatar must be an image file.');
      return;
    }

    if (file.size > MAX_AVATAR_SIZE_BYTES) {
      setStatus('Avatar image must be smaller than 10MB.');
      return;
    }

    setStatus('');
    setAvatarFile(file);
    setAvatarPreview((previous) => {
      if (previous.startsWith('blob:')) {
        URL.revokeObjectURL(previous);
      }
      return URL.createObjectURL(file);
    });
  };

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!address) {
      setStatus('Connect a wallet to edit your profile.');
      return;
    }

    if (!user) {
      setStatus('Profile not found for this wallet. Create an account first.');
      return;
    }

    setIsSaving(true);
    setStatus('Saving profile...');

    try {
      let nextAvatarUrl = user.avatarUrl ?? undefined;
      if (avatarFile) {
        nextAvatarUrl = await uploadAvatar(avatarFile);
      }

      const updatedUser = await updateUser(address, {
        displayName: displayName.trim(),
        bio: bio.trim(),
        avatarUrl: nextAvatarUrl,
      });

      if (!updatedUser) {
        throw new Error('Profile update failed');
      }

      setStatus('Profile updated.');
      setAvatarFile(null);
      setAvatarPreview(updatedUser.avatarUrl || FALLBACK_AVATAR);
      setDisplayName(updatedUser.displayName ?? '');
      setBio(updatedUser.bio ?? '');
      await queryClient.invalidateQueries({
        queryKey: ['userLibrary', address],
      });
    } catch (error) {
      console.error(error);
      setStatus('Unable to save profile right now.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!address) {
    return (
      <section className='pt-4'>
        <div className='rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4 text-sm text-zinc-400'>
          Connect your wallet to manage your profile.
        </div>
      </section>
    );
  }

  if (isLibraryLoading) {
    return (
      <section className='pt-4'>
        <div className='rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4 text-sm text-zinc-400'>
          Loading profile...
        </div>
      </section>
    );
  }

  if (!user) {
    return (
      <section className='pt-4'>
        <div className='rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4 text-sm text-zinc-400'>
          No profile exists for this wallet yet. Create an account and come
          back.
        </div>
      </section>
    );
  }

  return (
    <form className='w-full space-y-4 pt-4 pb-8 mb-10' onSubmit={handleSave}>
      <section className='rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4'>
        <p className='text-xs tracking-[0.25em] text-zinc-400 uppercase'>
          Profile
        </p>
        <h2 className='text-2xl font-semibold text-white'>Manage Identity</h2>
        <div className='mt-4 flex items-center gap-4'>
          <img
            src={avatarPreview}
            alt='Profile avatar preview'
            className='h-20 w-20 rounded-full border border-zinc-700 object-cover'
          />
          <div className='min-w-0 flex-1'>
            <Label htmlFor='profile-avatar' className='mb-2 text-zinc-300'>
              <FileImage className='h-4 w-4 text-orange-400' />
              Profile Picture
            </Label>
            <Input
              id='profile-avatar'
              type='file'
              accept='image/png,image/jpeg,image/webp,image/gif'
              onChange={onAvatarChange}
            />
            <p className='mt-1 text-xs text-zinc-500'>
              PNG, JPG, WEBP, GIF up to 10MB
            </p>
          </div>
        </div>
      </section>

      <section className='rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4 space-y-3'>
        <Field label='Display Name' htmlFor='profile-display-name'>
          <Input
            id='profile-display-name'
            value={displayName}
            maxLength={40}
            onChange={(event) => setDisplayName(event.target.value)}
            placeholder='Your artist name'
          />
        </Field>

        <Field label='Bio' htmlFor='profile-bio'>
          <textarea
            id='profile-bio'
            value={bio}
            maxLength={MAX_BIO_LENGTH}
            onChange={(event) => setBio(event.target.value)}
            placeholder='Tell listeners about your sound and style.'
            className='border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 min-h-28 w-full rounded-md border bg-transparent px-3 py-2 text-sm text-white shadow-xs outline-none transition-[color,box-shadow] focus-visible:ring-[3px]'
          />
        </Field>

        <div className='flex items-center justify-between text-xs text-zinc-500'>
          <p className='flex items-center gap-1 break-all'>
            <UserRound className='h-3.5 w-3.5 text-orange-400' />
            {user.contractAddress}
          </p>
          <p>
            {bio.length}/{MAX_BIO_LENGTH}
          </p>
        </div>

        <div className='flex flex-col gap-2 sm:flex-row sm:justify-end'>
          <Button
            type='button'
            variant='outline'
            className='sm:w-auto'
            onClick={() => resetToLibraryValues(user)}
            disabled={isSaving || !hasUnsavedChanges}
          >
            Reset
          </Button>
          <Button
            type='submit'
            className='sm:w-auto bg-gradient-to-br from-pink-500 via-red-500 to-orange-500 text-white'
            disabled={isSaving || !hasUnsavedChanges}
          >
            <Save className='h-4 w-4' />
            {isSaving ? 'Saving...' : 'Save Profile'}
          </Button>
        </div>
      </section>

      <div className='rounded-xl border border-zinc-800 bg-zinc-950/60 p-3 text-sm text-zinc-300'>
        {status || 'Edit your profile details, then save to apply changes.'}
      </div>
    </form>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className='space-y-1'>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}
