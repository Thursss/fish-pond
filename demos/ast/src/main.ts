import fs from 'node:fs'
import generate from '@babel/generator'
import parser from '@babel/parser'
import traverse from '@babel/traverse'

const file = fs.readFileSync('./demo.js', 'utf-8')
const ast = parser.parse(file)

// console.log(JSON.stringify(ast, null, 2))

traverse(ast, {
  VariableDeclaration(context: any) {
    if (context.node.kind === 'let') {
      context.node.kind = 'var'
    }
  },
})

const output = generate(ast)

console.log(output.code)
fs.writeFileSync('./demo.ts', output.code)
