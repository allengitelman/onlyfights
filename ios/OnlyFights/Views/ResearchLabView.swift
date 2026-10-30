import SwiftUI
import WebKit
// Reuse the actual trained research engine rather than inventing a separate native likelihood score.
struct ResearchLabView:UIViewRepresentable {
 let payload:PickPayload
 func makeUIView(context:Context)->WKWebView {
  let configuration=WKWebViewConfiguration();let data=(try? JSONEncoder().encode(payload)) ?? Data();let encoded=data.base64EncodedString()
  let script="""
  (()=>{let attempts=0;const timer=setInterval(()=>{if(++attempts>240){clearInterval(timer);return}try{const p=JSON.parse(atob('\(encoded)'));if(typeof currentCard!=='undefined'&&currentCard.id===p.event&&typeof liveLoading!=='undefined'&&!liveLoading&&typeof generate==='function'){picks=mapPicks(p.picks);render();generate();clearInterval(timer)}}catch{clearInterval(timer)}},250)})();
  """
  configuration.userContentController.addUserScript(WKUserScript(source:script,injectionTime:.atDocumentEnd,forMainFrameOnly:true));let web=WKWebView(frame:.zero,configuration:configuration);web.isInspectable=false;web.load(URLRequest(url:APIClient.base.appending(queryItems:[URLQueryItem(name:"card",value:payload.event)])));return web
 }
 func updateUIView(_ uiView:WKWebView,context:Context){}
}
