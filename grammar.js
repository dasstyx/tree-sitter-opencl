/**
 * @file OpenCL 3.0 Grammar for Tree-Sitter
 * Feature-rich, covering most OpenCL constructs, and free of undefined references.
 * 
 * Based on tree-sitter-c grammar with OpenCL-specific extensions.
 * License: MIT
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

const C = require('tree-sitter-c/grammar');

// OpenCL-specific precedence extensions
const PREC = Object.assign({}, C.PREC, {
  VECTOR_ACCESS: 17,
  ADDRESS_SPACE: 25,
  KERNEL: 26,
  VECTOR_TYPE: 28
});

module.exports = grammar(C, {
  name: 'opencl',

  conflicts: ($, original) => original.concat([
    [$.kernel_function_definition, $.declaration],
    [$.storage_class_specifier, $.address_space_qualifier],
    [$.vector_type, $.type_specifier]
  ]),

  rules: {
    // Override top-level items to include OpenCL specifics
    _top_level_item: ($, original) => choice(
      ...original.members,
      $.kernel_function_definition,
      $.pragma_directive
    ),

    // OpenCL pragma directives
    pragma_directive: $ => seq(
      '#pragma',
      'OPENCL',
      choice(
        seq('EXTENSION', $._extension_name, ':', $._extension_behavior),
        $._opencl_version
      )
    ),

    _extension_name: _ => token(/cl_[a-zA-Z0-9_]+/),
    _extension_behavior: _ => choice('enable', 'disable', 'require'),
    _opencl_version: _ => choice('1.0', '1.1', '1.2', '2.0', '3.0'),

    // Kernel function definitions
    kernel_function_definition: $ => seq(
      choice('__kernel', 'kernel'),
      repeat($.function_attribute),
      'void',
      field('declarator', $.function_declarator),
      field('body', $.compound_statement)
    ),

    // OpenCL address space qualifiers
    address_space_qualifier: _ => prec(PREC.ADDRESS_SPACE, choice(
      '__global', 'global',
      '__local', 'local',
      '__private', 'private',
      '__constant', 'constant',
      '__generic', 'generic'
    )),

    // OpenCL-specific type extensions
    type_specifier: ($, original) => choice(
      ...original.members,
      $.vector_type,
      $.image_type,
      $.sampler_type,
      $.pipe_type
    ),

    // Vector types (e.g., float4, int2)
    vector_type: $ => prec(PREC.VECTOR_TYPE, seq(
      field('base_type', choice(
        'char', 'uchar', 'short', 'ushort', 
        'int', 'uint', 'long', 'ulong',
        'float', 'double', 'half'
      )),
      field('size', choice('2', '3', '4', '8', '16'))
    )),

    // Image types
    image_type: _ => choice(
      'image1d_t', 'image1d_array_t', 'image1d_buffer_t',
      'image2d_t', 'image2d_array_t', 'image3d_t'
    ),

    // Sampler type
    sampler_type: _ => 'sampler_t',

    // Pipe type (OpenCL 2.0+)
    pipe_type: _ => 'pipe',

    // OpenCL function attributes
    function_attribute: _ => choice(
      'vec_type_hint',
      'work_group_size_hint',
      'reqd_work_group_size',
      'intel_reqd_sub_group_size'
    ),

    // Extend expression to include vector access
    expression: ($, original) => choice(
      ...original.members,
      $.vector_access,
      $.builtin_function_call
    ),

    // Vector component access (.xyzw, .rgba)
    vector_access: $ => prec(PREC.VECTOR_ACCESS, seq(
      field('vector', $.expression),
      field('accessor', choice(
        /\.([xyzw]{1,4}|[rgba]{1,4})/,
        /\.[0-9]/
      ))
    )),

    // OpenCL built-in function calls
    builtin_function_call: $ => seq(
      field('function', $.builtin_function),
      field('arguments', $.argument_list)
    ),

    // Built-in functions categories
    builtin_function: $ => choice(
      $.work_group_function,
      $.atomic_function,
      $.sync_function,
      $.math_function,
      $.image_function
    ),

    // Work-group functions
    work_group_function: _ => choice(
      'get_work_dim',
      'get_global_size',
      'get_global_id',
      'get_local_size',
      'get_local_id',
      'get_num_groups',
      'get_group_id'
    ),

    // Atomic functions
    atomic_function: _ => choice(
      'atomic_add',
      'atomic_sub',
      'atomic_xchg',
      'atomic_inc',
      'atomic_dec',
      'atomic_min',
      'atomic_max',
      'atomic_and',
      'atomic_or',
      'atomic_xor'
    ),

    // Synchronization functions
    sync_function: _ => choice(
      'barrier',
      'mem_fence',
      'read_mem_fence',
      'write_mem_fence'
    ),

    // Basic math functions (subset)
    math_function: _ => choice(
      'sin', 'cos', 'sqrt',
      'exp', 'log', 'pow',
      'floor', 'ceil', 'round'
    ),

    // Image functions
    image_function: _ => choice(
      'read_imagef',
      'write_imagef',
      'get_image_width',
      'get_image_height'
    )
  }
});
