// Prints the APP_CHANGELOG entry for the package.json version as Markdown, for the GitHub release body.
// Run with: node --experimental-strip-types build/release-notes.mjs
import { readFile } from 'fs/promises'
import { join } from 'path'
import { APP_CHANGELOG, formatChangelogMarkdown } from '../src/shared/appChangelog.ts'

const { version } = JSON.parse(await readFile(join(import.meta.dirname, '..', 'package.json'), 'utf8'))
const entry = APP_CHANGELOG.find((e) => e.version === version)
if (!entry) {
  console.error(`No APP_CHANGELOG entry for ${version}. Add release notes to src/shared/appChangelog.ts first.`)
  process.exit(1)
}

console.log(formatChangelogMarkdown(entry))
