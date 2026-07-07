import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { Users } from './collections/Users'
import { Media } from './collections/Media'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

/* Encodează caracterele speciale din parolă (percent-encoding), altfel
   pg respinge connection string-ul ca „Invalid URL". */
function sanitizeDbUri(raw: string): string {
  const uri = (raw || '').trim().replace(/^["']|["']$/g, '')
  const m = uri.match(/^(postgres(?:ql)?:\/\/)([^:@/]+):(.*)@([^@]+)$/)
  if (!m) return uri
  const [, proto, user, pass, rest] = m
  return `${proto}${encodeURIComponent(user)}:${encodeURIComponent(pass)}@${rest}`
}

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [Users, Media],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    pool: {
      connectionString: sanitizeDbUri(process.env.DATABASE_URI || ''),
    },
  }),
  sharp,
  // Multilingv: ro (implicit), en, he (RTL), de, it
  localization: {
    locales: [
      { code: 'ro', label: 'Română' },
      { code: 'en', label: 'English' },
      { code: 'he', label: 'עברית', rtl: true },
      { code: 'de', label: 'Deutsch' },
      { code: 'it', label: 'Italiano' },
    ],
    defaultLocale: 'ro',
    fallback: true,
  },
})
