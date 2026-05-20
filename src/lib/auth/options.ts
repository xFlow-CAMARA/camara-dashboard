import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';

const KEYCLOAK_URL    = process.env.KEYCLOAK_INTERNAL_URL || 'http://keycloak:8080';
const REALM           = process.env.KEYCLOAK_REALM        || 'camara';
const KEYCLOAK_CLIENT = process.env.KEYCLOAK_CLIENT_ID    || 'camara-dashboard-app';
const KEYCLOAK_SECRET = process.env.KEYCLOAK_CLIENT_SECRET || 'dashboard-secret-2026';

interface KeycloakAccessTokenPayload {
  realm_access?: { roles?: string[] };
  email?: string;
  preferred_username?: string;
}

function decodeJwt(token: string): KeycloakAccessTokenPayload {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(Buffer.from(payload, 'base64').toString('utf8'));
  } catch {
    return {};
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Keycloak',
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          console.log('[auth] missing username/password');
          return null;
        }
        console.log('[auth] authorize start', credentials.username);

        const body = new URLSearchParams({
          grant_type:    'password',
          client_id:     KEYCLOAK_CLIENT,
          client_secret: KEYCLOAK_SECRET,
          username:      credentials.username,
          password:      credentials.password,
        });

        try {
          const r = await fetch(`${KEYCLOAK_URL}/realms/${REALM}/protocol/openid-connect/token`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body,
          });
          if (!r.ok) {
            const text = await r.text();
            console.log('[auth] keycloak rejected:', r.status, text);
            return null;
          }
          const tokenData = await r.json();
          const claims = decodeJwt(tokenData.access_token);
          console.log('[auth] success roles=', claims.realm_access?.roles);
          return {
            id:           claims.preferred_username || credentials.username,
            name:         claims.preferred_username || credentials.username,
            email:        claims.email || credentials.username,
            roles:        claims.realm_access?.roles ?? [],
            accessToken:  tokenData.access_token,
            refreshToken: tokenData.refresh_token,
          } as never;
        } catch (e) {
          console.log('[auth] exception:', e);
          return null;
        }
      },
    }),
  ],
  session: { strategy: 'jwt' },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const u = user as unknown as { roles?: string[]; accessToken?: string; refreshToken?: string };
        token.roles        = u.roles;
        token.accessToken  = u.accessToken;
        token.refreshToken = u.refreshToken;
      }
      return token;
    },
    async session({ session, token }) {
      session.user = {
        ...(session.user ?? {}),
        email: (token.email as string | undefined) ?? session.user?.email,
        roles: (token.roles as string[]) ?? [],
      };
      session.accessToken = token.accessToken as string | undefined;
      return session;
    },
  },
  pages: { signIn: '/login' },
  secret: process.env.NEXTAUTH_SECRET || 'dev-secret-replace-me',
};
