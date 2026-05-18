declare namespace Express {
  interface User {
    id: string;
    email?: string;
    role_id?: string | null;
  }
}
