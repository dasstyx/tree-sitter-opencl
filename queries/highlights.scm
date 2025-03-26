; highlights.scm

; Basic keywords
[
  "break" "case" "const" "continue" "default"
  "do" "else" "enum" "extern" "for" "if"
  "inline" "return" "sizeof" "static" "struct"
  "switch" "typedef" "union" "volatile" "while"
] @keyword

; Explicitly defined qualifier nodes
(kernel_qualifier) @keyword
(address_space_qualifier) @type.qualifier
(access_qualifier) @type.qualifier

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

; Function calls
(call_expression
  function: (identifier) @function)
(builtin_function_call
  function: (builtin_function) @function.builtin)

; Types
(primitive_type) @type
(vector_type) @type
[
  "sampler_t"
  "image1d_t" "image1d_array_t" "image1d_buffer_t"
  "image2d_t" "image2d_array_t"
  "image3d_t"
  "pipe"
] @type.builtin

; Vector component access
(field_expression component: _ @property)

; Literals
(string_literal) @string
(system_lib_string) @string
(number_literal) @number
(char_literal) @string.special

; Comments
(comment) @comment

; Preprocessor directives
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

; Constants (uppercase identifiers)
((identifier) @constant
 (#match? @constant "^[A-Z][A-Z\\d_]*$"))

; Function declarations
(function_declarator declarator: (identifier) @function)
(kernel_function_definition
  declarator: (function_declarator
    declarator: (identifier) @function.special))
