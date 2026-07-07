import type { GlobalConfig } from 'payload'
import { anyone, isEditor } from '../access/roles'

const textList = (name: string, label: string) => ({
  name,
  label,
  type: 'array' as const,
  localized: true,
  fields: [{ name: 'text', type: 'text' as const }],
})

export const HomePage: GlobalConfig = {
  slug: 'home',
  label: 'Pagina principală',
  access: { read: anyone, update: isEditor },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Hero',
          fields: [
            { name: 'heroEyebrow', type: 'text', localized: true },
            { name: 'heroTitleA', type: 'text', localized: true, label: 'Titlu — linia 1' },
            { name: 'heroTitleB', type: 'text', localized: true, label: 'Titlu — linia 2 (aurie)' },
            { name: 'heroSubtitle', type: 'textarea', localized: true },
            { name: 'heroCtaPrimary', type: 'text', localized: true },
            { name: 'heroCtaSecondary', type: 'text', localized: true },
            { name: 'heroImage', type: 'upload', relationTo: 'media' },
          ],
        },
        {
          label: 'Despre',
          fields: [
            { name: 'aboutTitle', type: 'text', localized: true },
            { name: 'aboutText1', type: 'textarea', localized: true },
            { name: 'aboutText2', type: 'textarea', localized: true },
          ],
        },
        {
          label: 'Editorial',
          fields: [
            {
              name: 'editorial', type: 'array', labels: { singular: 'Bloc', plural: 'Blocuri editoriale' },
              fields: [
                { name: 'title', type: 'text', localized: true },
                textList('paragraphs', 'Paragrafe'),
              ],
            },
          ],
        },
        {
          label: 'Spații comune',
          fields: [
            { name: 'commonTitle', type: 'text', localized: true },
            { name: 'commonText', type: 'textarea', localized: true },
            textList('commonFeatures', 'Facilități comune'),
            { name: 'commonImage', type: 'upload', relationTo: 'media' },
          ],
        },
        {
          label: 'Reguli',
          fields: [
            { name: 'rulesTitle', type: 'text', localized: true },
            { name: 'rulesIntro', type: 'textarea', localized: true },
            textList('rules', 'Reguli'),
          ],
        },
        {
          label: 'Testimoniale',
          fields: [
            { name: 'testimonialsTitle', type: 'text', localized: true },
            { name: 'testimonialsIntro', type: 'textarea', localized: true },
            { name: 'rating', type: 'text' },
            {
              name: 'testimonials', type: 'array',
              fields: [
                { name: 'name', type: 'text' },
                { name: 'text', type: 'textarea', localized: true },
                { name: 'stay', type: 'text', localized: true },
              ],
            },
          ],
        },
        {
          label: 'Video',
          fields: [
            { name: 'videoTitle', type: 'text', localized: true },
            { name: 'videoText', type: 'textarea', localized: true },
            { name: 'videoLabel', type: 'text' },
            { name: 'youtubeUrl', type: 'text' },
          ],
        },
        {
          label: 'FAQ',
          fields: [
            {
              name: 'faq', type: 'array', labels: { singular: 'Întrebare', plural: 'Întrebări' },
              fields: [
                { name: 'category', type: 'text', localized: true },
                { name: 'question', type: 'text', localized: true },
                { name: 'answer', type: 'textarea', localized: true },
              ],
            },
          ],
        },
        {
          label: 'Locație',
          fields: [
            { name: 'locationTitle', type: 'text', localized: true },
            { name: 'locationText', type: 'textarea', localized: true },
            { name: 'mapsUrl', type: 'text' },
            {
              name: 'locationPoints', type: 'array', labels: { singular: 'Reper', plural: 'Repere (distanțe)' },
              fields: [
                { name: 'label', type: 'text', localized: true },
                { name: 'value', type: 'text' },
              ],
            },
          ],
        },
        {
          label: 'Recomandări (welcome)',
          fields: [
            {
              name: 'recommendations', type: 'array', labels: { singular: 'Categorie', plural: 'Categorii recomandări' },
              fields: [
                { name: 'category', type: 'text', localized: true },
                {
                  name: 'items', type: 'array',
                  fields: [
                    { name: 'name', type: 'text' },
                    { name: 'wazeUrl', type: 'text', label: 'Link Waze (sau gol)' },
                    { name: 'phone', type: 'text', label: 'Telefon (opțional)' },
                  ],
                },
              ],
            },
          ],
        },
        {
          label: 'SEO',
          fields: [
            { name: 'seoTitle', type: 'text', localized: true },
            { name: 'seoDescription', type: 'textarea', localized: true },
            { name: 'seoKeywords', type: 'textarea', localized: true },
            { name: 'ogImage', type: 'upload', relationTo: 'media' },
          ],
        },
      ],
    },
  ],
}
