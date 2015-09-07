'use strict'

import { readFileSync, existsSync, lstatSync } from 'fs'
import {
  isNull, isObject, isArray, isPlainObject, isUndefined, isBoolean, isString,
  get, has, keys, last, map, mapValues, chain,
  omit, merge, cloneDeep, compact, escapeRegExp, trim } from 'lodash'
import { resolve, dirname, extname, basename } from 'path'
import { inspect, format } from 'util'
import humanInterval from 'human-interval'
import debug from 'debug'

let nDebug = debug('natan')

export default function natan(rawNodePath, rawOpt = {}) {
  let opt = new NatanOpt(rawOpt)

  let exts = {
    all: [ '.json', '.js', '.es', '.es6', '.jsx' ],
    exucuts: [ '.js', '.es', '.es6', '.jsx' ],
    configs: [ '.json' ]
  }

  let patterns = {
    local: ':nodeDir/:nodeFile.local',
    default: ':nodeDir/default',
    parent: ':nodeDir/../:nodeFile'
  }

  let configKeys = {
    local: '__local__',
    default: '__default__',
    parent: '__parent__'
  }

  let serviceFields = [
    '__path__', '__parent__',
    '__default__', '__local__' ]

  let settingsParts = opt.useOverlapping
    ? getSettingsParts(rawNodePath, patterns, configKeys, exts)
    : getSettingsWithoutOverlapping(rawNodePath, exts)

  nDebug('\n      settingsParts: \n      %s',
    chain(settingsParts)
      .thru(p => inspect(p, { depth: 1, colors: true }))
      .thru(s => s.replace(/\n/g, '\n      '))
      .value())

  let interpolates = !opt.useInterpolating
    ? s => s
    : s => chain(s)
      .thru(s => interpolateKeys(s))
      .thru(s => interpolateTimes(s))
      .thru(s => interpolatePaths(s))
      .thru(s => interpolateRegExps(s))
      .thru(s => interpolateFunc(s))
      .value()

  return chain(settingsParts)
      .thru(p => merge(...p))
      .thru(s => interpolates(s))
      .thru(s => omit(s, serviceFields))
      .value()
}

class NatanOpt {
  constructor(opt) {
    this.opt = opt
  }
  get useOverlapping() {
    return this.isBool(process.env.NATAN_OVERLAPPING)
      ? this.toBool(process.env.NATAN_OVERLAPPING)
      : this.isBool(this.opt.useOverlapping)
        ? this.toBool(this.opt.useOverlapping)
        : true
  }
  get useInterpolating() {
    return this.isBool(process.env.NATAN_INTERPOLATING)
      ? this.toBool(process.env.NATAN_INTERPOLATING)
      : this.isBool(this.opt.useInterpolating)
        ? this.toBool(this.opt.useInterpolating)
        : true
  }
  isBool(v) {
    if (isBoolean(v)) return true
    if (isString(v) && /^(true|false)$/i.test(trim(v))) return true
    return (!isUndefined(v))
  }
  toBool(v) {
    if (isBoolean(v)) return v
    if (isString(v)) return /true/i.test(v)
    return Boolean(v)
  }
}

// get settings

function getSettingsWithoutOverlapping(rawNodePath, exts) {
  try {
    let nodePath = getExistPath(rawNodePath, exts)
    let nodePart = {}

    if (!isString(nodePath)) {
      throw new Error(`node path not exist: ${rawNodePath}`)
    } else {
      nodePart = getSettingsPart(nodePath, exts)
    }

    nDebug(`
      nodePath:       ${nodePath}`)

    return [ nodePart ]
  } catch (err) {
    err.message += `\r\v\tat node path: ${rawNodePath}`
    throw err
  }
}

function getSettingsParts(rawNodePath, patterns, configKeys, exts) {
  try {
    let nodePath = getExistPath(rawNodePath, exts)
    let nodePart = {}

    if (!isString(nodePath)) {
      throw new Error(`node path not exist: ${rawNodePath}`)
    } else {
      nodePart = getSettingsPart(nodePath, exts)
    }

    let defaultPath = getDependecePath(
      nodePath, nodePart,
      configKeys.default, patterns.default, exts)
    let defaultPart = isString(defaultPath)
      ? getSettingsPart(defaultPath, exts)
      : {}

    let localPath = getDependecePath(
      nodePath, nodePart,
      configKeys.local, patterns.local, exts)
    let localPart = isString(localPath)
      ? getSettingsPart(localPath, exts)
      : {}

    let parentPath = getDependecePath(
      nodePath, nodePart,
      configKeys.parent, patterns.parent, exts)

    nDebug(`
      nodePath:       ${nodePath}
      defaultPath:    ${defaultPath || ''}
      localPath:      ${localPath || ''}
      parentPath:     ${parentPath || ''}`)

    let parts = [ defaultPart, nodePart, localPart ]
    return !isString(parentPath)
      ? parts
      : getSettingsParts(
          parentPath, patterns, configKeys, exts).concat(parts)

  } catch (err) {
    err.message += `\r\v\tat node path: ${rawNodePath}`
    throw err
  }
}

