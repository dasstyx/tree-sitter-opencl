package tree_sitter_opencl_test

import (
	"testing"

	tree_sitter "github.com/tree-sitter/go-tree-sitter"
	tree_sitter_opencl "github.com/tree-sitter/tree-sitter-opencl/bindings/go"
)

func TestCanLoadGrammar(t *testing.T) {
	language := tree_sitter.NewLanguage(tree_sitter_opencl.Language())
	if language == nil {
		t.Errorf("Error loading OpenCL grammar")
	}
}
