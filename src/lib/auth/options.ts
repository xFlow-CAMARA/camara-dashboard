import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';

const APP_ENV = process.env.APP_ENV || 'dev';

/** Read an env var that may have a dev fallback. Throws in non-dev environments. */
function required(name: string, devDefault: string): string {
  const v = process.env[name];
  if (v) return v;
  if (APP_ENV === 'dev') return devDefault;
  throw new Error(`${name} env var is required when APP_ENV != 'dev'`);
}

const KEYCLOAK_URL    = process.env.KEYCLOAK_INTERNAL_URL || 'http://keycloak:8080';
const REALM           = process.env.KEYCLOAK_REALM        || 'camara';
const KEYCLOAK_CLIENT = process.env.KEYCLOAK_CLIENT_ID    || 'camara-dashboard-app';
const KEYCLOAK_SECRET = required('KEYCLOAK_CLIENT_SECRET', 'dashboard-secret-2026');
const NEXTAUTH_SECRET = required('NEXTAUTH_SECRET',        'dev-secret-replace-me');

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
        if (!credentials?.username || !credentials?.password) return null;

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
          if (!r.ok) return null;
          const tokenData = await r.json();
          const claims = decodeJwt(tokenData.access_token);
          return {
            id:    claims.preferred_username || credentials.username,
            name:  claims.preferred_username || credentials.username,
            email: claims.email || credentials.username,
            roles: claims.realm_access?.roles ?? [],
          };
        } catch {
          return null;
        }
      },
    }),
  ],
  session: { strategy: 'jwt' },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.roles = user.roles;
        // accessToken/refreshToken from Keycloak deliberately NOT persisted:
        // they expire in minutes and we don't run a refresh loop. Anything
        // that needs a fresh Keycloak token requests one on demand (see the
        // playground's /api/developer/token route).
      }
      return token;
    },
    async session({ session, token }) {
      session.user = {
        ...(session.user ?? {}),
        email: (token.email as string | undefined) ?? session.user?.email,
        roles: (token.roles as string[]) ?? [],
      };
      return session;
    },
  },
  pages: { signIn: '/login' },
  secret: NEXTAUTH_SECRET,
};
