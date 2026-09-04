export default [
  { name: 'inline', latex: 'x^2 + y^2 = z^2', display: false },
  { name: 'display', latex: '\\int_0^1 x^2 \\, dx', display: true },
  { name: 'fraction-subscript-superscript', latex: '\\frac{a_{n+1}}{b^2}', display: false },
  { name: 'greek', latex: '\\alpha + \\beta = \\gamma', display: false },
  { name: 'matrix', latex: '\\begin{bmatrix} 1 & 2 \\\\ 3 & 4 \\end{bmatrix}', display: true },
  { name: 'cases', latex: 'f(x) = \\begin{cases} x^2 & x > 0 \\\\ 0 & x \\leq 0 \\end{cases}', display: false },
  { name: 'mixed-prose', latex: 'E = mc^2', display: false }
];