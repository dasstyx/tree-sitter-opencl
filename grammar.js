/**
 * @file OpenCL 3.0 Grammar for Tree-Sitter
 * Based on tree-sitter-c with OpenCL-specific extensions.
 *
 * This grammar reuses most of the C grammar and extends it to support:
 *  - Kernel function definitions (with __kernel / kernel qualifier)
 *  - OpenCL address space qualifiers (e.g. __global, __local, etc.)
 *  - OpenCL built-in types (images, samplers, pipes, vectors)
 *  - OpenCL-specific pragmas
 *
 * Author: <Your Name>
 * License: MIT
 */

const C = require('tree-sitter-c/grammar');

// Extend the C precedence levels with additional OpenCL levels
const PREC = Object.assign({}, C.PREC, {
  VECTOR_ACCESS: 17,
  ADDRESS_SPACE: 25,
  KERNEL: 26,
  // If needed, assign a separate level for vector type constructions;
  // Otherwise, you might reuse CALL precedence.
  VECTOR_TYPE: 28,
  TYPE_CAST: 29,
  COMPOUND_LITERAL: 30,
  PARAMETER_LIST: 31,
});

module.exports = grammar(C, {
  name: 'opencl',

  conflicts: ($, original) => original.concat([
    // Resolve conflicts between storage class and address space qualifiers
    [$.storage_class_specifier, $.address_space_qualifier],
    // (Other conflicts may be removed if deemed unnecessary after testing.)
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
    // OpenCL kernel functions must be declared with the __kernel or kernel qualifier,
    // usually have a void return type, and can include additional qualifiers.
    kernel_function_definition: $ => seq(
      choice('__kernel', 'kernel'),
      // Allow optional OpenCL-specific attributes (e.g. work group hints)
      repeat($.function_attribute),
      // Enforce void return type for kernel functions
      'void',
      field('declarator', $.function_declarator),
      field('body', $.compound_statement)
    ),

    // --- OpenCL-Specific Qualifiers ---
    address_space_qualifier: _ => prec(PREC.ADDRESS_SPACE, choice(
      '__global', 'global',
      '__local', 'local',
      '__private', 'private',
      '__constant', 'constant',
      '__generic', 'generic'
    )),

    // Optionally, if needed, define additional OpenCL access qualifiers:
    // (These can also be defined as part of type qualifiers if desired.)
    // access_qualifier: _ => choice('__read_only', 'read_only', '__write_only', 'write_only', '__read_write', 'read_write'),

    // --- Type System Extensions ---
    // Extend the base C type_specifier with OpenCL-specific types.
    type_specifier: ($, original) => choice(
      ...original.members,
      // OpenCL built-in types
      'sampler_t',
      'image1d_t', 'image1d_array_t', 'image1d_buffer_t',
      'image2d_t', 'image2d_array_t',
      'image3d_t',
      'pipe'
    ),

    // Vector types (e.g. float4, int8) are common in OpenCL.
    // Here we define a vector_type; you may choose to merge this with type_specifier
    // or treat vector types as a kind of function call (constructor) on a basic type.
    vector_type: $ => prec(PREC.VECTOR_TYPE, seq(
      field('base_type', choice(
        'char', 'uchar', 'short', 'ushort',
        'int', 'uint', 'long', 'ulong',
        'float', 'double', 'half'
      )),
      field('size', choice('2', '3', '4', '8', '16'))
    )),

    // --- Built-in Functions ---
    // Extend expression rules by adding OpenCL built-in function calls.
    // Most function calls will be parsed using C’s call_expression,
    // so here we add an alternative that recognizes known OpenCL built-ins.
    builtin_function_call: $ => seq(
      field('function', $.builtin_function),
      field('arguments', $.argument_list)
    ),

    builtin_function: $ => choice(
      $.work_group_function,
      $.atomic_function,
      $.sync_function,
      $.math_function,
      $.image_function
    ),

    work_group_function: _ => choice(
      'get_work_dim',
      'get_global_size',
      'get_global_id',
      'get_local_size',
      'get_local_id',
      'get_num_groups',
      'get_group_id'
    ),

    atomic_function: _ => choice(
      'atomic_add', 'atomic_sub',
      'atomic_xchg', 'atomic_inc', 'atomic_dec',
      'atomic_min', 'atomic_max',
      'atomic_and', 'atomic_or', 'atomic_xor'
    ),

    sync_function: _ => choice(
      'barrier',
      'mem_fence',
      'read_mem_fence',
      'write_mem_fence'
    ),

    math_function: _ => choice(
      'sin', 'cos', 'sqrt',
      'exp', 'log', 'pow',
      'floor', 'ceil', 'round'
    ),

    image_function: _ => choice(
      'read_imagef',
      'write_imagef',
      'get_image_width',
      'get_image_height'
    ),

    // --- Function Attributes ---
    function_attribute: _ => choice(
      'vec_type_hint',
      'work_group_size_hint',
      'reqd_work_group_size',
      'intel_reqd_sub_group_size'
    ),

    // --- Vector Access ---
    vector_access: $ => prec(PREC.VECTOR_ACCESS, seq(
      field('vector', $.expression),
      field('accessor', choice(
        /\.([xyzw]{1,4}|[rgba]{1,4})/,
        /\.[0-9]/
      ))
    )),

    // --- Expression Extension ---
    // Extend the base C expression rule by including vector access and builtin function calls.
    expression: ($, original) => choice(
      ...original.members,
      $.vector_access,
      $.builtin_function_call
    ),

    // --- Reuse all other rules from tree-sitter-c ---
    // The remainder of the grammar (declarations, control flow, expressions, etc.)
    // is inherited from tree-sitter-c and will not be redefined here.
  }
});

// Helper functions for comma-separated lists
function commaSep(rule) {
  return optional(commaSep1(rule));
}

function commaSep1(rule) {
  return seq(rule, repeat(seq(',', rule)));
}
