import { postgresAdapter } from '@payloadcms/db-postgres'
import { s3Storage } from '@payloadcms/storage-s3'
import { en } from '@payloadcms/translations/languages/en'
import { ro } from '@payloadcms/translations/languages/ro'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { Users } from './collections/Users'
import { Media } from './collections/Media'
import { Villas } from './collections/Villas'
import { HomePage } from './globals/HomePage'
import { SiteSettings } from './globals/SiteSettings'

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
    theme: 'light',
    meta: {
      titleSuffix: ' · ROOTS Administrare',
    },
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  i18n: {
    supportedLanguages: { ro, en },
    fallbackLanguage: 'ro',
  },
  collections: [Users, Media, Villas],
  globals: [HomePage, SiteSettings],
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
  plugins: [
    // Imagini pe Supabase Storage (S3) — activ doar când env-urile sunt setate.
    // Local, fără ele, fișierele se salvează pe disc.
    ...(process.env.S3_BUCKET
      ? [
          s3Storage({
            collections: { media: true },
            bucket: process.env.S3_BUCKET,
            config: {
              endpoint: process.env.S3_ENDPOINT || '',
              region: process.env.S3_REGION || 'eu-central-1',
              credentials: {
                accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
                secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
              },
              forcePathStyle: true,
            },
          }),
        ]
      : []),
  ],
})
