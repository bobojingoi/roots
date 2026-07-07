import type { Access } from 'payload'

/* Admin: acces total. Client Roots ("client"): editează conținut + media. */
export const isAdmin: Access = ({ req }) => Boolean(req.user?.roles?.includes('admin'))

export const isEditor: Access = ({ req }) =>
  Boolean(req.user?.roles?.some((r: string) => r === 'admin' || r === 'client'))

export const anyone: Access = () => true
