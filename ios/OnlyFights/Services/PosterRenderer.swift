import UIKit
struct PosterHit:Identifiable {var id:String;var rect:CGRect}
struct PosterArtifact {var image:UIImage;var hits:[PosterHit]}
@MainActor enum PosterRenderer {
 static func make(event:FightEvent,picks:PickSelection,username:String?,photos:[String:UIImage])->PosterArtifact {
  let size=CGSize(width:1080,height:1350),green=UIColor(red:0.78,green:0.95,blue:0.4,alpha:1),gold=UIColor(red:0.96,green:0.75,blue:0.35,alpha:1);var hits:[PosterHit]=[]
  let format=UIGraphicsImageRendererFormat();format.scale=1;format.opaque=true
  let image=UIGraphicsImageRenderer(size:size,format:format).image{renderer in
   let c=renderer.cgContext;c.setFillColor(UIColor(red:0.025,green:0.035,blue:0.03,alpha:1).cgColor);c.fill(CGRect(origin:.zero,size:size));UIImage(named:"poster-background")?.draw(in:CGRect(origin:.zero,size:size));c.setFillColor(UIColor.black.withAlphaComponent(0.45).cgColor);c.fill(CGRect(origin:.zero,size:size))
   func text(_ value:String,_ rect:CGRect,_ font:CGFloat,_ color:UIColor = .white,_ weight:UIFont.Weight = .bold){let style=NSMutableParagraphStyle();style.lineBreakMode = .byTruncatingTail;value.draw(in:rect,withAttributes:[.font:UIFont.systemFont(ofSize:font,weight:weight),.foregroundColor:color,.paragraphStyle:style])}
   text("ONLYFIGHTS",CGRect(x:48,y:35,width:984,height:60),48,green);text(username.map{"@\($0)’S PICKS"} ?? "MY FIGHT NIGHT PICKS",CGRect(x:48,y:99,width:984,height:50),31);text(event.name,CGRect(x:48,y:152,width:984,height:80),40);text(String(event.date.prefix(10)),CGRect(x:48,y:223,width:984,height:28),22,.lightGray)
   let segments=["Main Card","Prelims","Early Prelims","Fight card"].filter{s in event.fights.contains{$0.segment==s}},count=max(1,event.fights.count),row=min(135.0,(930.0-Double(segments.count)*32)/Double(count));var y=270.0
   for segment in segments {text(segment.uppercased(),CGRect(x:48,y:y,width:984,height:28),21,green);y+=32;for f in event.fights.filter({$0.segment==segment}) {
    for (index,a) in f.fighters.enumerated(){let x=48+Double(index)*500,rect=CGRect(x:x,y:y,width:484,height:row-6),selected=picks.values[f.id]?.athleteId==a.id,locked=selected&&picks.values[f.id]?.lock==true,color=locked ? gold:green
     c.setFillColor((selected ? color.withAlphaComponent(0.16):UIColor.black.withAlphaComponent(0.55)).cgColor);c.fill(rect)
     if selected{c.setStrokeColor(color.cgColor);c.setLineWidth(2);c.stroke(rect.insetBy(dx:1,dy:1));hits.append(PosterHit(id:f.id,rect:rect))}
     if let photo=photos[a.id]{let h=rect.height-4,w=min(100,h*photo.size.width/max(1,photo.size.height));photo.draw(in:CGRect(x:x+6,y:y+2,width:w,height:h))}
     text(a.name,CGRect(x:x+112,y:y+9,width:360,height:row/2),min(25,row*0.28),selected ? color:.white);let p=picks.values[f.id];let subtitle=selected ? ((locked ? "LOCK · ":"MY PICK · ")+(p?.method ?? "TO WIN")+(p?.round.map{" · R\($0)"} ?? "")):f.weightclass;text(subtitle,CGRect(x:x+112,y:y+row/2,width:360,height:row/2-3),min(17,row*0.19),selected ? color:.lightGray)
    };y+=row
   }}
   text("MY PICK = MY WINNER     LOCK = MY STRONGEST CALL",CGRect(x:48,y:1232,width:984,height:30),21,green);text("TAIL MY PICKS AT ONLYFIGHTS",CGRect(x:48,y:1273,width:984,height:35),28);text("Fan predictions · Not an official UFC poster · No wager placed",CGRect(x:48,y:1320,width:984,height:22),16,.lightGray,.regular)
  };return PosterArtifact(image:image,hits:hits)
 }
}
