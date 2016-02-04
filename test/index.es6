'use strict'

import { resolve } from 'path'
import assert from 'power-assert'
import natan from '..'

let c = (...args) => resolve(...[ process.cwd(), ...args ])
let d = (...args) => resolve(...[ __dirname, ...args ])

describe('overlapping-enabled', () => {
  let prefix = 'test-configs/overlapping-enabled/'

  describe('configuration', function () {
    it('default', function () {
      assert.deepStrictEqual(
        { one: 1, two: 2, topTest: 'test.config'},
        natan(d(prefix, 'configuration-default/test.config')))
    })

    it('local', function () {
      assert.deepStrictEqual(
        { one: 1, two: 2, topTest: 'named-local'},
        natan(d(prefix, 'configuration-local/test.config')))
    })

    it('parent', function () {
      assert.deepStrictEqual(
        { one: 1, two: 2, topTest: 'app/test.config'},
        natan(d(prefix, 'configuration-parent/app/test.config')))
    })
  })

  describe('convention', function () {
    it('default', function () {
      assert.deepStrictEqual(
        { one: 1, two: 2, topTest: 'test.config'},
        natan(d(prefix, 'convention-default/test.config')))
    })

    it('local', function () {
      assert.deepStrictEqual(
        { one: 1, two: 2, topTest: 'test.config.local'},
        natan(d(prefix, 'convention-local/test.config')))
    })

    it('parent', function () {
      assert.deepStrictEqual(
        { one: 1, two: 2, topTest: 'app/test.config'},
        natan(d(prefix, 'convention-parent/app/test.config')))
    })
  })
})

describe('overlapping-disabled', () => {
  let prefix = 'test-configs/overlapping-disabled/'

  after(() => {
    process.env.NATAN_OVERLAPPING = undefined
  })

  it('natan-settings', () => {
    assert.deepStrictEqual(
      { one: 1, two: 2, topTest: 'app/test.config'},
      natan(d(prefix, 'all/app/test.config'), { useOverlapping: false }))
  })

  it('process-env', () => {
    process.env.NATAN_OVERLAPPING = 'false'

    assert.deepStrictEqual(
      { one: 1, two: 2, topTest: 'app/test.config'},
      natan(d(prefix, 'all/app/test.config'), { useOverlapping: true }))
  })
})

describe('interpolating-enabled', () => {
  let prefix = 'test-configs/interpolating-enabled/'

  it('keys-ok', () => {
    let model = {
      object: { foo: 'bar' },
      objectCopy: { foo: 'bar' },
      objectFieldCopy: 'bar',
      arrayElementFieldCopy: 'xyz',
      array: [ { foo: 'bar' }, { abc: 'xyz' } ],
      arrayCopy: [ { foo: 'bar' }, { abc: 'xyz' } ]
    }

    assert.deepStrictEqual(
      model,
      natan(d(prefix, 'keys-ok/test.config')))
  })

  it('keys-error', () => {
    assert.throws(
      () => natan(d(prefix, 'keys-error/test.config')),
      'key does not exist, but the interpolation is carried out')
  })

  it('times-ok', () => {
    let model = {
      foo1: 60000,
      foo2: 90000,
      foo3: 273600000,
      foo4: 273636000
    }

    assert.deepStrictEqual(
      model,
      natan(d(prefix, 'times-ok/test.config')))
  })

  it('times-error', () => {
    assert.throws(
      () => natan(d(prefix, 'times-error/test.config')),
      'time is incorrect, but the interpolation is carried out')
  })

  it('paths-ok', () => {
    let model = {
      foo1: c('.'),
      foo2: c('..'),
      foo3: c('./src')
    }

    assert.deepStrictEqual(
      model,
      natan(d(prefix, 'paths-ok/test.config')))
  })

  it('regExps-ok', () => {
    let model = {
      foo1: /\d+/,
      foo2: /^\((.+)\)$/,
      foo3: /[a-z0-9]/
    }

    assert.deepStrictEqual(
      model,
      natan(d(prefix, 'regExps-ok/test.config')))
  })

  it('bytes-ok', () => {
    let model = {
      foo1: 1024,
      foo2: 2048,
      foo3: 2
    }

    assert.deepStrictEqual(
      model,
      natan(d(prefix, 'bytes-ok/test.config')))
  })

  it('bytes-error', () => {
    assert.throws(
      () => natan(d(prefix, 'bytes-error/test.config')),
      'bytes is incorrect, but the interpolation is carried out')
  })

  it('funcs-ok', () => {
    let model = {
      foo1: 1*2 + 4,
      foo2: process.env.USER,
      foo3: require('os').hostname()
    }

    assert.deepStrictEqual(
      model,
      natan(d(prefix, 'funcs-ok/test.config')))
  })

  it('mixed-ok', () => {
    let v = `hi, im here!`
    let k = `k-> ${v} <-k`
    let r = `r-> ${new RegExp(k)} <-r`
    let f = `f-> ${r} <-f`
    let p = `p-> ${c(f)} <-p`

    assert.deepStrictEqual({ v, k, r, f, p },
      natan(d(prefix, 'mixed-ok/test.config')))
  })
})

describe('interpolating-disabled', () => {
  let prefix = 'test-configs/interpolating-disabled/'
  let model = {
    key: 'k{ time }',
    time: 't{ one minute }',
    path: 'p{ . }',
    regExp: 'r{ \\d+ }',
    func: 'f{ 1+1 }'
  }

  after(() => {
    process.env.NATAN_INTERPOLATING = undefined
  })

  it('natan-settings', () => {
    assert.deepStrictEqual(
      model,
      natan(d(prefix, 'all/test.config'), { useInterpolating: false }))
  })

  it('process-env', () => {
    process.env.NATAN_INTERPOLATING = 'false'

    assert.deepStrictEqual(
      model,
      natan(d(prefix, 'all/test.config'), { useInterpolating: true }))
  })
})
