import SwiftUI
// Every number comes from GET me/record; the server grades and aggregates.
struct RecordHistoryView:View {
 @EnvironmentObject var store:AppStore;@State private var response:RecordsResponse?
 private func pct(_ v:Double?)->String{v.map{"\(Int(($0*100).rounded()))%"} ?? "—"}
 private func signed(_ v:Double?,_ digits:Int=1)->String{guard let v else{return "—"};return (v>0 ? "+":v<0 ? "−":"")+String(format:"%.\(digits)f",abs(v))}
 private func odds(_ a:Int?)->String{guard let a else{return "—"};return a>0 ? "+\(a)":"\(a)"}
 private func tile(_ label:String,_ value:String,_ note:String="")->some View{VStack(alignment:.leading,spacing:3){Text(label.uppercased()).font(.caption2).foregroundStyle(.secondary);Text(value).font(.title3.bold());if !note.isEmpty{Text(note).font(.caption2).foregroundStyle(.secondary)}}.frame(maxWidth:.infinity,alignment:.leading)}
 private func breakdown(_ title:String,_ rows:[BreakdownRow])->some View{Section(title){ForEach(rows.filter{$0.won+$0.lost>0}){r in HStack{Text(r.eventName ?? r.key);Spacer();Text("\(r.won)–\(r.lost)").bold();Text(pct(r.winRate)).font(.caption).foregroundStyle(.secondary).frame(width:44,alignment:.trailing)}}}}
 private func gradeLabel(_ r:PickRecord)->String{switch r.grade.winner{case "won":return "WON";case "lost":return "LOST";case "void":return "VOID";default:return "PENDING"}}
 var body:some View{List{
  if let s=response?.summary,s.totals.picks>0{
   Section{VStack(alignment:.leading,spacing:8){HStack(alignment:.firstTextBaseline){Text("\(s.totals.won)–\(s.totals.lost)").font(.system(size:44,weight:.heavy));Text(pct(s.totals.winRate)+" winners").foregroundStyle(.secondary)}
    if s.market.priced>0{Text("The odds expected \(String(format:"%.2f",s.market.expectedWins)) wins from \(s.market.priced) priced picks. You got \(s.market.actualWins).").font(.subheadline)}
    Text("\(s.totals.pending) pending · \(s.totals.void) void").font(.caption).foregroundStyle(.secondary)
    if !s.form.isEmpty{HStack(spacing:4){ForEach(Array(s.form.enumerated()),id:\.offset){_,k in Text(k).font(.caption.bold()).frame(width:22,height:22).background(k=="W" ? Color.green.opacity(0.35):Color.red.opacity(0.3)).clipShape(RoundedRectangle(cornerRadius:5))}}}}}
   Section("How you pick"){
    Grid(alignment:.leading,horizontalSpacing:16,verticalSpacing:14){
     GridRow{tile("Vs. the market",signed(s.market.edge)+" wins","Actual minus expected");tile("Hypothetical units",signed(s.units.profit,2)+"u",s.units.bets>0 ? signed(s.units.roi.map{$0*100})+"% ROI · not a wager":"")}
     GridRow{tile("Underdogs",s.market.underdogs.text,"\(s.market.upsets) upsets called");tile("Favorites",s.market.favorites.text,pct(s.market.favorites.winRate))}
     GridRow{tile("Method reads",s.method.called>0 ? "\(s.method.won) of \(s.method.called)":"—",s.method.winnerRight.map{$0>0 ? "Right finish on "+pct(s.method.readRate)+" of correct winners":""} ?? "");tile("Round calls",s.round.called>0 ? "\(s.round.won) of \(s.round.called)":"—",s.perfect>0 ? "\(s.perfect) perfect":"")}
     GridRow{tile("Locks",s.locks.text,pct(s.locks.winRate));tile("Beat the close",s.clv.tracked>0 ? "\(s.clv.beat) of \(s.clv.tracked)":"—","Odds moved your way")}
     GridRow{tile("Streak",s.streak.current.map{"\($0.length)\($0.kind)"} ?? "—","Best win streak \(s.streak.bestWin)");Color.clear}
    }.padding(.vertical,4)}
   breakdown("By card",Array(s.breakdowns.events.prefix(8)));breakdown("By card section",s.breakdowns.segments);breakdown("Scheduled length",s.breakdowns.formats);breakdown("By weight class",s.breakdowns.weightclasses)
  }else if response != nil{Section{Text("Your record starts with your next pick.").font(.headline);Text("Save picks to your account before a fight starts. Each one locks when that fight begins and is graded automatically.").font(.caption).foregroundStyle(.secondary)}}
  if let records=response?.records,!records.isEmpty{Section("Every pick"){ForEach(records){r in HStack(alignment:.top){VStack(alignment:.leading,spacing:3){Text((r.pick.lock ? "🔒 ":"")+(r.pick.fighter ?? "Fighter")).font(.headline);Text("over "+(r.pick.opponent ?? "opponent")+" · "+r.eventName).font(.caption).foregroundStyle(.secondary);Text((r.pick.method ?? "To win")+(r.pick.round.map{" · R\($0)"} ?? "")+((r.published ?? false) ? " · Public":"")).font(.caption)
     if let o=r.odds,o.pick != nil{Text(odds(o.pick)+(o.close.map{" → closed "+odds($0)} ?? "")).font(.caption2).foregroundStyle(.secondary)}
     if let res=r.result{Text(res.voidReason.map{$0.replacingOccurrences(of:"_",with:" ").capitalized} ?? [res.method,res.round.map{"R\($0)"}].compactMap{$0}.joined(separator:" · ")).font(.caption2).foregroundStyle(.secondary)}}
    Spacer();Text(gradeLabel(r)).font(.caption.bold()).padding(.horizontal,8).padding(.vertical,4).background(r.grade.winner=="won" ? Color.green.opacity(0.3):r.grade.winner=="lost" ? Color.red.opacity(0.3):Color.secondary.opacity(0.2)).clipShape(Capsule())}}}}
  if let scope=response?.scope{Section{Text(scope).font(.caption).foregroundStyle(.secondary)}}
 }.navigationTitle("Your record").task{store.run{response=try await APIClient.request("me/record",token:store.token())}}}
}
