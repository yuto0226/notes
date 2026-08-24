import { glob } from 'astro/loaders'
import { defineCollection, z } from 'astro:content'

const notes = defineCollection({
  loader: glob({
    pattern: '**/*.{md,mdx}',
    base: './src/content/notes',
    // The default id generator slugifies each path segment and strips the
    // dot out of multi-dot filenames, which silently collapses translation
    // siblings like `<id>.en.md` into `<id>en`. Only strip the extension
    // here instead — but that alone loses the default generator's other
    // behavior of dropping a trailing `index` segment (`dir/index.md` -> id
    // `dir`), which parent-note and series lookups rely on, so reproduce it.
    generateId: ({ entry }) => {
      const id = entry.replace(/\.(md|mdx)$/, '')
      return id.endsWith('/index') ? id.slice(0, -'/index'.length) : id
    },
  }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      description: z.string(),
      date: z.coerce.date(),
      updated: z.coerce.date().optional(),
      order: z.number().optional(),
      image: image().optional(),
      categories: z.array(z.string()).optional(),
      tags: z.array(z.string()).optional(),
      authors: z.array(z.string()).optional(),
      draft: z.boolean().optional(),
      pinned: z.boolean().optional().default(false),
    }),
})

const essays = defineCollection({
  loader: glob({
    pattern: '**/*.{md,mdx}',
    base: './src/content/essays',
    // See the notes collection above: preserves the dot in translation
    // sibling ids while still dropping a trailing `index` segment so
    // `dir/index.md` gets id `dir`, matching Astro's default behavior.
    generateId: ({ entry }) => {
      const id = entry.replace(/\.(md|mdx)$/, '')
      return id.endsWith('/index') ? id.slice(0, -'/index'.length) : id
    },
  }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      description: z.string(),
      date: z.coerce.date(),
      updated: z.coerce.date().optional(),
      image: image().optional(),
      tags: z.array(z.string()).optional(),
      authors: z.array(z.string()).optional(),
      draft: z.boolean().optional(),
    }),
})

const authors = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/authors' }),
  schema: z.object({
    name: z.string(),
    pronouns: z.string().optional(),
    avatar: z.string().url().or(z.string().startsWith('/')),
    bio: z.string().optional(),
    mail: z.string().email().optional(),
    website: z.string().url().optional(),
    twitter: z.string().url().optional(),
    instagram: z.string().url().optional(),
    github: z.string().url().optional(),
    linkedin: z.string().url().optional(),
    discord: z.string().url().optional(),
  }),
})

const friends = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/friends' }),
  schema: z.object({
    name: z.string(),
    pronouns: z.string().optional(),
    avatar: z.string().url().or(z.string().startsWith('/')),
    bio: z.string().optional(),
    tags: z.array(z.string()).optional(),
    mail: z.string().email().optional(),
    website: z.string().url().optional(),
    twitter: z.string().url().optional(),
    instagram: z.string().url().optional(),
    github: z.string().url().optional(),
    linkedin: z.string().url().optional(),
    discord: z.string().url().optional(),
  }),
})

const projects = defineCollection({
  loader: glob({
    pattern: '**/*.{md,mdx}',
    base: './src/content/projects',
    // The default id generator slugifies each path segment and strips the
    // dot out of multi-dot filenames, which silently collapses translation
    // siblings like `<id>.en.md` into `<id>en`. Keep the dot so the id
    // stays `<id>.en`, matching getProjectTranslation()'s lookup.
    generateId: ({ entry }) => entry.replace(/\.(md|mdx)$/, ''),
  }),
  schema: ({ image }) =>
    z.object({
      name: z.string(),
      description: z.string(),
      tags: z.array(z.string()),
      image: image().optional(),
      link: z.string().url(),
      startDate: z.coerce.date().optional(),
      endDate: z.coerce.date().optional(),
    }),
})

const milestones = defineCollection({
  loader: glob({
    pattern: '**/*.{md,mdx}',
    base: './src/content/milestones',
    // The default id generator slugifies each path segment and strips the
    // dot out of multi-dot filenames, which silently collapses translation
    // siblings like `<id>.en.md` into `<id>en`. Keep the dot so the id
    // stays `<id>.en`, matching getMilestoneTranslation()'s lookup.
    generateId: ({ entry }) => entry.replace(/\.(md|mdx)$/, ''),
  }),
  schema: z.object({
    title: z.string(),
    startDate: z.string(),
    endDate: z.string().optional(),
    isOngoing: z.boolean().optional().default(false),
    organization: z.string().optional(),
    role: z.string().optional(),
    draft: z.boolean().optional().default(false),
  }),
})

export const collections = {
  notes,
  essays,
  authors,
  friends,
  projects,
  milestones,
}
