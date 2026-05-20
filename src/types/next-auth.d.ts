import 'next-auth';

declare module 'next-auth' {
  interface User {
    roles?: string[];
  }
  interface Session {
    user?: {
      name?:  string | null;
      email?: string | null;
      image?: string | null;
      roles?: string[];
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    roles?: string[];
  }
}
