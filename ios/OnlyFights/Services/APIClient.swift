import Foundation
struct APIError:Error,LocalizedError {var message:String;var status:Int;var code:String?;var errorDescription:String?{message}}
struct APIClient {
 static let base=URL(string:"https://onlyfists-fight-lab.allengitelman.chatgpt.site")!
 static func request<T:Decodable>(_ path:String,method:String="GET",body:Data?=nil,token:String?=nil) async throws -> T {
  var r=URLRequest(url:try apiURL(base:base,path:path));r.httpMethod=method;r.httpBody=body;r.timeoutInterval=25;r.setValue("application/json",forHTTPHeaderField:"Content-Type");if let token{r.setValue("Bearer "+token,forHTTPHeaderField:"Authorization")}
  let(data,response)=try await URLSession.shared.data(for:r);guard let http=response as? HTTPURLResponse else{throw APIError(message:"No response. Try again.",status:0)}
  guard (200..<300).contains(http.statusCode) else{let e=try? JSONDecoder().decode(ErrorBody.self,from:data);throw APIError(message:e?.error ?? "That action could not be completed.",status:http.statusCode,code:e?.code)}
  return try JSONDecoder().decode(T.self,from:data)
 }
 struct ErrorBody:Decodable{var error:String;var code:String?}
}
struct AuthConfiguration:Codable {var url:String;var key:String}
struct AppConfiguration:Decodable {var auth:AuthConfiguration?;var authReady:Bool;var instagramStoriesReady:Bool}
struct EventsResponse:Decodable{var events:[FightEvent]};struct EventResponse:Decodable{var event:FightEvent};struct GroupsResponse:Decodable{var groups:[ParlayGroup]};struct FeedResponse:Decodable{var cards:[CreatorCard];var next:String?}
struct Profile:Codable{var username:String};struct DraftResponse:Decodable{var revision:Int;var draft:PickPayload?};struct SavedDraft:Decodable{var event:String;var revision:Int;var draft:PickPayload};struct AccountResponse:Decodable{var profile:Profile?;var drafts:[SavedDraft];var tickets:[SavedTicket]};struct SavedTicket:Decodable,Identifiable{var id:String;var ticket:SavedTicketBody};struct SavedTicketBody:Decodable{var event:String;var category:String;var legs:[TicketLeg]}
struct ActionResponse:Decodable{var revision:Int?;var tailed:Bool?;var alreadyTailed:Bool?;var deleted:Bool?;var updated:Bool?;var id:String?;var received:Bool?;var profile:Profile?}
struct PickGrade:Decodable{var winner:String;var method:String?;var round:String?}
struct PickResult:Decodable{var method:String?;var round:Int?;var voidReason:String?}
struct PickOdds:Decodable{var pick:Int?;var opponent:Int?;var method:Int?;var close:Int?;var source:String?}
struct PickRecord:Decodable,Identifiable{var event:String;var eventName:String;var pick:FightPick;var shareId:String?;var grade:PickGrade;var result:PickResult?;var odds:PickOdds?;var published:Bool?;var source:String;var checkedAt:String;var id:String{event+":"+pick.fightId}}
struct WinLoss:Decodable{var won:Int;var lost:Int;var winRate:Double?;var text:String{"\(won)–\(lost)"}}
struct RecordTotals:Decodable{var picks:Int;var graded:Int;var won:Int;var lost:Int;var void:Int;var pending:Int;var winRate:Double?}
struct PropRecord:Decodable{var called:Int;var won:Int;var rate:Double?;var winnerRight:Int?;var readRate:Double?}
struct MarketRecord:Decodable{var priced:Int;var favorites:WinLoss;var underdogs:WinLoss;var upsets:Int;var expectedWins:Double;var actualWins:Int;var edge:Double?}
struct UnitsRecord:Decodable{var bets:Int;var profit:Double;var roi:Double?}
struct ClosingRecord:Decodable{var tracked:Int;var beat:Int}
struct StreakRun:Decodable{var kind:String;var length:Int}
struct StreakRecord:Decodable{var current:StreakRun?;var bestWin:Int}
struct BreakdownRow:Decodable,Identifiable{var key:String;var eventName:String?;var won:Int;var lost:Int;var winRate:Double?;var id:String{key}}
struct RecordBreakdowns:Decodable{var events:[BreakdownRow];var segments:[BreakdownRow];var weightclasses:[BreakdownRow];var formats:[BreakdownRow]}
struct RecordSummary:Decodable{var totals:RecordTotals;var locks:WinLoss;var method:PropRecord;var round:PropRecord;var perfect:Int;var market:MarketRecord;var units:UnitsRecord;var clv:ClosingRecord;var streak:StreakRecord;var form:[String];var breakdowns:RecordBreakdowns}
struct RecordsResponse:Decodable{var records:[PickRecord];var summary:RecordSummary?;var scope:String}
