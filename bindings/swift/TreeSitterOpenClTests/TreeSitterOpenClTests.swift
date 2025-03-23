import XCTest
import SwiftTreeSitter
import TreeSitterOpencl

final class TreeSitterOpenclTests: XCTestCase {
    func testCanLoadGrammar() throws {
        let parser = Parser()
        let language = Language(language: tree_sitter_opencl())
        XCTAssertNoThrow(try parser.setLanguage(language),
                         "Error loading OpenCL grammar")
    }
}
