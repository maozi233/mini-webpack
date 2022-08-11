
import fs, { realpath } from 'fs'
import path from 'path'
import ejs from 'ejs'

import parser from '@babel/parser'
import traverse from '@babel/traverse'
import babelCore from 'babel-core'
const { transformFromAst } = babelCore;

let id = 0;

function createAsset(filePath) {
  /**
   *  1.获取文件内容
   */
  const source = fs.readFileSync(filePath, { encoding: 'utf-8' })
  // console.log(source);

  /**
   *  2.获取依赖关系
   *    AST抽象语法树
   */
  const ast = parser.parse(source, {
    sourceType: 'module'
  });
  // console.log(ast);
  const deps = []
  traverse.default(ast, {
    ImportDeclaration({ node }) {
      // console.log(`【import】`, node.source.value);
      deps.push(node.source.value);
    },
  })

  // import export 转换成 require 
  const { code } = transformFromAst(ast, null, {
    presets: ['env']
  })

  return {
    filePath, // 文件路径
    code, // 具体代码
    deps, // 该文件的依赖
    mapping: {},
    id: id++,
  }
}

// const asset = createAsset('./example/main.js')
// console.log(asset)

function createGraph() {
  const mainAsset = createAsset('./example/main.js')

  const queue = [mainAsset];

  /**
   * 遍历树结构
   */
  for (const asset of queue) {
    asset.deps.forEach((relativePath) => {
      const absolutePath = path.resolve('./example', relativePath)
      // console.log(absolutePath)
      const childAssets = createAsset(absolutePath)
      asset.mapping[relativePath] = childAssets.id
      queue.push(childAssets)
    })
  }

console.log(queue);
  return queue
}

const graph = createGraph()

// console.log(graph);

function build(graph) {
  const template = fs.readFileSync('./bundle.ejs', { encoding: 'utf-8' })

  const data = graph.map((asset) => {
    return {
      id: asset.id,
      code: asset.code,
      mapping: asset.mapping,
    }
  })
  // console.log(data)
  const code = ejs.render(template, { data });

  fs.writeFileSync('./dist/bundle.js', code)
}

build(graph)