import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

const isDebugEnabled = process.env.DEBUG === "true";

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: "Acceso Demo",
      credentials: {
        email: { label: "Usuario", type: "text", placeholder: "demo@fidu.com" },
        password: { label: "Contraseña", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const users = [
          { id: "1", name: "Analista Contable", email: "analista@dis.com.co", role: "ANALISTA_CONTABLE", password: "SecureAnalista2026*" },
          { id: "2", name: "Gerente de Fideicomiso", email: "gerente@dis.com.co", role: "GERENTE_FIDEICOMISO", password: "SecureGerente2026*" },
          { id: "3", name: "Administrador DIS", email: "admin@dis.com.co", role: "ADMIN", password: "SecureAdmin2026*" },
          { id: "4", name: "Monica Abogado", email: "monica.abogado@accion.co", role: "GERENTE_FIDEICOMISO", password: "SecureMonica2026*" },
          { id: "5", name: "Cliente Demo", email: "demo@fidu.com", role: "GERENTE_FIDEICOMISO", password: "fidu2026" }
        ];

        const user = users.find(u => u.email === credentials.email && u.password === credentials.password);
        
        if (user) {
          // Return user object without the password
          return { id: user.id, name: user.name, email: user.email, role: user.role };
        }
        
        return null;
      }
    })
  ],
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session?.user) {
        (session.user as any).role = token.role;
      }
      return session;
    }
  },
  debug: isDebugEnabled,
  secret: process.env.NEXTAUTH_SECRET || "fidu-conciliation-super-secret-key-2026",
});

export { handler as GET, handler as POST };
