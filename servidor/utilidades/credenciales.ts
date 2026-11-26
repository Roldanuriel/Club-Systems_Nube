import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import type { WriteResult, DatabaseRow } from '../tipos/base-de-datos';
import type { H3Event } from 'h3';
import { db, transaction } from './conexion';
export type TokenType = 'SESSION' | 'REFRESH' | 'RESET' | 'CSRF';
interface TokenRow extends DatabaseRow {
  id: number;
  user_id: number;
  token: string;
  expires_at: Date;
  activo: number;
}
const digest = (value: string) => {
  const pepper = String(useRuntimeConfig().tokenPepper || '');
  return createHash('sha256').update(`${value}:${pepper}`).digest('hex');
};
export async function issueToken(userId: number, type: TokenType, lifetimeSeconds: number, event?: H3Event) {
  const selector = randomBytes(16).toString('hex');
  const secret = randomBytes(32).toString('base64url');
  const tokenHash = digest(secret);
  if (!Number.isSafeInteger(lifetimeSeconds) || lifetimeSeconds <= 0) throw new Error('Duración de token inválida');
  const ip = event ? getRequestIP(event, {
    xForwardedFor: true
  }) || null : null;
  const userAgent = event ? getHeader(event, 'user-agent') || null : null;
  return transaction(async connection => {
    const [clock] = await connection.query<DatabaseRow[]>('SELECT EXTRACT(EPOCH FROM CURRENT_TIMESTAMP) * 1000 AS now_ms');
    const serverNow = new Date(Number(clock[0]!.now_ms));
    const expiresAt = new Date(serverNow.getTime() + lifetimeSeconds * 1000);
    // El instante se convierte a la zona de la sesión PostgreSQL antes de guardarlo.
    const [result] = await connection.execute<WriteResult>(`INSERT INTO tokens (token, selector, user_id, tipo, expires_at, activo, ip, user_agent)
       VALUES (?, ?, ?, ?, to_timestamp(? / 1000.0), 1, ?, ?)`, [tokenHash, selector, userId, type, expiresAt.getTime(), ip, userAgent]);
    return { id: result.insertId, value: `${selector}.${secret}`, expiresAt, serverNow };
  });
}
export async function validateToken(value: string, type: TokenType) {
  const [selector, secret] = value.split('.', 2);
  if (!selector || !secret) return null;
  const [rows] = await db().execute<TokenRow[]>(`SELECT id, user_id, token, expires_at, activo
       FROM tokens
      WHERE selector = ? AND tipo = ? AND activo = 1 AND expires_at > NOW()
      LIMIT 1`, [selector, type]);
  const row = rows[0];
  if (!row) return null;
  const expected = Buffer.from(row.token, 'hex');
  const actual = Buffer.from(digest(secret), 'hex');
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
  return row;
}
export async function revokeToken(value: string, type: TokenType) {
  const [selector] = value.split('.', 1);
  if (!selector) return;
  await db().execute('UPDATE tokens SET activo = 0 WHERE selector = ? AND tipo = ?', [selector, type]);
}
