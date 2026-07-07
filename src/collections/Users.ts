import type { CollectionConfig } from 'payload'

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'email',
  },
  auth: true,
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
