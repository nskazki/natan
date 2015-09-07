var assert = require('assert')
var resolve = require('path').resolve
var toArray = require('lodash').toArray
var format = require('util').format
var resolve = require('path').resolve
var natan = require('../src-build')

function c() {
  var args = toArray(arguments)
  return resolve.apply(null, [ process.cwd() ].concat(args))
}

function d() {
  var args = toArray(arguments)
  return resolve.apply(null, [ __dirname ].concat(args))
}

describe('overlapping-enabled', function() {
  var prefix = 'test-configs/overlapping-enabled/'

  describe('configuration', function () {
    it('default', function () {
      assert.deepEqual(
        { one: 1, two: 2, topTest: 'test.config'},
        natan(d(prefix, 'configuration-default/test.config')))
    })
    it('local', function () {
      assert.deepEqual(
        { one: 1, two: 2, topTest: 'named-local'},
        natan(d(prefix, 'configuration-local/test.config')))
    })
    it('parent', function () {
      assert.deepEqual(
        { one: 1, two: 2, topTest: 'app/test.config'},
        natan(d(prefix, 'configuration-parent/app/test.config')))
    })
  })

  describe('convention', function () {
    it('default', function () {
      assert.deepEqual(
        { one: 1, two: 2, topTest: 'test.config'},
        natan(d(prefix, 'convention-default/test.config')))
    })
    it('local', function () {
      assert.deepEqual(
        { one: 1, two: 2, topTest: 'test.config.local'},
        natan(d(prefix, 'convention-local/test.config')))
    })
    it('parent', function () {
      assert.deepEqual(
        { one: 1, two: 2, topTest: 'app/test.config'},
        natan(d(prefix, 'convention-parent/app/test.config')))
    })
  })
})

describe('overlapping-disabled', function() {
  var prefix = 'test-configs/overlapping-disabled/'

  after(function() {
    process.env.NATAN_OVERLAPPING = undefined
  })

  it('natan-settings', function() {
    assert.deepEqual(
      { one: 1, two: 2, topTest: 'app/test.config'},
      natan(d(prefix, 'all/app/test.config'), { useOverlapping: false }))
  })
  it('process-env', function() {
    process.env.NATAN_OVERLAPPING = "false"

    assert.deepEqual(
      { one: 1, two: 2, topTest: 'app/test.config'},
      natan(d(prefix, 'all/app/test.config'), { useOverlapping: true }))
  })
})

describe('interpolating-enabled', function() {
  var prefix = 'test-configs/interpolating-enabled/'

  it('keys-ok', function() {
    var model = {
      object: { foo: 'bar' },
      objectCopy: { foo: 'bar' },
      objectFieldCopy: 'bar',
      arrayElementFieldCopy: 'xyz',
      array: [ { foo: 'bar' }, { abc: 'xyz' } ],
      arrayCopy: [ { foo: 'bar' }, { abc: 'xyz' } ]
    }

    assert.deepEqual(
      model,
      natan(d(prefix, 'keys-ok/test.config')))
  })
  it('keys-error', function(done) {
    try {
      var result = natan(d(prefix, 'keys-error/test.config'))
      done(new Error(format('key does not exist, but the interpolation is carried out: %j', result)))
    } catch(err) {
      done()
    }
  })

  it('times-ok', function() {
    var model = {
      foo1: 60000,
      foo2: 90000,
      foo3: 273600000,
      foo4: 273636000
    }

    assert.deepEqual(
      model,
      natan(d(prefix, 'times-ok/test.config')))
  })
  it('times-error', function(done) {
    try {
      var result = natan(d(prefix, 'times-error/test.config'))
      done(new Error(format('time is incorrect, but the interpolation is carried out: %j', result)))
    } catch(err) {
      done()
    }
  })

  it('paths-ok', function() {
    var model = {
      foo1: c('.'),
      foo2: c('..'),
      foo3: c('./src')
    }

    assert.deepEqual(
      model,
      natan(d(prefix, 'paths-ok/test.config')))
  })

  it('regExps-ok', function() {
    var model = {
      foo1: /\d+/,
      foo2: /^\((.+)\)$/,
      foo3: /[a-z0-9]/
    }

    assert.deepEqual(
      model,
      natan(d(prefix, 'regExps-ok/test.config')))
  })

  it('funcs-ok', function() {
    var model = {
      foo1: 1*2 + 4,
      foo2: process.env.USER,
      foo3: require('os').hostname()
    }

    assert.deepEqual(
      model,
      natan(d(prefix, 'funcs-ok/test.config')))
  })
})

describe('interpolating-disabled', function() {
  var prefix = 'test-configs/interpolating-disabled/'
  var model = {
    key: 'k{ time }',
    time: 't{ one minute }',
    path: 'p{ . }',
    regExp: 'r{ \\d+ }',
    func: 'f{ 1+1 }'
  }

  after(function() {
    process.env.NATAN_INTERPOLATION = undefined
  })

  it('natan-settings', function() {
    assert.deepEqual(
      model,
      natan(d(prefix, 'all/test.config'), { useInterpolation: false }))
  })
  it('process-env', function() {
    process.env.NATAN_INTERPOLATION = "false"

    assert.deepEqual(
      model,
      natan(d(prefix, 'all/test.config'), { useInterpolation: true }))
  })
})
