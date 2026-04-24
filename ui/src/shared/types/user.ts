export interface User {
  id?: string;
  username: string;
  email: string;
  name: string;
  picture?: string;
  role?: string;
}

export const isAdmin = (user: User | null | undefined): boolean => {
  return user?.role === 'admin';
};
