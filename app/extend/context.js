'use strict';

const util = require('../../lib/util')
const uuid = require('uuid/v4')
const REQID = Symbol('reqid')

module.exports = {

  get meta() {
    this[REQID] = this[REQID] || uuid();
    return {
      reqid: this[REQID],
      uid: this.uid || this.userId || '',
      use: this.starttime ? Date.now() - this.starttime : 0
    }
  },

  get logger() {
    return this.jsonLogger
  },

  get coreLogger() {
    return this.jsonLogger
  },

  get jsonLogger() {
    let logger = {};
    ['info', 'debug', 'warn', 'error'].forEach(level => {
      logger[level] = (...args) => {
        let data = this.meta;

        //捕捉报错的具体位置
        if (level === 'error') {
          data.stack = util.getStack(this.app.name)
        }

        args.push(data)

        this.app.logger[level](...args)
      }
    });
    return logger;
  },
};