function getSettingsPart(path, exts) {
  try {
    let ext = extname(path)
    let part = exts.exucuts.some(e => e === ext)
      ? require(path)
      : JSON.parse(readFileSync(path))

    part.__path__ = path
    return part
  } catch (err) {
    err.message += `. path: ${path}`
    throw err
  }
}

// get dependence path

function getDependecePath(nodePath, nodePart, key, pattern, exts) {
  let rawPaths = getRawDependecePath(
    nodePath, nodePart, key, pattern)

  if (isString(rawPaths.configuration)) {
    let rawPath = rawPaths.configuration
    let path = getExistPath(rawPath, exts)
    if (!isString(path))
      throw new Error(`${key} path spicify, but file does not exist: ${rawPath}`)
    else
      return path
  }

  if (isString(rawPaths.convention)) {
    let rawPath = rawPaths.convention
    return getExistPath(rawPath, exts)
  }
}

function getRawDependecePath(nodePath, nodePart, key, pattern) {
  let { dir, file } = getPathProps(nodePath)
  let convention = chain(pattern)
    .thru(p => p.replace(':nodeDir', dir))
    .thru(p => p.replace(':nodeFile', file))
    .thru(p => resolve(p))
    .value()

  let configuration = has(nodePart, key)
    ? resolve(dir, get(nodePart, key))
    : undefined

  return { configuration, convention }
}

function getPathProps(path) {
  let dir = dirname(path)
  let base = basename(path)

  let ext = extname(base)
  let extRegExp = new RegExp(escapeRegExp(ext) + '$')
  let file = base.replace(extRegExp, '')

  return { dir, base, file, ext }
}

function getExistPath(path, exts) {
  let rPath = resolve(path)
  let paths = [ rPath, ...exts.all.map(e => rPath + e)]
  return chain(paths)
    .filter(p => fileExist(p))
    .first()
    .value()
}

function fileExist(path) {
  return existsSync(path)
    && lstatSync(path).isFile()
}

// interpolation

function interpolate(settings, type, iRegExp, iReplace, magicConv) {
  let problemKeys = {}
  let newSettings = (function scope(object, ownPath) {
    if (!isPlainObject(object) && !isArray(object))
      return object

    let myMap = isArray(object)
      ? map
      : mapValues

    return myMap(object, function(value, key) {
      let curPath = compact([ownPath, key]).join('.')

      if (isObject(value)) return scope(value, curPath)
      if (!isString(value)) return value

      let raws = matchGlobal(value, iRegExp)
      if (!raws.length) return value

      raws.forEach(function(raw) {
        try {
          let finished = magicConv(key, trim(raw), settings)
          let replaceable = format(iReplace, raw)
          value = !value.replace(replaceable, '').length
            ? finished
            : value.replace(replaceable, finished)
          nDebug(`${type} interpolate ${curPath} success: ${raws}`)
        } catch (err) {
          problemKeys[curPath] = err
          nDebug(`${type} interpolate ${curPath} problem: ${err}`)
        }
      })
      return value
    })
  }(settings))

  if (keys(problemKeys).length) {
    throw new Error(`${type} interpolate problems: ${ inspect(problemKeys) }`)
  } else {
    return newSettings
  }
}

function interpolateKeys(s) {
  let isChanges = false

  let mConv = (key, path, settings) => {
    if (!has(settings, path)) {
      throw new Error(`value not found: ${path}`)
    } else {
      isChanges = true
      return cloneDeep(get(settings, path))
    }
  }

  return (function scope(oldS) {
    isChanges = false
    let newS = interpolate(oldS, 'key', /k{(.+?)}/g, 'k{%s}', mConv)

    return isChanges
      ? scope(newS)
      : newS
  })(s)
}

function interpolateRegExps(s) {
  let mConv = (key, rawRegExp) => new RegExp(rawRegExp)
  return interpolate(s, 'regExp', /r{(.+?)}/g, 'r{%s}', mConv)
}

function interpolateFunc(s) {
  let mConv = (key, funcBody, settings) => {
    var funcWrapper = chain(funcBody)
      .thru(function(funcBody) {
        return /return\s/.test(funcBody)
          ? funcBody
          : `return ${funcBody}`
      })
      .thru(function(funcBody) {
        return /;\s*$/.test(funcBody)
          ? funcBody
          : `${funcBody}; `
      })
      .value()

    var settingsText = JSON.stringify(settings)
    var script = format(`
      (function() {
        ${funcWrapper}
      }.call( ${settingsText} ));`)

    return cloneDeep(eval(script))
  }

  return interpolate(s, 'func', /f{(.+?)}/g, 'f{%s}', mConv)
}

function interpolateTimes(s) {
  let mConv = (key, rawInterval) => humanInterval(rawInterval)
  return interpolate(s, 'time', /t{(.+?)}/g, 't{%s}', mConv)
}

function interpolatePaths(s) {
  let mConv = (key, rawPath) => resolve(process.cwd(), rawPath)
  return interpolate(s, 'path', /p{(.+?)}/g, 'p{%s}', mConv)
}

// helpers

function matchGlobal(body, regexp) {
  let toReturn = []
  let match = regexp.exec(body)
  while (!isNull(match)) {
    toReturn.push(last(match))
    match = regexp.exec(body)
    if (!regexp.global) break
  }
  return toReturn
}
