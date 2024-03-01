import js from "./js.js"
import c from "./c.js"
import llvm from "./llvm.js"

export default function generate(source, type) {
  return { js, c, llvm }[type](source)
}
