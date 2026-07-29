// Shared failed-attempt tracking for room reconnaissance/abuse: both a failed
// join attempt (wrong code, full room, etc.) and a 404 from probing room
// codes via the metadata endpoint feed the same counter and cooldown ladder,
// so guessing codes via GET can't dodge the protection that already exists
// on the join endpoint.
import {
  clearExpiringCounter,
  getExpiringCounter,
  getExpiringCounterTtlMs,
  incrementExpiringCounter,
  setExpiringCounter,
} from './rateLimit';

const FAILED_WINDOW_MS = 15 * 60_000;
const SHORT_COOLDOWN_MS = 30_000;
const LONG_COOLDOWN_MS = 10 * 60_000;
export const CHALLENGE_THRESHOLD = 5;
const SHORT_COOLDOWN_THRESHOLD = 8;
const LONG_COOLDOWN_THRESHOLD = 12;

function failureKey(ip: string): string {
  return `room_join_failed:${ip}`;
}

function cooldownKey(ip: string): string {
  return `room_join_cooldown:${ip}`;
}

export async function getFailedRoomAttemptCount(ip: string): Promise<number> {
  return getExpiringCounter(failureKey(ip));
}

export async function recordFailedRoomAttempt(ip: string): Promise<number> {
  const count = await incrementExpiringCounter(failureKey(ip), FAILED_WINDOW_MS);

  if (count >= LONG_COOLDOWN_THRESHOLD) {
    await setExpiringCounter(cooldownKey(ip), 1, LONG_COOLDOWN_MS);
  } else if (count >= SHORT_COOLDOWN_THRESHOLD) {
    await setExpiringCounter(cooldownKey(ip), 1, SHORT_COOLDOWN_MS);
  }

  return count;
}

export async function getRoomCooldownTtlMs(ip: string): Promise<number> {
  return getExpiringCounterTtlMs(cooldownKey(ip));
}

export async function clearFailedRoomAttempts(ip: string): Promise<void> {
  await Promise.all([clearExpiringCounter(failureKey(ip)), clearExpiringCounter(cooldownKey(ip))]);
}
