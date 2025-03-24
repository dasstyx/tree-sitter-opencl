; OpenCL Keywords
[
 "kernel"
 "__kernel"
] @keyword.function

[
 "break"
 "case"
 "const"
 "continue"
 "default"
 "do"
 "else"
 "enum"
 "extern"
 "for"
 "if"
 "inline"
 "return"
 "sizeof"
 "static"
 "struct"
 "switch"
 "typedef"
 "union"
 "volatile"
 "while"
] @keyword

; OpenCL Address Space Qualifiers
[
 "global" "__global"
 "local" "__local"
 "private" "__private"
 "constant" "__constant"
 "generic" "__generic"
] @type.qualifier

; OpenCL Access Qualifiers
[
 "read_only" "__read_only"
 "write_only" "__write_only"
 "read_write" "__read_write"
] @type.qualifier

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
["." ";" ":" "," "->" ] @punctuation.delimiter
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

; Variables and Fields
(identifier) @variable
(field_identifier) @property
(type_identifier) @type

; Constants (all-caps identifiers)
((identifier) @constant
 (#match? @constant "^[A-Z][A-Z\\d_]*$"))

; Function declarations
(function_declarator
  declarator: (identifier) @function)
(kernel_function_definition
  declarator: (function_declarator 
    declarator: (identifier) @function.special))