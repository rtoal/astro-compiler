// Code Generator Astro -> JavaScript
//
// Invoke generate(program) with the program node to get back the JavaScript
// translation as a string.

import { standardLibrary } from "./core.js"

export default function generate(program) {
  const output = []

  // Collect all assigned variables here so we can output declarations
  const assigned = new Set()

  // Variable names in JS will be suffixed with _1, _2, _3, etc. This is
  // because "while", for example, is a legal variable name in Astro, but
  // not in JS. So we want to generate something like "while_1". We handle
  // this by mapping each variable declaration to its suffix.
  const targetName = (mapping => {
    return entity => {
      if (!mapping.has(entity)) {
        mapping.set(entity, mapping.size + 1)
      }
      return `${entity.name}_${mapping.get(entity)}`
    }
  })(new Map())

  const gen = node => generators?.[node?.kind]?.(node) ?? node

  const generators = {
    Program(p) {
      output.push("") // leave one line open for variable declarations
      p.statements.forEach(gen)
    },
    Variable(v) {
      if (v === standardLibrary.π) return "Math.PI"
      return targetName(v)
    },
    Function(f) {
      // The only functions in Astro are in the standard library.
      return new Map([
        [standardLibrary.sqrt, "Math.sqrt"],
        [standardLibrary.sin, "Math.sin"],
        [standardLibrary.cos, "Math.cos"],
        [standardLibrary.hypot, "Math.hypot"],
      ]).get(f)
    },
    Procedure(p) {
      // The only procedures in Astro are in the standard library.
      return new Map([[standardLibrary.print, "console.log"]]).get(p)
    },
    Assignment(s) {
      const source = gen(s.source)
      const target = gen(s.target)
      assigned.add(target)
      output.push(`${target} = ${source};`)
    },
    ProcedureCall(c) {
      const args = c.args.map(gen)
      const callee = gen(c.callee)
      output.push(`${callee}(${args.join(",")});`)
    },
    FunctionCall(c) {
      const args = c.args.map(gen)
      const callee = gen(c.callee)
      return `${callee}(${args.join(",")})`
    },
    BinaryExpression(e) {
      return `(${gen(e.left)} ${e.op} ${gen(e.right)})`
    },
    UnaryExpression(e) {
      return `${e.op}(${gen(e.operand)})`
    },
  }

  gen(program)
  // Fifth line declares all the variables (required in JS, not in Astro)
  output[0] = assigned.size > 0 ? `let ${[...assigned].join(", ")};` : ""
  return output.join("\n")
}
