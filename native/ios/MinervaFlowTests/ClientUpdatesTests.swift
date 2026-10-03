import XCTest
@testable import MinervaFlow

/// Customers read release text as plain sentences, never raw markdown.
final class ClientUpdatesTests: XCTestCase {
    func testBulletsStayBulletsAndMarkdownMarksAreDropped() {
        let lines = ClientUpdatesView.plainLines("""
        - **Votre carte** : plus lisible
        * Un [guide](https://minervaflow.app/aide) pour `vous`

        Une phrase simple.
        """)
        XCTAssertEqual(lines, [
            .init(text: "Votre carte : plus lisible", isBullet: true),
            .init(text: "Un guide pour vous", isBullet: true),
            .init(text: "Une phrase simple.", isBullet: false),
        ])
    }

    func testEmptyTextProducesNoLines() {
        XCTAssertTrue(ClientUpdatesView.plainLines("").isEmpty)
        XCTAssertTrue(ClientUpdatesView.plainLines("  \n \n").isEmpty)
    }
}
