'use client';

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useWallet } from '@/providers/StarknetProvider';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, FileImage, Save, ScrollText, Settings2, UserRound } from 'lucide-react';
import { motion } from 'framer-motion';
import { ONBOARDING_GENRES, parseStoredGenres } from '@/lib/profile/genres';

const MAX_AVATAR_SIZE_BYTES = 10 * 1024 * 1024;
const MAX_BIO_LENGTH = 220;
const FALLBACK_AVATAR = '/logo.svg';

type LibraryUser = {
  contractAddress: string;
  displayName: string | null;
  email?: string | null;
  avatarUrl: string | null;
  bio: string | null;
};

type LibraryPreferences = {
  likedGenres?: string | null;
};

function formatDate(value: string) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
}

function txExplorerLink(txHash?: string | null) {
  if (!txHash) return null;
  const base =
    process.env.NEXT_PUBLIC_STARKSCAN_TX_BASE_URL?.trim() ||
    'https://sepolia.starkscan.co/tx/';
  return `${base.replace(/\/+$/, '')}/${txHash}`;
}

const settingLabels: Record<string, string> = {
  notifyPurchaseConfirmed: 'Purchase confirmations',
  notifyListingSold: 'Listing sold',
  notifyListingCreated: 'Listing created',
  notifyListingRemoved: 'Listing removed',
  notifySongMinted: 'Song minted',
  notifyAlbumCreated: 'Album created',
  browserNotifications: 'Browser notifications',
};

