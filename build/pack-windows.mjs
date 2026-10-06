import { spawnSync } from 'child_process'
import { readFile } from 'fs/promises'
import { join } from 'path'

const root = join(import.meta.dirname, '..')
const packDir = join(root, 'dist', 'win-unpacked')
const { version } = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'))
const productName = 'Jailbreak Changelogs'

const args = [
  'pack',
  '--packId', 'com.jailbreakchangelogs.desktop',
  '--packVersion', version,
  '--packDir', packDir,
  '--mainExe', `${productName}.exe`,
  '--packTitle', productName,
  '--packAuthors', 'Jailbreak Changelogs',
  '--icon', join(root, 'build', 'icon.ico'),
  '--splashImage', join(root, 'build', 'install-spinner.gif'),
  '--outputDir', join(root, 'dist'),
  '--runtime', 'win-x64',
  '--aumid', 'com.jailbreakchangelogs.desktop',
  '-y'
]

const result = spawnSync('vpk', args, { stdio: 'inherit' })
if (result.status !== 0) {
  console.error(`vpk pack failed (exit ${result.status})`)
  process.exit(result.status ?? 1)
}
