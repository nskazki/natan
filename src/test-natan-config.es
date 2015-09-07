'use strict';

import { chain, _, isString } from 'lodash'
import { resolve } from 'path'
import { inspect } from 'util'
import commander from 'commander'
import natan from './'

let resolveConfig = chain(resolve)
    .ary(2)
    .partial(process.cwd(), _)
    .value()

let opts = commander
    .usage('[options]')
    .option('-c, --config <path>', 'set config path.', resolveConfig)
    .parse(process.argv)

if (!isString(opts.config))
  commander.help()

let settings = natan(opts.config)
console.info(inspect(settings, { colors: true, depth: null }))
