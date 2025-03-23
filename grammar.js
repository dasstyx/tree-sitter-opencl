/**
 * @file Parse the OpenCL syntax source code
 * @author dasstyx <dasstyx@gmail.com>
 * @license MIT
 */

/**
 * Updated Implementation Plan for OpenCL Grammar:
 *
 * 1. Basic constructs (already implemented):
 *    - kernel_function_definition
 *    - Address space qualifiers, vector types, primitive types
 *    - Function and declaration definitions
 *
 * 2. Work group and synchronization functions:
 *    - Work group built-ins (get_work_dim, get_global_size, get_global_id, get_local_size, get_local_id, get_num_groups, get_group_id, get_global_offset)
 *    - Memory fence functions and flags (mem_fence, read_mem_fence, write_mem_fence, CLK_GLOBAL_MEM_FENCE, CLK_LOCAL_MEM_FENCE)
 *
 * 3. Vector operations:
 *    - vector component accessors (.xyzw, .rgba)
 *    - Extended vector data types (e.g. vector_data_type / vector_literal)
 *
 * 4. Async functions:
 *    - async_work_group_copy, async_work_group_strided_copy, wait_group_events
 *
 * 5. Built-in functions broken out by category:
 *    - Math functions (exp, log, sin, cos, etc.)
 *    - Integer functions (abs, popcount, etc.)
 *    - Geometric functions (dot, cross, distance, etc.)
 *    - Common functions (clamp, mix, etc.)
 *
 * 6. Image and sampler functions:
 *    - Image functions (read_imagef, write_imagef, get_image_width, etc.)
 *
 * 7. Atomic functions:
 *    - Atomic built-ins (atomic_add, atomic_sub, etc.)
 *    - Consider extensions to support new atomic functions with memory ordering semantics (e.g. atomic_compare_exchange_strong)
 *
 * 8. Additional qualifiers and kernel attributes:
 *    - Function qualifier additions (e.g. '__kernel', 'kernel')
 *    - Additional access qualifiers (read_only, write_only, __read_only, __write_only)
 *    - Extended kernel launch attributes like required work-group size, max compute units, etc.
 *
 * 9. Device-side enqueue and SVM operations:
 *    - Support for device-side kernel enqueue (enqueue_kernel, enqueue_marker, etc.)
 *    - Shared virtual memory (SVM) operations
 *
 * 10. Pipe and channel built-ins:
 *    - read_pipe, write_pipe, reserve_pipe_id, commit_pipe_write, get_pipe_info
 *
 * 11. Subgroup functions and operations:
 *    - Subgroup built-ins (e.g., sub_group_broadcast, sub_group_reduce_add, etc.)
 *
 * 12. Version pragmas:
 *    - Support '#pragma OPENCL [version]' directives for OpenCL 3.0 and earlier versions.
 *
 * 13. Extensions support:
 *    - Additional rules for cl_khr_* and cl_intel_* extension directives.
 *
 * 14. Vector type conversions and special built-in types:
 *    - Rules for convert_<type><size>, as_<type><size>
 *    - Additional image types (e.g. image1d_t, image1d_array_t, etc.)
 *    - Special data types (cl_mem, cl_program, cl_kernel, etc.)
 *    - Sampler state constants (e.g. CLK_NORMALIZED_COORDS_TRUE, CLK_ADDRESS_REPEAT, etc.)
 *
 * ...existing code...
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

// Define precedence levels matching C grammar style
const PREC = {
  PAREN_DECLARATOR: -10,
  ASSIGNMENT: -2,
  CONDITIONAL: -1,
  DEFAULT: 0,
  LOGICAL_OR: 1,
  LOGICAL_AND: 2,
  INCLUSIVE_OR: 3,
  EXCLUSIVE_OR: 4,
  BITWISE_AND: 5,
  EQUAL: 6,
  RELATIONAL: 7,
  SHIFT: 8,
  ADD: 9,
  MULTIPLY: 10,
  CAST: 11,
  SIZEOF: 12,
  UNARY: 13,
  CALL: 14,
  FIELD: 15,
  SUBSCRIPT: 16,
  VECTOR_ACCESS: 17  // OpenCL specific
};

// Updated critical version using best practices from grammar_c.js and aligning with OpenCL 3.0

module.exports = grammar({
  name: 'opencl',

  conflicts: $ => [
    [$._type_identifier, $._identifier],
    [$._declarator, $.function_declarator],
    [$.parameter_list, $.parameter_type_list],
    [$.vector_type, $._type_specifier],
    [$.address_space_qualifier, $.type_qualifier]
  ],

  extras: $ => [
    /\s|\\\r?\n/,
    $.comment,
  ],

  inline: $ => [
    $._type_identifier,
    $._field_identifier,
    $._statement_identifier,
    $._non_case_statement,
    $._assignment_left_expression,
  ],

  supertypes: $ => [
    $.expression,
    $.statement,
    $.type_specifier,
    $._declarator,
    $._field_declarator,
    $._type_declarator,
  ],

  word: $ => $.identifier,

  rules: {
    source_file: $ => repeat($._definition),

    _definition: $ => choice(
      $.function_definition,
      $.kernel_function_definition,
      $.declaration
    ),

    expression: $ => choice(
      $._expression_not_binary,
      $.binary_expression
    ),

    _expression_not_binary: $ => choice(
      $.identifier,
      $.number_literal,
      $.string_literal,
      $.call_expression,
      $.field_expression,
      $.compound_literal_expression,
      $.parenthesized_expression,
      $.sizeof_expression,
      $.alignof_expression,
      $.vector_expression,
      $.pointer_expression,
      $.conditional_expression,
      $.assignment_expression,
      $.update_expression,
      $.cast_expression,
    ),

    binary_expression: $ => {
      const table = [
        ['+', PREC.ADD],
        ['-', PREC.ADD],
        ['*', PREC.MULTIPLY],
        ['/', PREC.MULTIPLY],
        ['%', PREC.MULTIPLY],
        ['||', PREC.LOGICAL_OR],
        ['&&', PREC.LOGICAL_AND],
        ['|', PREC.INCLUSIVE_OR],
        ['^', PREC.EXCLUSIVE_OR],
        ['&', PREC.BITWISE_AND],
        ['==', PREC.EQUAL],
        ['!=', PREC.EQUAL],
        ['>', PREC.RELATIONAL],
        ['>=', PREC.RELATIONAL],
        ['<=', PREC.RELATIONAL],
        ['<', PREC.RELATIONAL],
        ['<<', PREC.SHIFT],
        ['>>', PREC.SHIFT],
      ];

      return choice(...table.map(([operator, precedence]) => {
        return prec.left(precedence, seq(
          field('left', $.expression),
          field('operator', operator),
          field('right', $.expression),
        ));
      }));
    },

    // First add core declarator rules needed for function definitions
    _declarator: $ => choice(
      $.pointer_declarator,
      $.function_declarator,
      $.array_declarator,
      $.parenthesized_declarator, 
      $.identifier
    ),

    pointer_declarator: $ => prec.right(seq(
      '*',
      optional($._declarator)
    )),

    function_declarator: $ => prec(1, seq(
      field('declarator', $._declarator),
      field('parameters', $.parameter_list)
    )),

    array_declarator: $ => prec(1, seq(
      field('declarator', $._declarator),
      '[',
      optional($.expression),
      ']'
    )),

    parenthesized_declarator: $ => seq(
      '(',
      $._declarator,
      ')'
    ),

    parameter_list: $ => seq(
      '(',
      commaSep($.parameter_declaration),
      ')'
    ),

    parameter_declaration: $ => seq(
      $._declaration_specifiers,
      optional($._declarator)
    ),

    // Removed duplicate expression rule block below
    // expression: $ => choice(
    //   $.identifier,
    //   $.number_literal,
    //   $.string_literal,
    //   $.call_expression,
    //   $.binary_expression,
    //   // ...other expression types...
    // ),
    
    // Add base expression rules
    expression: $ => choice(
      $.identifier,
      $.number_literal,
      $.string_literal,
      $.call_expression,
      $.binary_expression,
      // ...other expression types...
    ),

    call_expression: $ => prec(PREC.CALL, seq(
      field('function', $.expression),
      field('arguments', $.argument_list)
    )),

    argument_list: $ => seq(
      '(',
      commaSep($.expression),
      ')'
    ),

    identifier: _ => /[a-zA-Z_]\w*/,

    number_literal: _ => /\d+/,
    
    string_literal: $ => seq(
      '"',
      repeat(choice(
        /[^"\\]/,
        $.escape_sequence
      )),
      '"'
    ),

    escape_sequence: _ => /\\./,

    // Now the OpenCL specific rules
    kernel_function_definition: $ => seq(
      field('qualifier', choice('__kernel', 'kernel')),
      field('address_space', optional($.address_space_qualifier)),
      field('type', $._type_specifier),
      field('declarator', $._declarator),
      field('body', $.compound_statement)
    ),

    address_space_qualifier: $ => choice(
      '__global', 'global',
      '__local', 'local', 
      '__private', 'private',
      '__constant', 'constant',
      '__generic', 'generic',
      '__attribute__((device))', '__device__'
    ),

    vector_type: $ => prec(1, seq(
      field('base_type', choice(
        'char', 'uchar',
        'short', 'ushort',
        'int', 'uint',
        'long', 'ulong',
        'float', 'double', 'half'
      )),
      field('size', choice('2', '3', '4', '8', '16'))
    )),

    opencl_type: $ => choice(
      'bool', 'half', 'quad',
      $.vector_type,
      'image2d_t', 'image3d_t', 'sampler_t',
      'event_t'
    ),

    function_definition: $ => seq(
      optional($.address_space_qualifier),
      field('type', $._type_specifier),
      field('declarator', $._declarator),
      field('body', $.compound_statement)
    ),

    declaration: $ => seq(
      field('type', $._declaration_specifiers),
      commaSep1(field('declarator', $._declarator)),
      ';'
    ),

    _declaration_specifiers: $ => seq(
      repeat(choice(
        $.storage_class_specifier,
        $.type_qualifier,
        $.address_space_qualifier,
        $.attribute_qualifier
      )),
      $._type_specifier
    ),

    _type_specifier: $ => choice(
      $.primitive_type,
      $.vector_type,
      $.image_type, 
      $.sampler_type,
      $._type_identifier,
      $.struct_specifier
    ),

    primitive_type: $ => choice(
      'void',
      'char', 'short', 'int', 'long',
      'float', 'double',
      'signed', 'unsigned',
      'size_t', 'ptrdiff_t', 'intptr_t', 'uintptr_t'
    ),

    // 1. Work group functions
    work_group_function: $ => choice(
      'get_work_dim',
      'get_global_size',
      'get_global_id',
      'get_local_size',
      'get_local_id',
      'get_num_groups',
      'get_group_id',
      'get_global_offset'
    ),

    // 2. Memory fence functions & flags
    memory_fence_function: $ => choice(
      'mem_fence',
      'read_mem_fence',
      'write_mem_fence'
    ),

    memory_fence_flags: $ => choice(
      'CLK_GLOBAL_MEM_FENCE',
      'CLK_LOCAL_MEM_FENCE'
    ),

    // 3. Vector operations
    vector_component_accessor: $ => /\.([xyzw]{1,4}|[rgba]{1,4})/,

    // 4. Async functions
    async_function: $ => choice(
      'async_work_group_copy',
      'async_work_group_strided_copy',
      'wait_group_events'
    ),

    // 5. Built-in math/integer/common functions
    builtin_function: $ => choice(
      $.math_function,
      $.integer_function,
      $.common_function,
      $.geometric_function
    ),

    math_function: $ => choice(
      'exp', 'exp2', 'exp10', 'expm1',
      'log', 'log2', 'log10', 'log1p',
      'sin', 'cos', 'tan',
      'asin', 'acos', 'atan', 'atan2',
      'sinh', 'cosh', 'tanh',
      'asinh', 'acosh', 'atanh',
      'pow', 'sqrt', 'cbrt', 'hypot',
      'erf', 'erfc',
      'tgamma', 'lgamma'
    ),

    integer_function: $ => choice(
      'abs', 'abs_diff',
      'add_sat', 'sub_sat', 
      'mad_hi', 'mad_sat',
      'min', 'max', 'clamp',
      'popcount', 'clz', 'ctz',
      'hadd', 'rhadd',
      'rotate', 'mul_hi'
    ),

    geometric_function: $ => choice(
      'cross', 'dot', 'distance',
      'length', 'normalize',
      'fast_distance', 'fast_length', 'fast_normalize'
    ),

    // 6. Additional qualifiers
    function_qualifier: $ => choice(
      '__kernel',
      'kernel'
    ),

    access_qualifier: $ => choice(
      '__read_only',
      '__write_only',
      'read_only',
      'write_only'
    ),

    // 7. Extension support
    extension_directive: $ => seq(
      '#pragma',
      'OPENCL',
      'EXTENSION',
      $._extension_name,
      ':',
      $._extension_behavior
    ),

    // 8. Image functions
    image_function: $ => choice(
      'read_imagef', 'write_imagef',
      'read_imagei', 'write_imagei',
      'read_imageui', 'write_imageui',
      'get_image_width', 'get_image_height',
      'get_image_channel_data_type',
      'get_image_channel_order'
    ),

    // 9. Atomic functions
    atomic_function: $ => choice(
      'atomic_add', 'atomic_sub',
      'atomic_xchg', 'atomic_inc', 'atomic_dec',
      'atomic_min', 'atomic_max',
      'atomic_and', 'atomic_or', 'atomic_xor'
    ),

    // 10. Synchronization functions
    sync_function: $ => choice(
      'barrier',
      'mem_fence',
      'read_mem_fence',
      'write_mem_fence'
    ),

    // 12. Vector data types with full spec
    vector_data_type: $ => seq(
      choice(
        'char', 'uchar', 'short', 'ushort',
        'int', 'uint', 'long', 'ulong',
        'float', 'double', 'half'
      ),
      choice('2', '3', '4', '8', '16')
    ),

    // 13. Built-in vector literals
    vector_literal: $ => seq(
      '(',
      commaSep1($._expression),
      ')'
    ),

    // 14. OpenCL version pragmas
    version_pragma: $ => seq(
      '#pragma',
      'OPENCL',
      choice('1.0', '1.1', '1.2', '2.0', '3.0')
    ),

    // 15. Subgroup functions
    subgroup_function: $ => choice(
      'get_sub_group_size',
      'get_max_sub_group_size',
      'get_num_sub_groups',
      'get_sub_group_id',
      'get_sub_group_local_id',
      'sub_group_barrier',
      'sub_group_broadcast',
      'sub_group_reduce_add',
      'sub_group_reduce_min',
      'sub_group_reduce_max',
      'sub_group_scan_inclusive_add',
      'sub_group_scan_exclusive_add'
    ),

    // 16. Pipe and channel operations
    pipe_function: $ => choice(
      'read_pipe',
      'write_pipe',
      'reserve_read_pipe',
      'reserve_write_pipe',
      'commit_read_pipe',
      'commit_write_pipe',
      'get_pipe_num_packets',
      'get_pipe_max_packets'
    ),

    // 17. SVM operations
    svm_function: $ => choice(
      'svm_malloc',
      'svm_free',
      'svm_map',
      'svm_unmap',
      'svm_migrate_memory'
    ),

    // 18. Enhanced vector operations
    vector_operation: $ => choice(
      $.vector_component_accessor,
      $.vector_swizzle,
      $.vector_constructor
    ),

    vector_swizzle: $ => /\.([xyzw]{1,4}|[rgba]{1,4}|[0-9])/,

    vector_constructor: $ => seq(
      $.vector_type,
      '(',
      commaSep1($._expression),
      ')'
    ),

    // 19. Memory ordering semantics
    memory_order: $ => choice(
      'memory_order_relaxed',
      'memory_order_acquire',
      'memory_order_release',
      'memory_order_acq_rel',
      'memory_order_seq_cst'
    ),

    // 20. Enhanced image/sampler types
    image_type: $ => choice(
      'image1d_t',
      'image1d_array_t',
      'image1d_buffer_t',
      'image2d_t',
      'image2d_array_t',
      'image3d_t'
    ),

    sampler_type: $ => choice(
      'sampler_t',
      'CLK_NORMALIZED_COORDS_TRUE',
      'CLK_NORMALIZED_COORDS_FALSE',
      'CLK_ADDRESS_REPEAT',
      'CLK_ADDRESS_CLAMP',
      'CLK_ADDRESS_CLAMP_TO_EDGE',
      'CLK_FILTER_NEAREST',
      'CLK_FILTER_LINEAR'
    ),

    // 21. Atomic operations with optional memory ordering
    atomic_operation: $ => seq(
      $.atomic_function,
      '(',
      $._expression,
      optional(seq(',', $.memory_order)),
      ')'
    ),

    // 22. Device enqueue operations
    enqueue_function: $ => choice(
      'enqueue_kernel',
      'get_kernel_work_group_size',
      'get_kernel_preferred_work_group_size_multiple',
      'retain_event',
      'release_event',
      'create_user_event',
      'is_valid_event'
    ),

    // 23. Extra qualifier rule (combining various qualifiers)
    qualifier: $ => choice(
      $.address_space_qualifier,
      $.access_qualifier,
      $.function_qualifier,
      'uniform',
      'packed',
      'aligned',
      'volatile',
      'restrict'
    ),

    // 24. Type declarations with qualifiers
    type_declaration: $ => seq(
      optional($.qualifier),
      $._type_specifier,
      $._declarator,
      ';'
    ),

    // Add compound statement for function bodies
    compound_statement: $ => seq(
      '{',
      repeat(choice($.declaration, $.statement)),
      '}'
    ),

    statement: $ => choice(
      $.expression_statement,
      $.compound_statement
      // ...other statement types...
    ),

    expression_statement: $ => seq(
      optional($.expression),
      ';'
    ),

    comment: _ => token(choice(
      seq('//', /[^\n]*/),
      seq(
        '/*',
        /[^*]*\*+([^/*][^*]*\*+)*/,
        '/'
      )
    ))
  }
});

function commaSep(rule) {
  return optional(commaSep1(rule));
}

function commaSep1(rule) {
  return seq(rule, repeat(seq(',', rule)));
}

// ...existing helper functions...