export default function Profile() {
  const { address, library, isLibraryLoading } = useWallet();
  const queryClient = useQueryClient();

  const user = useMemo(() => {
    if (!library || library === false || typeof library !== 'object') return null;
    return (library as { user?: LibraryUser }).user ?? null;
  }, [library]);
  const profilePreferences = useMemo(() => {
    if (!library || library === false || typeof library !== 'object') return null;
    return (library as { preferences?: LibraryPreferences }).preferences ?? null;
  }, [library]);

  const [activeTab, setActiveTab] = useState('identity');
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [avatarPreview, setAvatarPreview] = useState(FALLBACK_AVATAR);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [status, setStatus] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [txFilter, setTxFilter] = useState<'purchase' | 'sale' | 'all'>('purchase');
  const [selectedTxId, setSelectedTxId] = useState('');
  const [txOpen, setTxOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [settingsDraft, setSettingsDraft] = useState<Record<string, boolean>>(
    {},
  );
  const [settingsStatus, setSettingsStatus] = useState('');
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const media = window.matchMedia('(max-width: 767px)');
    const sync = () => setIsMobile(media.matches);
    sync();
    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', sync);
      return () => media.removeEventListener('change', sync);
    }
    media.addListener(sync);
    return () => media.removeListener(sync);
  }, []);

  useEffect(() => {
    setDisplayName(user?.displayName ?? '');
    setBio(user?.bio ?? '');
    setAvatarFile(null);
    setAvatarPreview(user?.avatarUrl || FALLBACK_AVATAR);
  }, [user?.avatarUrl, user?.bio, user?.displayName]);

  const initialGenres = useMemo(
    () => parseStoredGenres(profilePreferences?.likedGenres),
    [profilePreferences?.likedGenres],
  );

  useEffect(() => {
    setSelectedGenres(initialGenres);
  }, [initialGenres]);

  const { data: transactions, isLoading: txLoading } = useQuery({
    queryKey: ['profileTransactions', address, txFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ userId: address!, limit: '150' });
      if (txFilter !== 'all') params.set('direction', txFilter);
      const res = await fetch(`/api/profile/transactions?${params.toString()}`, {
        cache: 'no-store',
      });
      const payload = (await res.json()) as { transactions?: any[] };
      return payload.transactions ?? [];
    },
    enabled: Boolean(address),
  });

  const { data: txDetail, isLoading: txDetailLoading } = useQuery({
    queryKey: ['profileTransactionDetail', address, selectedTxId],
    queryFn: async () => {
      const res = await fetch(
        `/api/profile/transactions/${encodeURIComponent(selectedTxId)}?userId=${encodeURIComponent(address!)}`,
        { cache: 'no-store' },
      );
      return (await res.json()) as { transaction?: any };
    },
    enabled: Boolean(address && selectedTxId && txOpen),
  });

  const { data: notifications, isLoading: notificationsLoading } = useQuery({
    queryKey: ['profileNotifications', address],
    queryFn: async () => {
      const res = await fetch(
        `/api/profile/notifications?userId=${encodeURIComponent(address!)}&limit=120`,
        { cache: 'no-store' },
      );
      const payload = (await res.json()) as { notifications?: any[] };
      return payload.notifications ?? [];
    },
    enabled: Boolean(address),
  });

  const { data: notificationSettings } = useQuery({
    queryKey: ['profileNotificationSettings', address],
    queryFn: async () => {
      const res = await fetch(
        `/api/profile/settings/notifications?userId=${encodeURIComponent(address!)}`,
        { cache: 'no-store' },
      );
      const payload = (await res.json()) as { settings?: Record<string, any> };
      return payload.settings ?? null;
    },
    enabled: Boolean(address),
  });

  useEffect(() => {
    if (!notificationSettings) return;
    setSettingsDraft({
      notifyPurchaseConfirmed: !!notificationSettings.notifyPurchaseConfirmed,
      notifyListingSold: !!notificationSettings.notifyListingSold,
      notifyListingCreated: !!notificationSettings.notifyListingCreated,
      notifyListingRemoved: !!notificationSettings.notifyListingRemoved,
      notifySongMinted: !!notificationSettings.notifySongMinted,
      notifyAlbumCreated: !!notificationSettings.notifyAlbumCreated,
      browserNotifications: !!notificationSettings.browserNotifications,
    });
  }, [notificationSettings]);

  const hasMatchingGenres = useMemo(() => {
    const next = [...selectedGenres].sort();
    const current = [...initialGenres].sort();
    if (next.length !== current.length) return false;
    return next.every((value, index) => value === current[index]);
  }, [initialGenres, selectedGenres]);

  const unreadCount = (notifications ?? []).filter((n) => !n.isRead).length;
  const hasUnsavedChanges =
    (displayName.trim() !== (user?.displayName ?? '').trim()) ||
    bio !== (user?.bio ?? '') ||
    !hasMatchingGenres ||
    Boolean(avatarFile);
  const isSetupIncomplete =
    !displayName.trim() || selectedGenres.length === 0;

  const onAvatarChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    if (!file) {
      setAvatarFile(null);
      setAvatarPreview(user?.avatarUrl || FALLBACK_AVATAR);
      return;
    }
    if (!file.type.startsWith('image/')) return setStatus('Avatar must be an image file.');
    if (file.size > MAX_AVATAR_SIZE_BYTES) return setStatus('Avatar image must be smaller than 10MB.');
    setStatus('');
    setAvatarFile(file);
    setAvatarPreview((prev) => {
      if (prev.startsWith('blob:')) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
  };

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!address || !user) return;
    setIsSaving(true);
    setStatus('Saving profile...');
    try {
      let nextAvatarUrl = user.avatarUrl ?? undefined;
      if (avatarFile) {
        const formData = new FormData();
        formData.append('file', avatarFile);
        const uploadRes = await fetch('/api/studio/upload/cover', { method: 'POST', body: formData });
        const uploadPayload = (await uploadRes.json()) as { url?: string; error?: string };
        if (!uploadRes.ok || !uploadPayload.url) throw new Error(uploadPayload.error || 'Avatar upload failed');
        nextAvatarUrl = uploadPayload.url;
      }
      const updateRes = await fetch('/api/profile/setup', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: address,
          displayName: displayName.trim(),
          bio: bio.trim(),
          avatarUrl: nextAvatarUrl,
          likedGenres: selectedGenres,
        }),
      });
      const updatePayload = (await updateRes.json()) as { error?: string };
      if (!updateRes.ok) {
        throw new Error(updatePayload.error || 'Failed to update profile setup');
      }
      setStatus('Profile updated.');
      setAvatarFile(null);
      await queryClient.invalidateQueries({ queryKey: ['userLibrary', address] });
    } catch (error) {
      console.error(error);
      setStatus('Unable to save profile right now.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!address) return <section className='pt-4'><div className='rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4 text-sm text-zinc-400'>Connect your wallet to manage your profile.</div></section>;
  if (isLibraryLoading) return <section className='pt-4'><div className='rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4 text-sm text-zinc-400'>Loading profile...</div></section>;
  if (!user) return <section className='pt-4'><div className='rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4 text-sm text-zinc-400'>No profile exists for this wallet yet.</div></section>;

  return (
    <div className='w-full space-y-4 pt-4 pb-8 mb-10'>
      <Tabs value={activeTab} onValueChange={setActiveTab} className='w-full'>
        <TabsList className='grid h-auto w-full grid-cols-4 gap-2 rounded-2xl border border-white/10 bg-black/30 p-1.5'>
          <ProfileTabItem
            value='identity'
            icon={<UserRound className='h-4 w-4' color='white' />}
            label='Identity'
            isActive={activeTab === 'identity'}
          />
          <ProfileTabItem
            value='transactions'
            icon={<ScrollText className='h-4 w-4' color='white' />}
            label='Transactions'
            isActive={activeTab === 'transactions'}
          />
          <ProfileTabItem
            value='notifications'
            icon={<Bell className='h-4 w-4' color='white' />}
            label={`Alerts${unreadCount > 0 ? ` (${unreadCount})` : ''}`}
            isActive={activeTab === 'notifications'}
          />
          <ProfileTabItem
            value='settings'
            icon={<Settings2 className='h-4 w-4' color='white' />}
            label='Settings'
            isActive={activeTab === 'settings'}
          />
        </TabsList>

        <TabsContent value='identity' className='mt-3'>
          <form className='space-y-4' onSubmit={handleSave}>
            {isSetupIncomplete ? (
              <section className='rounded-2xl border border-orange-500/40 bg-orange-500/10 p-4'>
                <p className='text-sm font-semibold text-orange-200'>Complete your profile setup</p>
                <p className='mt-1 text-xs text-orange-100/80'>
                  Add your profile details and choose favorite genres so recommendations can be tuned to your taste.
                </p>
              </section>
            ) : null}
            <section className='rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4'>
              <div className='mt-1 flex items-center gap-4'>
                <img
                  src={avatarPreview}
                  alt='Profile avatar preview'
                  className='h-20 w-20 rounded-full border border-zinc-700 object-cover'
                />
                <div className='min-w-0 flex-1'>
                  <Label
                    htmlFor='profile-avatar'
                    className='mb-2 text-zinc-300'
                  >
                    <FileImage className='h-4 w-4 text-orange-400' />
                    Profile Picture
                  </Label>
                  <Input
                    id='profile-avatar'
                    type='file'
                    accept='image/png,image/jpeg,image/webp,image/gif'
                    onChange={onAvatarChange}
                  />
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
                />
              </Field>
              <Field label='Bio' htmlFor='profile-bio'>
                <textarea
                  id='profile-bio'
                  value={bio}
                  maxLength={MAX_BIO_LENGTH}
                  onChange={(event) => setBio(event.target.value)}
                  className='min-h-28 w-full rounded-md border bg-transparent px-3 py-2 text-sm text-white'
                />
              </Field>
              <Field label='Favorite Genres' htmlFor='profile-genres'>
                <div
                  id='profile-genres'
                  className='grid grid-cols-2 gap-2 sm:grid-cols-3'
                >
                  {ONBOARDING_GENRES.map((genre) => {
                    const active = selectedGenres.includes(genre);
                    return (
                      <button
                        key={genre}
                        type='button'
                        onClick={() =>
                          setSelectedGenres((current) =>
                            current.includes(genre)
                              ? current.filter((entry) => entry !== genre)
                              : [...current, genre],
                          )
                        }
                        className={`rounded-md border px-2 py-1.5 text-xs transition ${
                          active
                            ? 'border-orange-400/70 bg-orange-500/20 text-orange-100'
                            : 'border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-zinc-500'
                        }`}
                      >
                        {genre}
                      </button>
                    );
                  })}
                </div>
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
                  onClick={() => {
                    setDisplayName(user.displayName ?? '');
                    setBio(user.bio ?? '');
                    setSelectedGenres(initialGenres);
                    setAvatarPreview(user.avatarUrl || FALLBACK_AVATAR);
                    setAvatarFile(null);
                  }}
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
          </form>
          <div className='mt-3 rounded-xl border border-zinc-800 bg-zinc-950/60 p-3 text-sm text-zinc-300'>
            {status || 'Edit your profile details, then save to apply changes.'}
          </div>
        </TabsContent>

        <TabsContent value='transactions' className='mt-3'>
          <section className='rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4 space-y-3'>
            <div className='flex gap-2'>
              <Button
                type='button'
                variant={txFilter === 'purchase' ? 'default' : 'outline'}
                className='h-8 sm:w-auto'
                onClick={() => setTxFilter('purchase')}
              >
                Purchases
              </Button>
              <Button
                type='button'
                variant={txFilter === 'sale' ? 'default' : 'outline'}
                className='h-8 sm:w-auto'
                onClick={() => setTxFilter('sale')}
              >
                Sales
              </Button>
              <Button
                type='button'
                variant={txFilter === 'all' ? 'default' : 'outline'}
                className='h-8 sm:w-auto'
                onClick={() => setTxFilter('all')}
              >
                All
              </Button>
            </div>
            {txLoading ? (
              <p className='text-sm text-zinc-400'>Loading transactions...</p>
            ) : !transactions?.length ? (
              <p className='text-sm text-zinc-400'>No transactions found.</p>
            ) : (
              <div className='space-y-2'>
                {transactions.map((tx: any) => (
                  <button
                    key={tx.id}
                    type='button'
                    onClick={() => {
                      setSelectedTxId(tx.id);
                      setTxOpen(true);
                    }}
                    className='w-full rounded-lg border border-zinc-800 bg-black/40 p-3 text-left hover:border-orange-400/40'
                  >
                    <p className='text-sm font-semibold text-white truncate'>
                      {tx.song?.title || 'Unknown song'}
                    </p>
                    <p className='text-xs text-zinc-400'>
                      {tx.direction} | {formatDate(tx.createdAt)}
                    </p>
                    <p className='text-xs text-zinc-500'>
                      Total: {tx.totalAmount}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </section>
        </TabsContent>

        <TabsContent value='notifications' className='mt-3'>
          <section className='rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4 space-y-3'>
            <div className='flex justify-end'>
              <Button
                type='button'
                variant='outline'
                className='h-8 sm:w-auto'
                onClick={async () => {
                  await fetch('/api/profile/notifications', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      userId: address,
                      markAllRead: true,
                    }),
                  });
                  await Promise.all([
                    queryClient.invalidateQueries({
                      queryKey: ['profileNotifications', address],
                    }),
                    queryClient.invalidateQueries({
                      queryKey: ['unreadNotifications', address],
                    }),
                  ]);
                }}
                disabled={unreadCount === 0}
              >
                Mark all read
              </Button>
            </div>
            {notificationsLoading ? (
              <p className='text-sm text-zinc-400'>Loading notifications...</p>
            ) : !notifications?.length ? (
              <p className='text-sm text-zinc-400'>No notifications yet.</p>
            ) : (
              <div className='space-y-2'>
                {notifications.map((item: any) => (
                  <div
                    key={item.id}
                    className={`rounded-lg border p-3 ${item.isRead ? 'border-zinc-800 bg-black/30' : 'border-orange-500/40 bg-orange-500/10'}`}
                  >
                    <div className='flex items-start justify-between gap-3'>
                      <div className='min-w-0'>
                        <p className='text-sm font-semibold text-white'>
                          {item.title}
                        </p>
                        <p className='text-xs text-zinc-300 mt-1'>
                          {item.message}
                        </p>
                        <p className='text-[11px] text-zinc-500 mt-1'>
                          {formatDate(item.createdAt)}
                        </p>
                      </div>
                      {!item.isRead ? (
                        <Button
                          type='button'
                          variant='outline'
                          className='h-8 sm:w-auto'
                          onClick={async () => {
                            await fetch('/api/profile/notifications', {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                userId: address,
                                ids: [item.id],
                              }),
                            });
                            await Promise.all([
                              queryClient.invalidateQueries({
                                queryKey: ['profileNotifications', address],
                              }),
                              queryClient.invalidateQueries({
                                queryKey: ['unreadNotifications', address],
                              }),
                            ]);
                          }}
                        >
                          Mark read
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </TabsContent>

        <TabsContent value='settings' className='mt-3'>
          <section className='rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4 space-y-3'>
            {Object.keys(settingsDraft).length === 0 ? (
              <p className='text-sm text-zinc-400'>Loading settings...</p>
            ) : (
              <div className='space-y-2'>
                {Object.entries(settingsDraft).map(([key, value]) => (
                  <label
                    key={key}
                    className='flex items-center justify-between rounded-md border border-zinc-800 bg-black/30 px-3 py-2 text-sm text-zinc-200'
                  >
                    <span>{settingLabels[key] || key}</span>
                    <input
                      type='checkbox'
                      checked={value}
                      onChange={(event) =>
                        setSettingsDraft((prev) => ({
                          ...prev,
                          [key]: event.target.checked,
                        }))
                      }
                      className='h-4 w-4 accent-orange-400'
                    />
                  </label>
                ))}
              </div>
            )}
            <div className='flex flex-col gap-2 sm:flex-row sm:justify-end'>
              <Button
                type='button'
                variant='outline'
                className='sm:w-auto'
                onClick={async () => {
                  if (
                    typeof window !== 'undefined' &&
                    'Notification' in window
                  ) {
                    const permission = await Notification.requestPermission();
                    setSettingsStatus(
                      `Browser notification permission is ${permission}.`,
                    );
                  } else {
                    setSettingsStatus(
                      'Browser notifications are not supported.',
                    );
                  }
                }}
              >
                Browser Permission
              </Button>
              <Button
                type='button'
                className='sm:w-auto bg-gradient-to-br from-pink-500 via-red-500 to-orange-500 text-white'
                disabled={
                  isSavingSettings || Object.keys(settingsDraft).length === 0
                }
                onClick={async () => {
                  setIsSavingSettings(true);
                  setSettingsStatus('Saving settings...');
                  try {
                    await fetch('/api/profile/settings/notifications', {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        userId: address,
                        settings: settingsDraft,
                      }),
                    });
                    setSettingsStatus('Settings saved.');
                    await Promise.all([
                      queryClient.invalidateQueries({
                        queryKey: ['profileNotificationSettings', address],
                      }),
                      queryClient.invalidateQueries({
                        queryKey: ['notificationSettings', address],
                      }),
                    ]);
                  } catch (error) {
                    console.error(error);
                    setSettingsStatus('Failed to save settings.');
                  } finally {
                    setIsSavingSettings(false);
                  }
                }}
              >
                {isSavingSettings ? 'Saving...' : 'Save Settings'}
              </Button>
            </div>
          </section>
          <div className='rounded-xl border border-zinc-800 bg-zinc-950/60 p-3 text-sm text-zinc-300'>
            {settingsStatus ||
              'Control which confirmed chain events generate notifications.'}
          </div>
        </TabsContent>
      </Tabs>

      {isMobile ? (
        <Drawer open={txOpen} onOpenChange={setTxOpen}>
          <DrawerContent className='mx-auto w-full max-w-2xl border-zinc-700/80 bg-zinc-950/95 text-white'>
            <DrawerHeader>
              <DrawerTitle>Transaction Details</DrawerTitle>
              <DrawerDescription>Confirmed on-chain details</DrawerDescription>
            </DrawerHeader>
            <TxDetailsBody
              detail={txDetail?.transaction}
              loading={txDetailLoading}
            />
          </DrawerContent>
        </Drawer>
      ) : (
        <Sheet open={txOpen} onOpenChange={setTxOpen}>
          <SheetContent
            side='right'
            className='w-full border-zinc-700/80 bg-zinc-950/95 p-0 text-white sm:max-w-xl'
          >
            <SheetHeader className='border-b border-zinc-800 px-5 py-4'>
              <SheetTitle>Transaction Details</SheetTitle>
              <SheetDescription>Confirmed on-chain details</SheetDescription>
            </SheetHeader>
            <div className='h-[calc(100vh-84px)] overflow-y-auto'>
              <TxDetailsBody
                detail={txDetail?.transaction}
                loading={txDetailLoading}
              />
            </div>
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode; }) {
  return <div className='space-y-1'><Label htmlFor={htmlFor}>{label}</Label>{children}</div>;
}

function ProfileTabItem({
  value,
  icon,
  label,
  isActive,
}: {
  value: string;
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
}) {
  return (
    <TabsTrigger
      value={value}
      className='relative z-20 flex w-full flex-row place-content-center place-items-center overflow-hidden rounded-xl bg-transparent py-2 text-xs transition data-[state=active]:bg-transparent'
    >
      {isActive ? (
        <motion.span
          layoutId='profile-inner-active-tab'
          className='absolute inset-0 rounded-xl bg-linear-to-br from-cyan-500 via-sky-500 to-emerald-500'
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        />
      ) : null}
      <span className='relative z-10'>{icon}</span>
      <span className='relative z-10 hidden pl-1 text-white font-bold sm:inline'>
        {label}
      </span>
    </TabsTrigger>
  );
}

function TxDetailsBody({ detail, loading }: { detail: any; loading: boolean }) {
  if (loading) return <div className='px-5 py-4 text-sm text-zinc-400'>Loading transaction details...</div>;
  if (!detail) return <div className='px-5 py-4 text-sm text-zinc-400'>No transaction selected.</div>;

  return (
    <div className='space-y-3 px-5 py-4 text-sm'>
      <div className='rounded-lg border border-zinc-800 bg-black/40 p-3'>
        <p className='text-zinc-300'>Direction: {detail.direction}</p>
        <p className='text-zinc-300'>Status: {detail.status}</p>
        <p className='text-zinc-300'>Event: {detail.eventType}</p>
        <p className='text-zinc-300'>Listing: {detail.listingId || 'n/a'}</p>
        <p className='text-zinc-300'>Counterparty: {detail.counterparty || 'n/a'}</p>
        <p className='text-zinc-300'>Copies: {detail.copies}</p>
        <p className='text-zinc-300'>Unit Price: {detail.unitPrice}</p>
        <p className='text-zinc-300'>Total: {detail.totalAmount}</p>
        <p className='text-zinc-300'>Block: {detail.blockNumber ?? 'n/a'}</p>
        <p className='text-zinc-300'>Created: {formatDate(detail.createdAt)}</p>
      </div>
      {detail.song ? (
        <div className='rounded-lg border border-zinc-800 bg-black/40 p-3'>
          <p className='font-semibold text-white'>{detail.song.title}</p>
          <p className='text-xs text-zinc-400'>{detail.song.artist}</p>
        </div>
      ) : null}
      {detail.txHash ? (
        <div className='rounded-lg border border-zinc-800 bg-black/40 p-3'>
          <p className='text-zinc-300 break-all'>{detail.txHash}</p>
          {txExplorerLink(detail.txHash) ? (
            <a href={txExplorerLink(detail.txHash)!} target='_blank' rel='noreferrer' className='mt-1 inline-block text-xs text-orange-300 hover:text-orange-200'>View on Starkscan</a>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
