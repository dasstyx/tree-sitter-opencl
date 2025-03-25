/**
 * @file OpenCL 3.0 Grammar for Tree-Sitter
 * Based on tree-sitter-c with OpenCL-specific extensions.
 */

const C = require('tree-sitter-c/grammar');

// Extend C precedence levels
const PREC = Object.assign({}, C.PREC, {
  VECTOR: C.PREC.CALL + 1,
  OPENCL_ATTR: C.PREC.CALL + 2
});

module.exports = grammar(C, {
  name: 'opencl',

  conflicts: ($, original) => original.concat([
    [$.function_definition, $.declaration],
    [$.declaration]
  ]),

  rules: {
    // --- Top-Level Items ---
    _top_level_item: ($, original) => choice(
      ...original.members,
      $.kernel_function_definition,
      $.opencl_pragma_directive
    ),

    // --- OpenCL Pragma Directives ---
    opencl_pragma_directive: $ => seq(
      '#pragma',
      'OPENCL',
      choice(
        seq('EXTENSION', $.identifier, ':', choice('enable', 'disable', 'require', 'warn')),
        choice('1.0', '1.1', '1.2', '2.0', '3.0')
      )
    ),

    // --- Kernel Function Definition ---
    kernel_function_definition: $ => prec(2, seq(
      choice('__kernel', 'kernel'),
      repeat($.function_attribute),
      field('type', $.type_specifier),
      field('declarator', $.function_declarator),
      field('body', $.compound_statement)
    )),

    // --- Function Attributes (for kernel hints) ---
    function_attribute: _ => choice(
      'vec_type_hint',
      'work_group_size_hint',
      'reqd_work_group_size',
      'intel_reqd_sub_group_size'
    ),

    // --- Storage and Qualifiers ---
    declaration: ($, original) => 
      choice(
        seq(
          repeat(choice(
            // Storage class and access qualifiers as tokens
            alias('__kernel', $.storage_qualifier),
            alias('kernel', $.storage_qualifier),
            alias('__global', $.storage_qualifier),
            alias('global', $.storage_qualifier),
            alias('__local', $.storage_qualifier),
            alias('local', $.storage_qualifier),
            alias('__private', $.storage_qualifier),
            alias('private', $.storage_qualifier),
            alias('__constant', $.storage_qualifier),
            alias('constant', $.storage_qualifier),
            alias('__generic', $.storage_qualifier),
            alias('generic', $.storage_qualifier),
            alias('__read_only', $.access_qualifier),
            alias('read_only', $.access_qualifier),
            alias('__write_only', $.access_qualifier),
            alias('write_only', $.access_qualifier),
            alias('__read_write', $.access_qualifier),
            alias('read_write', $.access_qualifier)
          )),
          original
        ),
        original
      ),

    // --- Extend Type Specifiers with OpenCL Types ---
    type_specifier: ($, original) => choice(
      ...original.members,
      $.vector_type,
      'sampler_t',
      'image1d_t', 'image1d_array_t', 'image1d_buffer_t',
      'image2d_t', 'image2d_array_t',
      'image3d_t',
      'pipe'
    ),

    // --- Improved Vector Type (fixed regex) ---
    vector_type: _ => token(choice(
      /[u]?char(2|3|4|8|16)/,
      /[u]?short(2|3|4|8|16)/,
      /[u]?int(2|3|4|8|16)/,
      /[u]?long(2|3|4|8|16)/,
      /float(2|3|4|8|16)/,
      /double(2|3|4|8|16)/,
      /half(2|3|4|8|16)/
    )),

    // --- Expression Extensions ---
    expression: ($, original) => choice(
      ...original.members,
      $.builtin_function_call,
      // Vector access is handled through field_expression
    ),

    // Override field_expression to handle both struct fields and vector components
    field_expression: ($, original) => choice(
      // Original C field access
      original,
      // Vector component access (must come after original to avoid conflicts)
      prec.right(PREC.FIELD + 1, seq(
        field('argument', $.expression),
        field('operator', '.'),
        field('component', token(choice(
          /[xyzw]{1,4}/,
          /[rgba]{1,4}/
        )))
      ))
    ),

    // --- Built-in Function Calls ---
    builtin_function_call: $ => seq(
      field('function', $.builtin_function),
      field('arguments', $.argument_list)
    ),

    builtin_function: _ => choice(
      // Work-group functions
      'get_work_dim', 'get_global_size', 'get_global_id',
      'get_local_size', 'get_local_id', 'get_num_groups', 'get_group_id',
      // Atomic functions
      'atomic_add', 'atomic_sub', 'atomic_inc', 'atomic_dec',
      'atomic_min', 'atomic_max', 'atomic_and', 'atomic_or', 'atomic_xor',
      // Synchronization functions
      'barrier', 'mem_fence', 'read_mem_fence', 'write_mem_fence',
      // Image functions
      'read_imagef', 'write_imagef', 'get_image_width', 'get_image_height',
      // Vector load functions
      /vload[2348][1]?[6]?/,
      'vload_half',
      /vload_half[2348][1]?[6]?/,
      /vloada_half[2348][1]?[6]?/,
      
      // Vector store functions
      /vstore[2348][1]?[6]?/,
      'vstore_half',
      /vstore_half[2348][1]?[6]?/,
      /vstorea_half[2348][1]?[6]?/,
      
      // Vector store with rounding modes
      /vstore_half_(rte|rtz|rtp|rtn)/,
      /vstore_half[2348][1]?[6]?_(rte|rtz|rtp|rtn)/,
      /vstorea_half[2348][1]?[6]?_(rte|rtz|rtp|rtn)/
    ),

    // --- OpenCL Attributes ---
    opencl_attribute: $ => prec(PREC.OPENCL_ATTR, seq(
      '__attribute__',
      '(',
      '(',
      choice(
        seq('aligned', '(', $.number_literal, ')'),
        seq('aligned', '(', ')'),
        'packed',
        seq('endian', '(', choice('host', 'device'), ')'),
        'nosvm'
      ),
      ')',
      ')'
    )),

    // Extend C's declaration specifiers with OpenCL attributes and resolve associativity
    _declaration_specifiers: ($, original) => prec.right(1, seq(
      repeat(choice(
        $._declaration_modifiers,
        $.opencl_attribute
      )),
      field('type', $.type_specifier),
      repeat(choice(
        $._declaration_modifiers,
        $.opencl_attribute
      ))
    ))
  }
});

