/**
 * @file OpenCL 3.0 Grammar for Tree-Sitter
 * Feature-rich, covering most OpenCL constructs, and free of undefined references.
 *
 * Author: <Your Name>
 * License: MIT
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

// Precedence constants for operator parsing
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
  CAST: 27, // New precedence for cast expressions
  SIZEOF: 12,
  UNARY: 13,
  CALL: 14,
  FIELD: 15,
  SUBSCRIPT: 16,
  VECTOR_ACCESS: 17, // Additional OpenCL usage
  TYPE_SPECIFIER: 20,
  STRUCT_DECL: 21,
  STRUCT_TAG: 22,  // New precedence level for struct tags
  FUNCTION_DEF: 23,
  DECLARATOR: 24,
  ADDRESS_SPACE: 25,
  KERNEL: 26,
  VECTOR_TYPE: 27,
  TYPE_CAST: 28,
  COMPOUND_LITERAL: 29,
  PARAMETER_LIST: 30
};

module.exports = grammar({
  name: 'opencl',

  // Potential ambiguities. Adjust if needed.
  conflicts: $ => [
    [$._type_identifier, $.identifier],
    [$.parameter_list, $.parameter_type_list]
  ],

  extras: $ => [
    /\s|\\\r?\n/,
    $.comment
  ],

  inline: $ => [
    $._non_case_statement,
    $._assignment_left_expression
  ],

  supertypes: $ => [
    $.expression,
    $.statement,
    $._type_specifier,
    $._declarator,
    $._field_declarator,
    $._type_declarator
  ],

  word: $ => $.identifier,

  rules: {
    //========================================
    // 1) Root/Source
    //========================================
    source_file: $ => repeat($._definition),

    _definition: $ => choice(
      $.function_definition,
      $.kernel_function_definition,
      $.declaration,
      $.pragma_directive
    ),

    //========================================
    // 2) Pragma Directives
    //========================================
    pragma_directive: $ => choice(
      $.extension_directive,
      $.version_pragma
    ),

    extension_directive: $ => seq(
      '#pragma',
      'OPENCL',
      'EXTENSION',
      $._extension_name,
      ':',
      $._extension_behavior
    ),

    _extension_name: _ => token(/cl_[a-zA-Z0-9_]+/),
    _extension_behavior: _ => choice('enable', 'disable', 'require'),

    version_pragma: $ => seq(
      '#pragma',
      'OPENCL',
      choice('1.0', '1.1', '1.2', '2.0', '3.0')
    ),

    //========================================
    // 3) Declarations
    //========================================
    declaration: $ => prec.right(1, seq(
      $._declaration_specifiers,
      choice(
        seq(commaSep1($._init_declarator), ';'),
        ';' // Allow empty declarations
      )
    )),

    _init_declarator: $ => seq(
      $._declarator,
      optional(seq('=', $._initializer))
    ),

    _initializer: $ => choice(
      $.expression,
      $.initializer_list
    ),

    initializer_list: $ => seq(
      '{',
      commaSep($._initializer),
      optional(','),
      '}'
    ),

    //========================================
    // 4) Function & Kernel Definitions
    //========================================
    // We wrap these in prec(1, …) to favor function definitions over declarations.
    function_definition: $ => prec(PREC.FUNCTION_DEF, seq(
      optional($.address_space_qualifier),
      field('type', $._type_specifier),
      field('declarator', $.function_declarator),
      field('body', $.compound_statement)
    )),

    kernel_function_definition: $ => prec(PREC.KERNEL, seq(
      field('qualifier', choice('__kernel', 'kernel')),
      optional($.address_space_qualifier),
      field('type', $._type_specifier),
      field('declarator', $._declarator),
      field('body', $.compound_statement)
    )),

    //========================================
    // 5) Statements
    //========================================
    statement: $ => choice(
      $.compound_statement,
      $.expression_statement,
      $.if_statement,
      $.switch_statement,
      $.do_statement,
      $.while_statement,
      $.for_statement,
      $.return_statement,
      $.break_statement,
      $.continue_statement,
      $.goto_statement,
      $.labeled_statement
    ),

    compound_statement: $ => seq(
      '{',
      repeat(choice($.declaration, $.statement)),
      '}'
    ),

    expression_statement: $ => seq(
      optional($.expression),
      ';'
    ),

    if_statement: $ => prec.right(seq(
      'if',
      field('condition', $.parenthesized_expression),
      field('consequence', $.statement),
      optional(seq('else', field('alternative', $.statement)))
    )),

    switch_statement: $ => seq(
      'switch',
      field('condition', $.parenthesized_expression),
      field('body', $.compound_statement)
    ),

    do_statement: $ => seq(
      'do',
      field('body', $.statement),
      'while',
      field('condition', $.parenthesized_expression),
      ';'
    ),

    while_statement: $ => seq(
      'while',
      field('condition', $.parenthesized_expression),
      field('body', $.statement)
    ),

    for_statement: $ => seq(
      'for',
      '(',
      choice(
        field('initializer', $.declaration),
        seq(optional(field('initializer', $.expression)), ';')
      ),
      optional(field('condition', $.expression)), ';',
      optional(field('update', $.expression)),
      ')',
      field('body', $.statement)
    ),

    return_statement: $ => seq('return', optional($.expression), ';'),
    break_statement: $ => seq('break', ';'),
    continue_statement: $ => seq('continue', ';'),
    goto_statement: $ => seq('goto', $.identifier, ';'),

    labeled_statement: $ => choice(
      seq($.identifier, ':', $.statement),
      seq('case', $.expression, ':', $.statement),
      seq('default', ':', $.statement)
    ),

    //========================================
    // 6) Expressions
    //========================================
    expression: $ => choice(
      $._expression_not_binary,
      $.binary_expression,
      $.conditional_expression,
      $.assignment_expression
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
      $.update_expression,
      $.cast_expression
    ),

    call_expression: $ => prec(PREC.CALL, seq(
      field('function', $.expression),
      '(',
      commaSep($.expression),
      ')'
    )),

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
        ['>>', PREC.SHIFT]
      ];
      return choice(...table.map(([operator, precedence]) =>
        prec.left(precedence, seq(
          field('left', $.expression),
          field('operator', operator),
          field('right', $.expression)
        ))
      ));
    },

    conditional_expression: $ => prec.right(PREC.CONDITIONAL, seq(
      field('condition', $.expression),
      '?',
      field('consequence', $.expression),
      ':',
      field('alternative', $.expression)
    )),

    assignment_expression: $ => prec.right(PREC.ASSIGNMENT, seq(
      $._assignment_left_expression,
      '=',
      $.expression
    )),

    field_expression: $ => prec.left(PREC.FIELD, seq($.expression, '.', $.identifier)),

    compound_literal_expression: $ => prec(PREC.COMPOUND_LITERAL, seq(
      '(',
      $._type_specifier,
      ')',
      $.initializer_list
    )),

    vector_expression: $ => $.vector_constructor,

    pointer_expression: $ => prec(PREC.UNARY, seq('*', $.expression)),

    parenthesized_expression: $ => seq('(', $.expression, ')'),

    sizeof_expression: $ => seq('sizeof', '(', $.expression, ')'),

    alignof_expression: $ => seq('alignof', '(', $.expression, ')'),

    update_expression: $ => seq(choice('++', '--'), $.identifier),

    cast_expression: $ => prec(PREC.TYPE_CAST, seq(
      '(',
      field('type', $._type_specifier),
      ')',
      field('value', $.expression)
    )),

    _assignment_left_expression: $ => choice(
      $.identifier,
      $.field_expression,
      $.vector_expression,
      $.pointer_expression
    ),

    //========================================
    // 7) Type-Related Definitions
    //========================================
    _type_specifier: $ => prec(PREC.TYPE_SPECIFIER, choice(
      $.primitive_type,
      $.vector_type,
      $.image_type,
      $.sampler_type,
      alias($.struct_tag, $._type_identifier),
      $.struct_specifier
    )),

    primitive_type: $ => choice(
      'void',
      'char', 'short', 'int', 'long',
      'float', 'double',
      'signed', 'unsigned',
      'size_t', 'ptrdiff_t', 'intptr_t', 'uintptr_t',
      'half'
    ),

    vector_type: $ => prec(PREC.VECTOR_TYPE, seq(
      field('base_type', choice(
        'char', 'uchar',
        'short', 'ushort',
        'int', 'uint',
        'long', 'ulong',
        'float', 'double', 'half'
      )),
      field('size', choice('2', '3', '4', '8', '16'))
    )),

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

    struct_specifier: $ => prec.right(PREC.STRUCT_DECL, choice(
      seq(
        'struct',
        optional($.struct_tag),
        '{',
        repeat($.struct_declaration),
        '}'
      ),
      seq('struct', $.struct_tag)
    )),

    struct_tag: $ => prec(PREC.STRUCT_TAG, 
      alias($.identifier, $.struct_tag)
    ),

    struct_declaration: $ => seq(
      repeat($.type_qualifier),
      $._type_specifier,
      commaSep1($.struct_declarator),
      ';'
    ),

    struct_declarator: $ => seq(
      $._declarator,
      optional(seq(':', $.constant_expression))
    ),

    constant_expression: $ => $.expression,

    //========================================
    // 8) Specifiers, Qualifiers, Declarators
    //========================================
    _declaration_specifiers: $ => seq(
      repeat(choice(
        $.storage_class_specifier,
        $.type_qualifier,
        $.address_space_qualifier,
        $.attribute_qualifier
      )),
      $._type_specifier
    ),

    storage_class_specifier: $ => choice(
      'static',
      'extern',
      'register',
      'auto',
      '__private',
      '__local',
      '__global',
      '__constant'
    ),

    // <-- The key change: assign higher precedence here.
    address_space_qualifier: $ => prec(PREC.ADDRESS_SPACE, choice(
      '__global', 'global',
      '__local', 'local',
      '__private', 'private',
      '__constant', 'constant',
      '__generic', 'generic',
      '__attribute__((device))', '__device__'
    )),

    type_qualifier: $ => choice(
      'const',
      'volatile',
      'restrict',
      '__read_only',
      '__write_only',
      'read_only',
      'write_only'
    ),

    attribute_qualifier: $ => seq(
      '__attribute__',
      '(',
      '(',
      choice(
        'aligned',
        'packed',
        'endian',
        seq('aligned', '(', $.constant_expression, ')'),
        seq('endian', '(', choice('host', 'device'), ')')
      ),
      ')',
      ')'
    ),

    //========================================
    // 9) Declarators
    //========================================
    _declarator: $ => prec(PREC.DECLARATOR, choice(
      $.pointer_declarator,
      $.function_declarator,
      $.array_declarator,
      $.parenthesized_declarator,
      $._identifier
    )),

    pointer_declarator: $ => prec.right(seq(
      '*',
      optional($._declarator)
    )),

    function_declarator: $ => prec(PREC.FUNCTION_DEF, seq(
      field('declarator', choice(
        $.identifier,
        $.pointer_declarator,
        $.parenthesized_declarator
      )),
      field('parameters', $.parameter_list)
    )),

    array_declarator: $ => prec(1, seq(
      field('declarator', $._declarator),
      '[',
      optional($.constant_expression),
      ']'
    )),

    parenthesized_declarator: $ => seq(
      '(',
      $._declarator,
      ')'
    ),

    _identifier: $ => $.identifier,

    _field_declarator: $ => $.identifier,
    _type_declarator: $ => $.identifier,

    parameter_list: $ => prec(PREC.PARAMETER_LIST, seq(
      '(',
      optional(commaSep($.parameter_declaration)),
      ')'
    )),

    parameter_declaration: $ => seq(
      $._declaration_specifiers,
      optional($._declarator)
    ),

    parameter_type_list: $ => seq(
      commaSep1($.parameter_declaration),
      optional(seq(',', '...'))
    ),

    //========================================
    // 10) Built-In / Common Functions
    //========================================
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

    common_function: $ => choice(
      'clamp', 'mix', 'step', 'smoothstep',
      'sign', 'floor', 'ceil', 'round',
      'trunc', 'fract', 'mod'
    ),

    geometric_function: $ => choice(
      'cross', 'dot', 'distance',
      'length', 'normalize',
      'fast_distance', 'fast_length', 'fast_normalize'
    ),

    //========================================
    // 11) Additional qualifiers and kernel attributes
    //========================================
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

    //========================================
    // 12) Image functions
    //========================================
    image_function: $ => choice(
      'read_imagef', 'write_imagef',
      'read_imagei', 'write_imagei',
      'read_imageui', 'write_imageui',
      'get_image_width', 'get_image_height',
      'get_image_channel_data_type',
      'get_image_channel_order'
    ),

    //========================================
    // 13) Atomic functions
    //========================================
    atomic_function: $ => choice(
      'atomic_add', 'atomic_sub',
      'atomic_xchg', 'atomic_inc', 'atomic_dec',
      'atomic_min', 'atomic_max',
      'atomic_and', 'atomic_or', 'atomic_xor'
    ),

    //========================================
    // 14) Synchronization functions
    //========================================
    sync_function: $ => choice(
      'barrier',
      'mem_fence',
      'read_mem_fence',
      'write_mem_fence'
    ),

    //========================================
    // 15) Vector data types & built-ins
    //========================================
    vector_data_type: $ => seq(
      choice(
        'char', 'uchar', 'short', 'ushort',
        'int', 'uint', 'long', 'ulong',
        'float', 'double', 'half'
      ),
      choice('2', '3', '4', '8', '16')
    ),

    vector_literal: $ => seq(
      '(',
      commaSep1($.expression),
      ')'
    ),

    vector_operation: $ => choice(
      $.vector_component_accessor,
      $.vector_swizzle,
      $.vector_constructor
    ),

    vector_component_accessor: $ => /\.([xyzw]{1,4}|[rgba]{1,4})/,
    vector_swizzle: $ => /\.([xyzw]{1,4}|[rgba]{1,4}|[0-9])/,

    vector_constructor: $ => prec(PREC.CALL + 1, seq(
      $.vector_type,
      '(',
      commaSep1($.expression),
      ')'
    )),

    //========================================
    // 16) Memory fence & order
    //========================================
    memory_fence_function: $ => choice(
      'mem_fence',
      'read_mem_fence',
      'write_mem_fence'
    ),

    memory_fence_flags: $ => choice(
      'CLK_GLOBAL_MEM_FENCE',
      'CLK_LOCAL_MEM_FENCE'
    ),

    memory_order: $ => choice(
      'memory_order_relaxed',
      'memory_order_acquire',
      'memory_order_release',
      'memory_order_acq_rel',
      'memory_order_seq_cst'
    ),

    //========================================
    // 17) Concurrency & subgroups
    //========================================
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

    async_function: $ => choice(
      'async_work_group_copy',
      'async_work_group_strided_copy',
      'wait_group_events'
    ),

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

    //========================================
    // 18) Pipe and channel operations
    //========================================
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

    //========================================
    // 19) SVM operations
    //========================================
    svm_function: $ => choice(
      'svm_malloc',
      'svm_free',
      'svm_map',
      'svm_unmap',
      'svm_migrate_memory'
    ),

    //========================================
    // 20) Atomic operations with memory ordering
    //========================================
    atomic_operation: $ => seq(
      $.atomic_function,
      '(',
      $.expression,
      optional(seq(',', $.memory_order)),
      ')'
    ),

    //========================================
    // 21) Device enqueue operations
    //========================================
    enqueue_function: $ => choice(
      'enqueue_kernel',
      'get_kernel_work_group_size',
      'get_kernel_preferred_work_group_size_multiple',
      'retain_event',
      'release_event',
      'create_user_event',
      'is_valid_event'
    ),

    //========================================
    // 22) Extra qualifier rule
    //========================================
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

    //========================================
    // 23) Type declarations with qualifiers
    //========================================
    type_declaration: $ => seq(
      optional($.qualifier),
      $._type_specifier,
      $._declarator,
      ';'
    ),

    //========================================
    // 24) Comments & tokens
    //========================================
    comment: $ => token(choice(
      seq('//', /[^\n]*/),
      seq(
        '/*',
        /[^*]*\*+([^/*][^*]*\*+)*/,
        '/'
      )
    )),

    string_literal: $ => seq(
      '"',
      repeat(choice(
        /[^"\\]/,
        $.escape_sequence
      )),
      '"'
    ),

    escape_sequence: $ => /\\./,

    number_literal: $ => token(choice(
      /\d+u?l?/,              // Integer literals
      /0[xX][0-9a-fA-F]+u?l?/, // Hex literals
      /\d+\.\d*([eE][+-]?\d+)?[fh]?/, // Float literals
      /\.\d+([eE][+-]?\d+)?[fh]?/,    // Float literals starting with dot
      /\d+[eE][+-]?\d+[fh]?/          // Scientific notation
    )),

    identifier: $ => /[a-zA-Z_][a-zA-Z0-9_]*/,

    //========================================
    // 25) Additional placeholders
    //========================================
    _type_identifier: $ => prec.right(2, choice(
      /[A-Z][a-zA-Z0-9_]*(_t)?/,
      $.struct_tag
    )),
    _field_identifier: $ => prec.right(1, $.identifier),
    _statement_identifier: $ => prec.right(1, $.identifier),
    _identifier: $ => $.identifier,
    _non_case_statement: $ => prec(1, choice(
      $.expression_statement,
      $.compound_statement,
      $.if_statement,
      $.switch_statement,
      $.while_statement,
      $.do_statement,
      $.for_statement,
      $.return_statement,
      $.break_statement,
      $.continue_statement,
      $.goto_statement
    ))
  }
});

//--------------------------------------
// Helper functions for comma lists
//--------------------------------------
function commaSep(rule) {
  return optional(commaSep1(rule));
}

function commaSep1(rule) {
  return seq(rule, repeat(seq(',', rule)));
}
