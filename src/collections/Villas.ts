import type { CollectionConfig } from 'payload'
import { anyone, isAdmin, isEditor } from '../access/roles'

/* O vilă = cardul din home + pagina dedicată + pagina de welcome. */
export const Villas: CollectionConfig = {
  slug: 'villas',
  labels: { singular: 'Vilă', plural: 'Vile' },
  admin: { useAsTitle: 'name', defaultColumns: ['name', 'slug'] },
  access: { read: anyone, create: isAdmin, update: isEditor, delete: isAdmin },
  fields: [
    { name: 'name', type: 'text', required: true, label: 'Nume' },
    { name: 'slug', type: 'text', required: true, unique: true, admin: { description: 'ex: redwood, sequoia (folosit în URL)' } },
    { name: 'smoobuId', type: 'text', label: 'ID apartament Smoobu' },
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Card (pagina principală)',
          fields: [
            { name: 'tagline', type: 'text', localized: true },
            { name: 'description', type: 'textarea', localized: true },
            { name: 'features', type: 'array', localized: true, labels: { singular: 'Facilitate', plural: 'Facilități' }, fields: [{ name: 'text', type: 'text' }] },
            { name: 'cardImage', type: 'upload', relationTo: 'media', label: 'Imagine card' },
          ],
        },
        {
          label: 'Pagina vilei',
          fields: [
            { name: 'heroSubtitle', type: 'textarea', localized: true },
            { name: 'heroImage', type: 'upload', relationTo: 'media' },
            { name: 'phoneLabel', type: 'text', label: 'Nume la telefon (hero)' },
            {
              name: 'galleryExterior', type: 'array', labels: { singular: 'Poză', plural: 'Galerie exterior' },
              fields: [
                { name: 'image', type: 'upload', relationTo: 'media' },
                { name: 'caption', type: 'text', localized: true },
              ],
            },
            {
              name: 'galleryInterior', type: 'array', labels: { singular: 'Poză', plural: 'Galerie interior' },
              fields: [
                { name: 'image', type: 'upload', relationTo: 'media' },
                { name: 'caption', type: 'text', localized: true },
              ],
            },
            {
              name: 'facilities', type: 'array', labels: { singular: 'Categorie', plural: 'Facilități (pe categorii)' },
              fields: [
                { name: 'category', type: 'text', localized: true },
                {
                  name: 'items', type: 'array',
                  fields: [
                    { name: 'title', type: 'text', localized: true },
                    { name: 'subtitle', type: 'text', localized: true },
                  ],
                },
              ],
            },
            {
              name: 'policies', type: 'array', labels: { singular: 'Coloană', plural: 'Politici (Alte informații utile)' },
              fields: [
                { name: 'title', type: 'text', localized: true },
                { name: 'items', type: 'array', localized: true, fields: [{ name: 'text', type: 'text' }] },
              ],
            },
            { name: 'mapEmbed', type: 'text', label: 'URL hartă (embed)' },
          ],
        },
        {
          label: 'Welcome (instrucțiuni oaspeți)',
          fields: [
            { name: 'welcomeAddress', type: 'text', label: 'Adresă' },
            { name: 'welcomeMapsUrl', type: 'text', label: 'Link Google Maps' },
            { name: 'wifiName', type: 'text', label: 'Rețea WiFi' },
            { name: 'wifiPassword', type: 'text', label: 'Parolă WiFi' },
            { name: 'keybox', type: 'text', label: 'Cod cutie chei' },
            { name: 'welcomeHeroImage', type: 'upload', relationTo: 'media' },
            {
              name: 'welcomeSections', type: 'array', labels: { singular: 'Secțiune', plural: 'Secțiuni instrucțiuni' },
              fields: [
                { name: 'title', type: 'text', localized: true },
                { name: 'lines', type: 'array', localized: true, fields: [{ name: 'text', type: 'text' }] },
              ],
            },
            {
              name: 'directions', type: 'array', labels: { singular: 'Buton', plural: 'Butoane direcții (Waze)' },
              fields: [
                { name: 'label', type: 'text', localized: true },
                { name: 'url', type: 'text', label: 'Link Waze' },
              ],
            },
          ],
        },
        {
          label: 'SEO',
          fields: [
            { name: 'seoTitle', type: 'text', localized: true },
            { name: 'seoDescription', type: 'textarea', localized: true },
            { name: 'ogImage', type: 'upload', relationTo: 'media' },
          ],
        },
      ],
    },
  ],
}
