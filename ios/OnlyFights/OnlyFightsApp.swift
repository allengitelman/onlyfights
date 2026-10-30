import SwiftUI
@main struct OnlyFightsApp:App {
 @StateObject private var store=AppStore()
 var body:some Scene {WindowGroup{RootView().environmentObject(store).preferredColorScheme(.dark).tint(Color(red:0.78,green:0.95,blue:0.4)).task{await store.start()}.onOpenURL{store.openShared($0)}}}
}
struct RootView:View {
 @EnvironmentObject var store:AppStore
 var body:some View{TabView(selection:$store.tab){NavigationStack{CardView()}.tabItem{Label("Fight Card",systemImage:"figure.boxing")}.tag(0);NavigationStack{ParlaysView()}.tabItem{Label("Parlays",systemImage:"square.stack.3d.up")}.tag(1);NavigationStack{FriendsView()}.tabItem{Label("Friends",systemImage:"person.2")}.tag(2);NavigationStack{ProfileView()}.tabItem{Label("Profile",systemImage:"person.crop.circle")}.tag(3)}.sheet(isPresented:$store.showLogin){LoginView()}.sheet(isPresented:$store.showPoster){PosterSheet()}.alert("OnlyFights",isPresented:Binding(get:{store.message != nil},set:{if !$0{store.message=nil}})){Button("OK"){store.message=nil}}message:{Text(store.message ?? "")}}
}
