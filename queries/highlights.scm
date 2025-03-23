; filepath: /home/vdm/repos/tree-sitter-opencl/queries/highlights.scm
; OpenCL Keywords
[
 "kernel"
 "__kernel"
] @keyword.function

; OpenCL Address Space Qualifiers
[
 "global"
 "__global"
 "local"
 "__local"
 "private"
 "__private"
 "constant"
 "__constant"
 "generic"
 "__generic"
] @type.qualifier

; OpenCL Access Qualifiers
[
 "read_only"
 "__read_only"
 "write_only"
 "__write_only"
 "read_write"
 "__read_write"
] @type.qualifier

; OpenCL Built-in Types
[
 "sampler_t"
 "event_t"
 "queue_t"
 "image1d_t"
 "image2d_t"
 "image3d_t"
] @type.builtin

; Vector Types
((identifier) @type.builtin
 (#match? @type.builtin "^(char|uchar|short|ushort|int|uint|long|ulong|float|double|half)(2|3|4|8|16)$"))

; Inherit rest from C grammar
; ...existing highlighting rules from tree-sitter-c...