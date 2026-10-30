"""Generate the dependency-free Xcode project; project.yml remains an XcodeGen alternative."""
from pathlib import Path
import hashlib, json
root=Path(__file__).resolve().parent
def ident(s):return hashlib.sha256(s.encode()).hexdigest()[:24].upper()
def quote(s):return json.dumps(str(s))
objects=[]
def obj(name,content):objects.append(f'{ident(name)} = {{ {content} }};');return ident(name)
sources=sorted((root/'OnlyFights').rglob('*.swift'))
resources=[root/'OnlyFights/poster-background.png']
refs=[];builds=[];assets=[]
for p in sources+resources:
 path=p.relative_to(root).as_posix();ref=obj('ref:'+path,f'isa = PBXFileReference; lastKnownFileType = {"sourcecode.swift" if p.suffix==".swift" else "image.png"}; path = {quote(path)}; sourceTree = "<group>";');refs.append(ref)
 build=obj('build:'+path,f'isa = PBXBuildFile; fileRef = {ref};');(builds if p.suffix=='.swift' else assets).append(build)
product=obj('product','isa = PBXFileReference; explicitFileType = wrapper.application; path = OnlyFights.app; sourceTree = BUILT_PRODUCTS_DIR;')
products=obj('products',f'isa = PBXGroup; children = ({product}); name = Products; sourceTree = "<group>";')
group=obj('group',f'isa = PBXGroup; children = ({",".join(refs+[products])}); sourceTree = "<group>";')
src=obj('sources',f'isa = PBXSourcesBuildPhase; buildActionMask = 2147483647; files = ({",".join(builds)}); runOnlyForDeploymentPostprocessing = 0;')
res=obj('resources',f'isa = PBXResourcesBuildPhase; buildActionMask = 2147483647; files = ({",".join(assets)}); runOnlyForDeploymentPostprocessing = 0;')
frameworks=obj('frameworks','isa = PBXFrameworksBuildPhase; buildActionMask = 2147483647; files = (); runOnlyForDeploymentPostprocessing = 0;')
base={'CLANG_ENABLE_MODULES':'YES','IPHONEOS_DEPLOYMENT_TARGET':'17.0','SDKROOT':'iphoneos','SWIFT_VERSION':'5.0'}
target={**base,'CODE_SIGN_STYLE':'Automatic','CODE_SIGN_ENTITLEMENTS':'OnlyFights/OnlyFights.entitlements','DEVELOPMENT_TEAM':'','GENERATE_INFOPLIST_FILE':'NO','INFOPLIST_FILE':'OnlyFights/Info.plist','PRODUCT_NAME':'$(TARGET_NAME)','PRODUCT_BUNDLE_IDENTIFIER':'com.onlyfights.app','TARGETED_DEVICE_FAMILY':'1','INSTAGRAM_APP_ID':'','SWIFT_EMIT_LOC_STRINGS':'YES'}
def settings(values):return ' '.join(quote(k)+' = '+quote(v)+';' for k,v in values.items())
def configs(prefix,values):
 rows=[]
 for name in ['Debug','Release']:
  v=dict(values);v['SWIFT_OPTIMIZATION_LEVEL']='-Onone' if name=='Debug' else '-O';v['DEBUG_INFORMATION_FORMAT']='dwarf' if name=='Debug' else 'dwarf-with-dsym';rows.append(obj(prefix+name,f'isa = XCBuildConfiguration; buildSettings = {{ {settings(v)} }}; name = {name};'))
 return obj(prefix+'configs',f'isa = XCConfigurationList; buildConfigurations = ({",".join(rows)}); defaultConfigurationIsVisible = 0; defaultConfigurationName = Release;')
pc=configs('project',base);tc=configs('target',target)
native=obj('target',f'isa = PBXNativeTarget; buildConfigurationList = {tc}; buildPhases = ({src},{frameworks},{res}); buildRules = (); dependencies = (); name = OnlyFights; productName = OnlyFights; productReference = {product}; productType = "com.apple.product-type.application";')
project=obj('project',f'isa = PBXProject; attributes = {{ LastUpgradeCheck = 2600; TargetAttributes = {{ {native} = {{ CreatedOnToolsVersion = 26.0; SystemCapabilities = {{ com.apple.SignInWithApple = {{ enabled = 1; }}; }}; }}; }}; }}; buildConfigurationList = {pc}; compatibilityVersion = "Xcode 14.0"; developmentRegion = en; hasScannedForEncodings = 0; knownRegions = (en,Base); mainGroup = {group}; productRefGroup = {products}; projectDirPath = ""; projectRoot = ""; targets = ({native});')
out=root/'OnlyFights.xcodeproj';out.mkdir(exist_ok=True)
(out/'project.pbxproj').write_text('// !$*UTF8*$!\n{ archiveVersion = 1; classes = {}; objectVersion = 56; objects = {\n'+'\n'.join(objects)+'\n}; rootObject = '+project+'; }\n')
print('Generated',out)
