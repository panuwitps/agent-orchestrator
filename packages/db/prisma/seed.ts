import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const PROVIDERS = [
  {
    slug: 'claude',
    name: 'Claude',
    cliCommand: 'claude',
    supportsSkills: true,
    supportsPlugins: true,
    supportsMcp: true,
    models: [
      { id: 'opus', name: 'Opus', effortLevels: ['low', 'medium', 'high', 'max'] },
      { id: 'sonnet', name: 'Sonnet', effortLevels: ['low', 'medium', 'high', 'max'] },
      { id: 'haiku', name: 'Haiku', effortLevels: ['low', 'medium', 'high'] },
    ],
  },
  {
    slug: 'codex',
    name: 'Codex (ChatGPT)',
    cliCommand: 'codex',
    supportsSkills: false,
    supportsPlugins: false,
    supportsMcp: true,
    models: [
      { id: 'gpt-4.1', name: 'GPT-4.1', effortLevels: ['low', 'medium', 'high'] },
      { id: 'gpt-4o', name: 'GPT-4o', effortLevels: ['low', 'medium'] },
      { id: 'gpt-4o-mini', name: 'GPT-4o mini', effortLevels: ['low'] },
    ],
  },
  {
    slug: 'gemini',
    name: 'Gemini',
    cliCommand: 'gemini',
    supportsSkills: false,
    supportsPlugins: false,
    supportsMcp: true,
    models: [
      { id: '2.0-pro', name: 'Gemini 2.0 Pro', effortLevels: ['low', 'medium', 'high'] },
      { id: '2.0-flash', name: 'Gemini 2.0 Flash', effortLevels: ['low', 'medium'] },
    ],
  },
]

async function main() {
  for (const p of PROVIDERS) {
    await prisma.provider.upsert({
      where: { slug: p.slug },
      update: {
        name: p.name,
        cliCommand: p.cliCommand,
        supportsSkills: p.supportsSkills,
        supportsPlugins: p.supportsPlugins,
        supportsMcp: p.supportsMcp,
        models: p.models,
      },
      create: p,
    })
  }
  const count = await prisma.provider.count()
  console.log(`Seeded ${count} providers`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
