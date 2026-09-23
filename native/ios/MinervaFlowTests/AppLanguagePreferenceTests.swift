import XCTest
@testable import MinervaFlow

final class AppLanguagePreferenceTests: XCTestCase {
    func testFrenchIsPersistedOnFirstLaunch() {
        let suiteName = "MinervaFlowTests.appLanguage.\(UUID().uuidString)"
        let defaults = UserDefaults(suiteName: suiteName)!
        defer { defaults.removePersistentDomain(forName: suiteName) }

        AppLanguagePreference.ensureFrenchDefault(in: defaults)

        XCTAssertEqual(defaults.string(forKey: AppLanguagePreference.key), AppLanguage.fr.rawValue)
    }

    func testExplicitEnglishPreferenceIsPreserved() {
        let suiteName = "MinervaFlowTests.appLanguage.\(UUID().uuidString)"
        let defaults = UserDefaults(suiteName: suiteName)!
        defer { defaults.removePersistentDomain(forName: suiteName) }
        defaults.set(AppLanguage.en.rawValue, forKey: AppLanguagePreference.key)

        AppLanguagePreference.ensureFrenchDefault(in: defaults)

        XCTAssertEqual(defaults.string(forKey: AppLanguagePreference.key), AppLanguage.en.rawValue)
    }
}
