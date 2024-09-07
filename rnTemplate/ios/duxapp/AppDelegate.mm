#import "AppDelegate.h"

#import <React/RCTBundleURLProvider.h>

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
  return [self bundleURL];
}

- (NSURL *)bundleURL
{
#if DEBUG
  return [[RCTBundleURLProvider sharedSettings] jsBundleURLForBundleRoot:@"index"];
#else
  {#duxapp appDelegate.sourceURLForBridge 'return [[NSBundle mainBundle] URLForResource:@"main" withExtension:@"jsbundle"];'}
#endif
}

// {#duxapp-insert appDelegate}
@end
