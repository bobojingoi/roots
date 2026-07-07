import type { CollectionConfig } from 'payload'
import { isAdmin } from '../access/roles'

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'email',
  },
  auth: true,
  access: {
    // doar Admin gestionează utilizatorii; fiecare își poate vedea/edita propriul cont
    create: isAdmin,
    delete: isAdmin,
    read: ({ req }) =>
      req.user?.roles?.includes('admin') ? true : { id: { equals: req.user?.id } },
    update: ({ req }) =>
      req.user?.roles?.includes('admin') ? true : { id: { equals: req.user?.id } },
  },
  fields: [
    {
      name: 'name',
      type: 'text',
    },
    {
      name: 'roles',
      type: 'select',
      hasMany: true,
      required: true,
      defaultValue: ['client'],
      access: {
        // doar Admin poate schimba rolurile
        update: ({ req }) => Boolean(req.user?.roles?.includes('admin')),
      },
      options: [
        { label: 'Admin', value: 'admin' },
        { label: 'Client Roots', value: 'client' },
      ],
      admin: {
        description: 'Admin: acces total. Client Roots: editează conținutul.',
      },
    },
  ],
}
