'use strict';

const {formatter} = require('../lib/util')

exports.logger = {

  ingore: ['/', /.+\.{html|css|js}/],

  event: {
    request: true,
    response: true,
    error: true,
  },

  //错误日志钉钉报警token
  dingtalk: [],

  //是否扁平化输出
  flattenr: false,

  //是否序列化输出
  stringify: true,

  formatter: formatter
};

