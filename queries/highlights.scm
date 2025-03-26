; Highlights for OpenCL
; Always ensure references match node types actually produced by grammar.js

; Basic keywords from C + extended
[
  "break" "case" "const" "continue" "default"
  "do" "else" "enum" "extern" "for" "if"
  "inline" "return" "sizeof" "static" "struct"
  "switch" "typedef" "union" "volatile" "while"
] @keyword

; Our newly introduced node types for qualifiers:
(opencl_kernel_qualifier) @keyword
(opencl_address_space) @type.qualifier
(opencl_access_qualifier) @type.qualifier

; Operators
[
  "+" "-" "*" "/" "%"
  "=" "+=" "-=" "*=" "/=" "%="
  "==" "!=" "<" ">" "<=" ">="
  "!" "&&" "||"
  "&" "|" "^" "~" "<<" ">>"
  "++" "--"
] @operator

; Delimiters
["." ";" ":" "," "->"] @punctuation.delimiter
["(" ")" "[" "]" "{" "}"] @punctuation.bracket

; Attributes
(opencl_attribute) @attribute

; Function calls: highlight the called function
(call_expression
  function: (identifier) @function)

; Builtin function calls
(builtin_function_call
  function: (builtin_function) @function.builtin)

; Extended types
(primitive_type) @type
(vector_type) @type
[
  "sampler_t"
  "image1d_t" "image1d_array_t" "image1d_buffer_t"
  "image2d_t" "image2d_array_t"
  "image3d_t"
  "pipe"
] @type.builtin

; Vector swizzle field
(field_expression
  component: _ @property)

; Literals
(string_literal) @string
(system_lib_string) @string
(number_literal) @number
(char_literal) @string.special

; Comments
(comment) @comment

; Preprocessor
"#pragma" @preproc
(preproc_directive) @preproc
[
  "#define" "#elif" "#else" "#endif"
  "#if" "#ifdef" "#ifndef" "#include"
] @preproc

; Identifiers
(identifier) @variable
(field_identifier) @property
(type_identifier) @type

; Constants in all-caps
((identifier) @constant
 (#match? @constant "^[A-Z][A-Z\\d_]*$"))

; Function declarations
(function_declarator
  declarator: (identifier) @function)

(kernel_function_definition
  declarator: (function_declarator 
    declarator: (identifier) @function.special))
