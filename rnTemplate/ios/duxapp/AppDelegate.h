#import <RCTAppDelegate.h>
#import <Expo/Expo.h>
#import <UIKit/UIKit.h>

// {#duxapp-insert import}

@protocol EmptyDelegate
@end

@interface AppDelegate : EXAppDelegateWrapper <
  EmptyDelegate
  // {#duxapp-insert appDelegate.protocol}
>
  // {#duxapp-insert appDelegate}
@end
