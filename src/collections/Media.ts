import type { CollectionConfig } from 'payload'
import { anyone, isEditor } from '../access/roles'

export const Media: CollectionConfig = {
  slug: 'media',
  labels: { singular: 'Imagine', plural: 'Imagini' },
  access: {
    read: anyone,
    create: isEditor,
    update: isEditor,
    delete: isEditor,
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      label: 'Text alternativ (SEO)',
    },
  ],
  upload: {
    imageSizes: [
      { name: 'thumbnail', width: 400, height: 300, position: 'centre' },
      { name: 'card', width: 900 },
      { name: 'hero', width: 1920 },
    ],
    mimeTypes: ['image/*'],
  },
}
