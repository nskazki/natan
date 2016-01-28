'use strict'


import { resolve, extname, dirname, basename } from 'path'
import { chain, _, isString, pick, values, escapeRegExp, isEqual } from 'lodash'
import { readdirSync, statSync } from 'fs'
import chalk from 'chalk'
import commander from 'commander'
import natan from './'

let resolveDir = chain(resolve)
  .ary(2)
  .partial(process.cwd(), _)
  .value()

let opts = commander
  .usage('[options]')
  .option('-d, --dir <path>', 'set configs dir path.', resolveDir)
  .parse(process.argv)

if (!isString(opts.dir))
  commander.help()

function findSubdirs(path) {
  let subdirs = readdirSync(path)
    .map(el => resolve(path, el))
    .filter(el => statSync(el).isDirectory())

  return subdirs.length === 0
    ? subdirs
    : subdirs
      .map(path => findSubdirs(path))
      .reduce((acc, el) => acc.concat(el), [])
      .concat(subdirs)
}

function findFiles(dirs) {
  return dirs
    .map(path => readdirSync(path)
        .map(el => resolve(path, el))
        .filter(el => statSync(el).isFile()))
    .reduce((acc, el) => acc.concat(el), [])
}

let dirs = [ opts.dir, ...findSubdirs(opts.dir) ]
let files = findFiles(dirs)

function extractDepFiles(path) {
  try {
    return chain(path)
      .thru(f => require(f))
      .thru(c => pick(c, '__default__', '__local__'))
      .thru(c => values(c))
      .map(d => resolve(dirname(path), d))
      .flatten()
      .value()
  } catch (err) {
    console.info(`${chalk.red('✗')} ${short(path)}`)
    console.info('\t%s', err.toString().split('\r').join('\r\t'))
    return [ path ]
  }
}

let depFiles = files
  .map(f => extractDepFiles(f))
  .reduce((acc, el) => acc.concat(el), [])

let configFiles = files
  .filter(f => files.every(o => !isEqual(
    `${dirname(o)}/${filename(o)}.local`,
    `${dirname(f)}/${filename(f)}`)))
  .filter(f => !isEqual(
    `${dirname(f)}/default${extname(f)}`,
    f))
  .filter(f => depFiles.every(d => !isEqual(
    `${dirname(d)}/${filename(d)}`,
    `${dirname(f)}/${filename(f)}`)))

configFiles.forEach(path => {
  try {
    natan(path)
    console.info(`${chalk.green('✓')} ${short(path)}`)
  } catch (err) {
    console.info(`${chalk.red('✗')} ${short(path)}`)
    console.info('\t%s', err.toString().split('\r').join('\r\t'))
  }
})

// helpers

function short(p) {
  return p.replace(`${process.cwd()}/`, '')
}

function filename(path) {
  let base = basename(path)

  let ext = extname(base)
  let extRegExp = new RegExp(escapeRegExp(ext) + '$')
  return base.replace(extRegExp, '')
}
