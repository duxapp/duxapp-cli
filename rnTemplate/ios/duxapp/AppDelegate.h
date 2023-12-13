#import <RCTAppDelegate.h>
#import <Expo/Expo.h>
#import <UIKit/UIKit.h>

// {#duxapp-insert import}

// react-native-wechat-lib start
#import "WXApi.h"
// react-native-wechat-lib end

// react-native-dux-push start
#import <UserNotifications/UserNotifications.h>
// react-native-dux-push end

@interface AppDelegate : EXAppDelegateWrapper <
  // {#duxapp-insert appDelegate}
  // react-native-wechat-lib start
  WXApiDelegate
  // react-native-wechat-lib end
  // react-native-dux-push start
  ,UNUserNotificationCenterDelegate
  // react-native-dux-push end
>

@end
