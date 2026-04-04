import { getCurrentSessionUser } from './session';

export type AuthGuardResult =
  | {
      ok: true;
      userId: string;
      user: Awaited<ReturnType<typeof getCurrentSessionUser>>;
    }
  | {
      ok: false;
      status: number;
      error: string;
    };

export async function guardUserAccess(
  requestedUserId?: string | null,
): Promise<AuthGuardResult> {
  const sessionUser = await getCurrentSessionUser();
  if (!sessionUser) {
    return {
      ok: false,
      status: 401,
      error: 'Unauthorized',
    };
  }

  const sessionUserId = sessionUser.contractAddress.toLowerCase();
  const normalizedRequested = requestedUserId?.trim().toLowerCase();

  if (normalizedRequested && normalizedRequested !== sessionUserId) {
    return {
      ok: false,
      status: 403,
      error: 'Forbidden',
    };
  }

  return {
    ok: true,
    userId: sessionUserId,
    user: sessionUser,
  };
}

