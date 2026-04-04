'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bell } from 'lucide-react';
import { useWallet } from '@/providers/StarknetProvider';

type NotificationRow = {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
};

type NotificationSettings = {
  browserNotifications: boolean;
};

async function fetchUnreadNotifications(userId: string) {
  const response = await fetch(
    `/api/profile/notifications?userId=${encodeURIComponent(userId)}&unreadOnly=true&limit=30`,
    { cache: 'no-store' },
  );
  if (!response.ok) {
    throw new Error('Failed to load notifications');
  }

  const payload = (await response.json()) as {
    notifications?: NotificationRow[];
  };

  return Array.isArray(payload.notifications) ? payload.notifications : [];
}

async function fetchNotificationSettings(userId: string) {
  const response = await fetch(
    `/api/profile/settings/notifications?userId=${encodeURIComponent(userId)}`,
    { cache: 'no-store' },
  );
  if (!response.ok) {
    throw new Error('Failed to load notification settings');
  }

  const payload = (await response.json()) as {
    settings?: NotificationSettings;
  };

  return payload.settings ?? { browserNotifications: true };
}

type InAppAlert = {
  id: string;
  title: string;
  message: string;
};

const ALERT_LIFETIME_MS = 7000;
const MAX_ALERTS = 3;

export function NotificationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { address } = useWallet();
  const [alerts, setAlerts] = useState<InAppAlert[]>([]);
  const seenIdsRef = useRef<Set<string>>(new Set());

  const seenStorageKey = useMemo(
    () => (address ? `groovv-seen-notifications:${address.toLowerCase()}` : ''),
    [address],
  );

  useEffect(() => {
    if (!address || typeof window === 'undefined') {
      seenIdsRef.current = new Set();
      return;
    }

    const raw = window.sessionStorage.getItem(seenStorageKey);
    const parsed = raw ? raw.split(',').filter(Boolean) : [];
    seenIdsRef.current = new Set(parsed);
  }, [address, seenStorageKey]);

  const { data: settings } = useQuery({
    queryKey: ['notificationSettings', address],
    queryFn: () => fetchNotificationSettings(address!),
    enabled: Boolean(address),
    staleTime: 60_000,
  });

  const { data: unreadNotifications } = useQuery({
    queryKey: ['unreadNotifications', address],
    queryFn: () => fetchUnreadNotifications(address!),
    enabled: Boolean(address),
    refetchInterval: 12_000,
    staleTime: 8_000,
  });

  useEffect(() => {
    if (!address || !Array.isArray(unreadNotifications)) return;

    const newlySeen: string[] = [];
    const newlyArrived: NotificationRow[] = [];

    for (const notification of unreadNotifications) {
      if (seenIdsRef.current.has(notification.id)) continue;
      seenIdsRef.current.add(notification.id);
      newlySeen.push(notification.id);
      newlyArrived.push(notification);
    }

    if (newlySeen.length > 0 && typeof window !== 'undefined') {
      window.sessionStorage.setItem(
        seenStorageKey,
        Array.from(seenIdsRef.current).join(','),
      );
    }

    if (newlyArrived.length === 0) return;

    setAlerts((current) => {
      const next = [...newlyArrived.map((item) => ({
        id: item.id,
        title: item.title,
        message: item.message,
      })), ...current];
      return next.slice(0, MAX_ALERTS);
    });

    if (
      settings?.browserNotifications &&
      typeof window !== 'undefined' &&
      'Notification' in window &&
      Notification.permission === 'granted'
    ) {
      for (const item of newlyArrived) {
        new Notification(item.title, {
          body: item.message,
        });
      }
    }
  }, [address, unreadNotifications, seenStorageKey, settings?.browserNotifications]);

  useEffect(() => {
    if (alerts.length === 0) return;

    const timers = alerts.map((alert) =>
      window.setTimeout(() => {
        setAlerts((current) => current.filter((item) => item.id !== alert.id));
      }, ALERT_LIFETIME_MS),
    );

    return () => {
      for (const timer of timers) {
        window.clearTimeout(timer);
      }
    };
  }, [alerts]);

  return (
    <>
      {children}
      <div className='pointer-events-none fixed right-4 bottom-16 z-[1200] hidden w-80 max-w-[calc(100vw-2rem)] space-y-2 md:block'>
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className='pointer-events-auto rounded-lg border border-zinc-700 bg-zinc-950/95 p-3 text-zinc-100 shadow-lg'
          >
            <p className='flex items-center gap-2 text-sm font-semibold'>
              <Bell className='h-4 w-4 text-orange-300' />
              {alert.title}
            </p>
            <p className='mt-1 text-xs text-zinc-300'>{alert.message}</p>
          </div>
        ))}
      </div>
    </>
  );
}
