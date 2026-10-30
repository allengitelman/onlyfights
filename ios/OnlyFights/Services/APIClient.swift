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
struct PickRecord:Decodable,Identifiable{var event:String;var eventName:String;var pick:FightPick;var shareId:String;var grade:PickGrade;var source:String;var checkedAt:String;var id:String{event+":"+pick.fightId}}
struct RecordsResponse:Decodable{var records:[PickRecord];var scope:String}
