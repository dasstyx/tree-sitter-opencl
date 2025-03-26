/**
 * @file OpenCL 3.0 Grammar for Tree-Sitter
 * Extends tree-sitter-c with OpenCL-specific keywords and qualifiers.
 *
 * This example ensures that for address space, access, and kernel qualifiers,
 * we define node names that can be used in the highlights query.
 */

const C = require('tree-sitter-c/grammar');

// Extend C precedence levels
const PREC = Object.assign({}, C.PREC, {
  VECTOR: C.PREC.CALL + 1,
  OPENCL_ATTR: C.PREC.CALL + 2,
});

module.exports = grammar(C, {
  name: 'opencl',

  // We can define new rules or override existing rules here.
  conflicts: ($, original) => original.concat([
    // If needed, add or remove conflicts for complex OpenCL patterns.
  ]),

  rules: {
    // Let’s keep C’s top-level items but also allow kernel functions & OpenCL pragmas
    _top_level_item: ($, original) => choice(
      ...original.members,
      $.kernel_function_definition,
      $.opencl_pragma_directive
    ),

    // #pragma OPENCL EXTENSION ...
    opencl_pragma_directive: $ => seq(
      '#pragma',
      'OPENCL',
      choice(
        seq('EXTENSION', $.identifier, ':', choice('enable', 'disable', 'require', 'warn')),
        choice('1.0', '1.1', '1.2', '2.0', '3.0')
      )
    ),

    /**
     * kernel_function_definition
     *
     * e.g.:
     *  __kernel void foo(...) { ... }
     *  kernel void foo(...) { ... }
     */
    kernel_function_definition: $ => prec(2, seq(
      choice('__kernel', 'kernel'),
      repeat($.function_attribute),
      field('type', $.type_specifier),
      field('declarator', $.function_declarator),
      field('body', $.compound_statement)
    )),

    function_attribute: _ => choice(
      'vec_type_hint',
      'work_group_size_hint',
      'reqd_work_group_size',
      'intel_reqd_sub_group_size'
    ),

    /**
     * Override the default declaration rule so we can parse
     * OpenCL qualifiers in front of typical declarations:
     *
     * e.g.:
     *  __global int *ptr;
     *  constant float bar = ...;
     *  read_only image2d_t img;
     *
     * We'll define distinct node types so we can highlight them:
     *   - kernel_qualifier
     *   - address_space_qualifier
     *   - access_qualifier
     *
     * Then the highlight query can refer to these node types safely.
     */
    declaration: ($, original) => choice(
      seq(
        repeat(choice(
          alias(choice('__kernel', 'kernel'), $.kernel_qualifier),
          alias(choice('__global', '__local', '__private', '__constant', '__generic',
                       'global', 'local', 'private', 'constant', 'generic'),
                $.address_space_qualifier),
          alias(choice('__read_only', '__write_only', '__read_write',
                       'read_only', 'write_only', 'read_write'),
                $.access_qualifier)
        )),
        original
      ),
      original
    ),

    // Extend type specifiers with OpenCL types
    type_specifier: ($, original) => choice(
      ...original.members,
      $.vector_type,
      'sampler_t',
      'image1d_t', 'image1d_array_t', 'image1d_buffer_t',
      'image2d_t', 'image2d_array_t',
      'image3d_t',
      'pipe'
    ),

    // Vector type pattern matching
    vector_type: _ => token(choice(
      /[u]?char(2|3|4|8|16)/,
      /[u]?short(2|3|4|8|16)/,
      /[u]?int(2|3|4|8|16)/,
      /[u]?long(2|3|4|8|16)/,
      /float(2|3|4|8|16)/,
      /double(2|3|4|8|16)/,
      /half(2|3|4|8|16)/
    )),

    // For vector component swizzling, override field_expression
    field_expression: ($, original) => choice(
      original,
      prec.right(PREC.FIELD + 1, seq(
        field('argument', $.expression),
        field('operator', '.'),
        field('component', token(choice(/[xyzw]{1,4}/, /[rgba]{1,4}/)))
      ))
    ),

    // Built-in function calls
    builtin_function_call: $ => seq(
      field('function', $.builtin_function),
      field('arguments', $.argument_list)
    ),

    // List of recognized builtin_function for highlighting
    builtin_function: _ => choice(
      // Example subset of possible functions
      'get_work_dim', 'get_global_id', 'get_local_id',
      'barrier', 'mem_fence',
      /vload[2348][1]?[6]?/,
      /vstore[2348][1]?[6]?/
      // (extend as needed)
    ),

    // Example: an OpenCL attribute extension, e.g. __attribute__((aligned(16)))
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

    /**
     * Extend or override how C's declaration specifiers are parsed,
     * to allow opencl_attribute. This ensures things like:
     *   __attribute__((aligned(16))) int foo;
     */
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
    )),
  },
});
