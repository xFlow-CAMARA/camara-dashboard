import 'next-auth';

declare module 'next-auth' {
  interface User {
    roles?: string[];
    accessToken?: string;
    refreshToken?: string;
  }
  interface Session {
    accessToken?: string;
    user?: {
      name?: string | null;
      email?: string | null;
      image?: string | null;
      roles?: string[];
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: number;
    roles?: string[];
  }
}
