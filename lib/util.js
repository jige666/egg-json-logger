'use strict';

const request = require('request')
const Flattenr = require("flattenr");
const stringify = require('json-stringify-safe')

const util = module.exports = {}

util.stringify = false;
util.flattenr = false;
util.dingtalk = [];

//格式化日志为JSON字符串
util.formatter = function (meta) {

  let msgArray = util.getMessageArray(meta.message)
  delete meta.message;
  meta.from = '';

  let index = 1;
  for (let msg of msgArray) {
    try {
      let obj = JSON.parse(msg)
      if (!obj.hasOwnProperty('reqid') && !obj.hasOwnProperty('error') && !obj.hasOwnProperty('env')) {
        obj = {[`log${index++}`]: obj}
      }

      if (util.stringify) {
        Object.assign(meta, obj)
      }

      if (util.flattenr) {
        Object.assign(meta, new Flattenr(obj, ".").get())
      }
    }
    catch (e) {
      //会识别第一个 [内容] 作为from, 普通的数组序列化后，不会到这里来
      if (!meta.from && /\[*\]/.test(msg)) {
        meta.from = msg.slice(1, -1)
      }
      else {
        let obj = {[`log${index++}`]: msg}
        Object.assign(meta, obj)
      }
    }
  }

  meta.date = meta.date.split(',')[0]

  if (meta.level === 'ERROR') {
    for (let ding of util.dingtalk) {
      let options = {
        method: 'POST',
        url: 'https://oapi.dingtalk.com/robot/send?access_token=' + ding,
        headers: {
          'Content-Type': 'application/json'
        },
        json: true,
        body: {
          msgtype: "text",
          text: {
            content: util.jsonToJsonText(meta)
          },
        }
      }

      request(options, function (err) {
        if (err) {
          console.error('send log to dingtalk error:', err)
        }
      })
    }
  }

  return stringify(meta)
}

//查看是否该路由在过滤的范围内
util.checkIgnorePath = function (array, path) {
  let flag = false;
  for (let item of array) {
    if (typeof item === "string") {
      flag = item === path
    }
    else if (item && typeof item === "object" && typeof item.test === "function") {
      flag = item.test(path)
    }

    if (flag) break;
  }
  return flag
}

//将字符串截断成 数组/对象/普通字符串 数组
util.getMessageArray = function (str = '') {
  let V = {'[': -1, ']': 1, '{': -10000, '}': 10000}
  let v = 0, s = 0, a = [], f = 0, l = str.length;
  for (let i = 0; i < l; i++) {
    i === l - 1 && a.push(str.slice(s).trim())
    if (V[str[i]]) {
      f = 1;
      v += V[str[i]];
    }
    if (str[i] !== ' ') continue;
    if (!v && (f || V[str[i + 1]])) {
      a.push(str.slice(s, i + 1).trim())
      s = i + 1
      f = 0
    }
  }
  return a
}

//获取 Error 对象的属性
util.getErrorJson = function (err) {

  if (!(err instanceof Error)) {
    err = new Error(err)
  }

  return {
    name: err.name,
    message: err.message,
    stack: err.stack ? err.stack.replace(/\n|\s+|:/g, ',').replace(/,,|,/g, ' ') : ''
  }
}

util.jsonToJsonText = function (obj) {

  obj = Object.assign({}, obj);

  let text = '{\n';
  function append(key) {
    if (obj[key] && typeof obj[key] === 'object') {
      text = text + `    ${key}: ${util.jsonToJsonText(obj[key])},\n`;
    }
    else if (typeof obj[key] === 'string') {
      text = text + `    ${key}: "${obj[key]}",\n`
    }
    else {
      text = text + `    ${key}: ${obj[key]},\n`
    }
    delete obj[key];
  }

  for (let key of ['name', 'env', 'level', 'date', 'hostname', 'pid', 'uid', 'reqid', 'use', 'from', 'file']) {
    if (obj.hasOwnProperty(key)) {
      append(key)
    }
  }

  for (let key in obj) {
    append(key)
  }

  return text + '}'
}

util.getStack = function (name) {
  let paths = [];
  try {
    const files = new Error().stack.split('\n');
    for (let i = 0; i< files.length; i++) {
      let start = files[i].indexOf(name)
      let end = files[i].indexOf(')')
      let path = files[i].slice(start, end);
      if(!path) continue;  
      paths.push(path);
    }
  }
  catch (e){}
  return paths
}