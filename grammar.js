/**
 * @file OpenCL 3.0 Grammar for Tree-Sitter
 * Based on tree-sitter-c with OpenCL-specific extensions.
 */

const C = require('tree-sitter-c/grammar');

// Extend C precedence levels with OpenCL-specific ones
const PREC = Object.assign({}, C.PREC, {
  VECTOR: C.PREC.CALL + 1, // Higher than CALL but lower than FIELD
});

module.exports = grammar(C, {
  name: 'opencl',

  // Minimal conflicts: Merge storage class and access qualifiers.
  conflicts: ($, original) => original.concat([
    [$.storage_class_specifier, $.access_qualifier],
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
    // Merge OpenCL address spaces into storage_class_specifier.
    storage_class_specifier: ($, original) => choice(
      ...original.members,
      '__global', 'global',
      '__local', 'local',
      '__private', 'private',
      '__constant', 'constant',
      '__generic', 'generic'
    ),

    access_qualifier: _ => choice(
      '__read_only', 'read_only',
      '__write_only', 'write_only',
      '__read_write', 'read_write'
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
      'read_imagef', 'write_imagef', 'get_image_width', 'get_image_height'
      // Expand this list to cover all OpenCL built-ins as needed.
    )
  }
});
