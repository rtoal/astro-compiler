import util from "util"

export class Program {
  constructor(statements) {
    this.statements = statements
  }
}

export class Assignment {
  constructor(target, source) {
    Object.assign(this, { target, source })
  }
}

export class ProcedureCall {
  constructor(callee, args) {
    Object.assign(this, { callee, args })
  }
}

export class FunctionCall {
  constructor(callee, args) {
    Object.assign(this, { callee, args })
  }
}

export class BinaryExpression {
  constructor(op, left, right) {
    Object.assign(this, { op, left, right })
  }
}

export class UnaryExpression {
  constructor(op, operand) {
    Object.assign(this, { op, operand })
  }
}

export class Variable {
  constructor(name, readOnly) {
    Object.assign(this, { name, readOnly })
  }
}

export class Function {
  constructor(name, paramCount, readOnly) {
    Object.assign(this, { name, paramCount, readOnly })
  }
}

export class Procedure {
  constructor(name, paramCount, readOnly) {
    Object.assign(this, { name, paramCount, readOnly })
  }
}

export const standardLibrary = Object.freeze({
  π: new Variable("π", true),
  sqrt: new Function("sqrt", 1, true),
  sin: new Function("sin", 1, true),
  cos: new Function("cos", 1, true),
  hypot: new Function("hypot", 2, true),
  print: new Procedure("print", 1, true),
})

// Return a compact and pretty string representation of the node graph,
// taking care of cycles. Written here from scratch because the built-in
// inspect function, while nice, isn't nice enough. Defined properly in
// the root class prototype so that it automatically runs on console.log.
Program.prototype[util.inspect.custom] = function () {
  const tags = new Map()

  // Attach a unique integer tag to every node
  function tag(node) {
    if (tags.has(node) || typeof node !== "object" || node === null) return
    tags.set(node, tags.size + 1)
    for (const child of Object.values(node)) {
      Array.isArray(child) ? child.forEach(tag) : tag(child)
    }
  }

  function* lines() {
    function view(e) {
      if (tags.has(e)) return `#${tags.get(e)}`
      if (Array.isArray(e)) return `[${e.map(view)}]`
      return util.inspect(e)
    }
    for (let [node, id] of [...tags.entries()].sort((a, b) => a[1] - b[1])) {
      let type = node.constructor.name
      let props = Object.entries(node).map(([k, v]) => `${k}=${view(v)}`)
      yield `${String(id).padStart(4, " ")} | ${type} ${props.join(" ")}`
    }
  }

  tag(this)
  return [...lines()].join("\n")
}