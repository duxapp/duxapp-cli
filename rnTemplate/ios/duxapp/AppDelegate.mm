#import "AppDelegate.h"

#import <React/RCTBundleURLProvider.h>

#import <React/RCTLinkingManager.h>

// {#duxapp-insert import}

@implementation AppDelegate

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{

  // {#duxapp-insert appDelegate.didFinishLaunchingWithOptions}

  self.moduleName = @"duxapp";
  // You can add your custom initial props in the dictionary below.
  // They will be passed down to the ViewController used by React Native.
  self.initialProps = @{};

  return [super application:application didFinishLaunchingWithOptions:launchOptions];
}

- (NSURL *)sourceURLForBridge:(RCTBridge *)bridge
{
#if DEBUG
  return [[RCTBundleURLProvider sharedSettings] jsBundleURLForBundleRoot:@"index"];
#else
  {#duxapp appDelegate.sourceURLForBridge 'return [[NSBundle mainBundle] URLForResource:@"main" withExtension:@"jsbundle"];'}
#endif
}

/// This method controls whether the `concurrentRoot`feature of React18 is turned on or off.
///
/// @see: https://reactjs.org/blog/2022/03/29/react-v18.html
/// @note: This requires to be rendering on Fabric (i.e. on the New Architecture).
/// @return: `true` if the `concurrentRoot` feature is enabled. Otherwise, it returns `false`.
- (BOOL)concurrentRootEnabled
{
  return true;
}

// {#duxapp-insert appDelegate}
@end
