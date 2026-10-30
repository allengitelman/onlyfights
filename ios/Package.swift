// swift-tools-version: 6.0
import PackageDescription
let package = Package(name: "OnlyFightsCore", platforms: [.macOS(.v13), .iOS(.v17)], products: [.library(name: "OnlyFightsCore", targets: ["OnlyFightsCore"])], targets: [.target(name: "OnlyFightsCore", path: "OnlyFights/Core"), .testTarget(name: "OnlyFightsCoreTests", dependencies: ["OnlyFightsCore"], path: "Tests")])
