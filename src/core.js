import util from "util"
import stringify from "graph-stringify"

export class Program {
  constructor(statements) {
    this.statements = statements
  }
  [util.inspect.custom]() {
    return stringify(this)
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
  constructor(name, writable) {
    Object.assign(this, { name, writable })
  }
}

export class Function {
  constructor(name, paramCount) {
    Object.assign(this, { name, paramCount })
  }
}

export class Procedure {
  constructor(name, paramCount) {
    Object.assign(this, { name, paramCount })
  }
}

export const standardLibrary = Object.freeze({
  π: new Variable("π", false),
  sqrt: new Function("sqrt", 1),
  sin: new Function("sin", 1),
  cos: new Function("cos", 1),
  hypot: new Function("hypot", 2),
  print: new Procedure("print", 1),
})
