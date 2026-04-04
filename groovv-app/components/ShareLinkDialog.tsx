'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type ShareEntityType = 'song' | 'album';

export default function ShareLinkDialog({
  open,
  onOpenChange,
  entityType,
  entityId,
  entityTitle,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityType: ShareEntityType;
  entityId: string;
  entityTitle: string;
}) {
  const [origin, setOrigin] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    if (!open) setCopied(false);
  }, [open]);

  const sharePath = useMemo(() => {
    const params = new URLSearchParams();
    params.set(entityType === 'song' ? 'songId' : 'albumId', entityId);
    return `/?${params.toString()}`;
  }, [entityId, entityType]);

  const shareLink = useMemo(() => {
    if (!origin) return sharePath;
    return `${origin}${sharePath}`;
  }, [origin, sharePath]);

  const copyWithFallback = () => {
    const temporaryInput = document.createElement('input');
    temporaryInput.value = shareLink;
    temporaryInput.setAttribute('readonly', '');
    temporaryInput.style.position = 'absolute';
    temporaryInput.style.left = '-9999px';
    document.body.appendChild(temporaryInput);
    temporaryInput.select();
    const wasCopied = document.execCommand('copy');
    document.body.removeChild(temporaryInput);
    return wasCopied;
  };

  const handleCopy = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareLink);
        setCopied(true);
        return;
      }
    } catch {}

    if (copyWithFallback()) setCopied(true);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='border-zinc-700 z-1000 bg-zinc-900 text-white sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>Share {entityType}</DialogTitle>
          <DialogDescription className='text-zinc-300'>
            Copy this link to share{' '}
            <span className='font-medium text-white'>{entityTitle}</span>.
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-3'>
          <Input
            readOnly
            value={shareLink}
            onFocus={(event) => event.currentTarget.select()}
            className='border-zinc-700 bg-zinc-950 text-white'
          />
          <Button
            type='button'
            onClick={handleCopy}
            className='w-full bg-white text-black hover:bg-zinc-200'
          >
            {copied ? (
              <>
                <Check size={16} />
                Copied
              </>
            ) : (
              <>
                <Copy size={16} />
                Copy Link
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
