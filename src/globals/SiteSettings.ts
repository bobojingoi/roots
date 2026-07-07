import type { GlobalConfig } from 'payload'
import { anyone, isEditor } from '../access/roles'

export const SiteSettings: GlobalConfig = {
  slug: 'site-settings',
  label: 'Setări site',
  access: { read: anyone, update: isEditor },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Contact & Social',
          fields: [
            { name: 'phone', type: 'text', label: 'Telefon' },
            { name: 'whatsapp', type: 'text', label: 'WhatsApp (număr)' },
            { name: 'email', type: 'text' },
            { name: 'instagram', type: 'text', label: 'Instagram (URL)' },
            { name: 'tiktok', type: 'text', label: 'TikTok (URL)' },
          ],
        },
        {
          label: 'Rezervare',
          fields: [
            { name: 'depositPct', type: 'number', label: 'Avans (%)', defaultValue: 30 },
            { name: 'capacity', type: 'number', label: 'Capacitate maximă / vilă', defaultValue: 10 },
          ],
        },
      ],
    },
  ],
}
