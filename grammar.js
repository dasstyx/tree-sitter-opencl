// grammar.js

const C = require('tree-sitter-c/grammar');

module.exports = grammar(C, {
  name: 'opencl',

  rules: {
    _top_level_item: ($, original) => choice(
      ...original.members,
      $.kernel_function_definition,
      $.opencl_pragma_directive
    ),

    opencl_pragma_directive: $ => seq(
      '#pragma',
      'OPENCL',
      choice(
        seq('EXTENSION', $.identifier, ':', choice('enable', 'disable', 'require', 'warn')),
        choice('1.0', '1.1', '1.2', '2.0', '3.0')
      )
    ),

    kernel_function_definition: $ => seq(
      $.kernel_qualifier,
      repeat($.function_attribute),
      field('type', $.type_specifier),
      field('declarator', $.function_declarator),
      field('body', $.compound_statement)
    ),

    function_attribute: _ => choice(
      'vec_type_hint',
      'work_group_size_hint',
      'reqd_work_group_size',
      'intel_reqd_sub_group_size'
    ),

    // Explicitly define qualifier rules:
    kernel_qualifier: _ => choice('__kernel', 'kernel'),

    address_space_qualifier: _ => choice(
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

    declaration: ($, original) => seq(
      repeat(choice(
        $.kernel_qualifier,
        $.address_space_qualifier,
        $.access_qualifier
      )),
      original
    ),

    type_specifier: ($, original) => choice(
      ...original.members,
      $.vector_type,
      'sampler_t',
      'image1d_t', 'image1d_array_t', 'image1d_buffer_t',
      'image2d_t', 'image2d_array_t',
      'image3d_t',
      'pipe'
    ),

    vector_type: _ => token(choice(
      /[u]?char(2|3|4|8|16)/,
      /[u]?short(2|3|4|8|16)/,
      /[u]?int(2|3|4|8|16)/,
      /[u]?long(2|3|4|8|16)/,
      /float(2|3|4|8|16)/,
      /double(2|3|4|8|16)/,
      /half(2|3|4|8|16)/
    )),

    field_expression: ($, original) => choice(
      original,
      seq(
        field('argument', $.expression),
        '.',
        field('component', token(choice(/[xyzw]{1,4}/, /[rgba]{1,4}/)))
      )
    ),

    builtin_function_call: $ => seq(
      field('function', $.builtin_function),
      field('arguments', $.argument_list)
    ),

    builtin_function: _ => /[a-zA-Z_]\w*/,

    opencl_attribute: $ => seq(
      '__attribute__', '((',
      choice(
        seq('aligned', '(', $.number_literal, ')'),
        seq('aligned', '(', ')'),
        'packed',
        seq('endian', '(', choice('host', 'device'), ')'),
        'nosvm'
      ),
      '))'
    ),

    _declaration_specifiers: ($, original) => seq(
      repeat(choice($._declaration_modifiers, $.opencl_attribute)),
      field('type', $.type_specifier),
      repeat(choice($._declaration_modifiers, $.opencl_attribute))
    ),
  }
});
