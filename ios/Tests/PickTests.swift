import XCTest
@testable import OnlyFightsCore
final class PickTests: XCTestCase {
 func testQueriesAreNotEncodedIntoThePath()throws{let u=try apiURL(base:URL(string:"https://example.test")!,path:"feed?following=1&before=a%7Cb");XCTAssertEqual(u.path,"/api/v1/feed");XCTAssertEqual(URLComponents(url:u,resolvingAgainstBaseURL:false)?.queryItems?.first?.value,"1");XCTAssertFalse(u.path.contains("?"))}
 func testSameFighterTogglesOff() { var picks=PickSelection();picks.choose(fightID:"10",athleteID:"1",opponentID:"2");XCTAssertEqual(picks.values.count,1);picks.choose(fightID:"10",athleteID:"1",opponentID:"2");XCTAssertTrue(picks.values.isEmpty) }
 func testMethodAndRoundStayValid() {var p=PickSelection();p.choose(fightID:"10",athleteID:"1",opponentID:"2");p.method("Submission",for:"10");p.round(2,for:"10",maximum:3);XCTAssertEqual(p.values["10"]?.round,2);p.method("Decision",for:"10");XCTAssertNil(p.values["10"]?.round);p.round(1,for:"10",maximum:3);XCTAssertNil(p.values["10"]?.round)}
 func testLockNeedsAPick() {var p=PickSelection();p.toggleLock("10");XCTAssertTrue(p.values.isEmpty);p.choose(fightID:"10",athleteID:"1",opponentID:"2");p.toggleLock("10");XCTAssertEqual(p.values["10"]?.lock,true)}
 func testServerDecodeAndOdds() throws {let json="""
 {"id":"1","name":"UFC Test","date":"2026-10-31","fights":[{"id":"10","segment":"Main Card","weightclass":"Lightweight","rounds":3,"fighters":[{"id":"1","name":"A"},{"id":"2","name":"B"}],"quote":{"fighters":{"1":{"ml":-200,"methods":{}}},"source":"Book","checkedAt":"2026-10-30"}}]}
 """;let e=try JSONDecoder().decode(FightEvent.self,from:Data(json.utf8));XCTAssertEqual(e.fights.first?.fighters.first?.id,"1");XCTAssertEqual(americanOdds(1.5),"−200");XCTAssertEqual(americanOdds(5),"+400");XCTAssertEqual(americanOdds(nil),"Unpriced")}
}
